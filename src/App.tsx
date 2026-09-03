import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Toaster, toast } from 'sonner';
import { SystemInfo, FileInfo, ClipboardItem, AppConfig } from './types';
import { DesktopView } from './components/desktop/DesktopView';
import { MobileView } from './components/mobile/MobileView';

// Lightweight web audio chime without external file dependencies
function playChime(type: 'receive' | 'send' = 'receive') {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'receive') {
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
    } else {
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.12); // E5
    }

    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.24);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch (e) {
    // Ignore audio autoplay policies if blocked
  }
}

function getOrCreateDeviceId() {
  try {
    let id = localStorage.getItem('droplan_device_id');
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('droplan_device_id', id);
    }
    return id;
  } catch (_) {
    return 'dev_' + Math.random().toString(36).substring(2, 10);
  }
}

export const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>(() => {
    // If inside Electron, always treat as desktop workbench
    if (typeof window !== 'undefined' && window.electronAPI?.isElectron) {
      return 'desktop';
    }
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'mobile' || window.location.pathname.startsWith('/m')) {
      return 'mobile';
    }
    return window.innerWidth > 0 && window.innerWidth < 768 ? 'mobile' : 'desktop';
  });

  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [clipboards, setClipboards] = useState<ClipboardItem[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const configRef = useRef<AppConfig | undefined>(undefined);
  const viewModeRef = useRef(viewMode);
  const processedClipboardIdsRef = useRef<Set<string>>(new Set());

  // Synchronize viewMode ref
  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  // Keep configRef synchronized for WebSocket callback access
  useEffect(() => {
    configRef.current = systemInfo?.config;
  }, [systemInfo?.config]);

  // Fetch initial system info and file registry
  const fetchInfo = useCallback(async () => {
    try {
      const res = await fetch('/api/info');
      if (res.ok) {
        const data = await res.json();
        setSystemInfo(data);
      }
    } catch (e) {
      console.warn('Failed to fetch system info:', e);
    }
  }, []);

  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch('/api/files');
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
      }
    } catch (e) {
      console.warn('Failed to fetch files:', e);
    }
  }, []);

  // WebSocket Connection Management (Single instance, cleanup-safe)
  useEffect(() => {
    fetchInfo();
    fetchFiles();

    let isDestroyed = false;

    function connectWS() {
      if (isDestroyed) return;

      // Prevent opening duplicate sockets if one is already active or connecting
      if (
        wsRef.current &&
        (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)
      ) {
        return;
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (isDestroyed) {
          ws.close();
          return;
        }

        const isDesktopApp = typeof window !== 'undefined' && !!window.electronAPI?.isElectron;
        const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isMobileDevice = !isDesktopApp && (isMobileUA || viewModeRef.current === 'mobile');

        ws.send(
          JSON.stringify({
            type: 'IDENTIFY',
            deviceId: getOrCreateDeviceId(),
            deviceType: isMobileDevice ? 'mobile' : 'desktop',
            deviceName: isMobileDevice ? (isMobileUA ? '智能手机终端' : '电脑网页预览') : '电脑工作台',
          })
        );
      };

      ws.onmessage = (event) => {
        if (isDestroyed) return;
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'DEVICES_UPDATED') {
            setSystemInfo((prev) => (prev ? { ...prev, devices: data.devices } : prev));
          } else if (data.type === 'CONFIG_UPDATED') {
            setSystemInfo((prev) => (prev ? { ...prev, config: data.config, downloadsDir: data.config.downloadsDir || prev.downloadsDir } : prev));
          } else if (data.type === 'NETWORK_UPDATED') {
            setSystemInfo((prev) => (prev ? { ...prev, ip: data.ip, interfaces: data.interfaces, url: data.url } : prev));
          } else if (data.type === 'FILES_ADDED') {
            setFiles((prev) => {
              const existingIds = new Set(prev.map((f) => f.id));
              const newFiles = data.files.filter((f: FileInfo) => !existingIds.has(f.id));
              return [...newFiles, ...prev];
            });

            if (configRef.current?.soundEnabled) {
              playChime('receive');
            }

            const first = data.files[0];
            if (first) {
              toast.info(`收到新文件: ${first.originalName}`, {
                description: `来自 ${first.senderName} · 大小 ${Math.round(first.size / 1024)} KB`,
              });

              // Trigger Windows native notification if in Electron
              if (window.electronAPI?.sendNotification && configRef.current?.notifyOnReceive) {
                window.electronAPI.sendNotification({
                  title: `DropLAN 收到新文件`,
                  body: `${first.originalName} (${Math.round(first.size / 1024)} KB) - 来自 ${first.senderName}`,
                });
              }
            }
          } else if (data.type === 'FILE_DELETED') {
            setFiles((prev) => prev.filter((f) => f.id !== data.id));
          } else if (data.type === 'FILES_BATCH_DELETED') {
            const delSet = new Set(data.ids);
            setFiles((prev) => prev.filter((f) => !delSet.has(f.id)));
          } else if (data.type === 'CLIPBOARD_RECEIVED') {
            const clipKey = data.id || `${data.text}_${Math.floor((data.timestamp || Date.now()) / 2500)}`;
            if (processedClipboardIdsRef.current.has(clipKey)) {
              return;
            }
            processedClipboardIdsRef.current.add(clipKey);
            if (processedClipboardIdsRef.current.size > 80) {
              const oldest = Array.from(processedClipboardIdsRef.current)[0];
              processedClipboardIdsRef.current.delete(oldest);
            }

            const newItem: ClipboardItem = {
              id: data.id || Math.random().toString(36).substring(2, 9),
              text: data.text,
              senderName: data.senderName,
              timestamp: data.timestamp || Date.now(),
            };

            setClipboards((prev) => {
              const isDuplicate = prev.some(
                (item) => (data.id && item.id === data.id) || (item.text === data.text && Math.abs(item.timestamp - newItem.timestamp) < 2500)
              );
              if (isDuplicate) return prev;
              return [newItem, ...prev];
            });

            // Auto-write to clipboard if enabled
            const shouldAutoCopy = configRef.current?.autoClipboard ?? true;
            if (shouldAutoCopy) {
              if (window.electronAPI?.copyToClipboard) {
                window.electronAPI.copyToClipboard(data.text);
              } else {
                navigator.clipboard?.writeText?.(data.text).catch(() => {});
              }
              toast.success('已自动写入电脑系统剪贴板', {
                description: data.text.length > 50 ? `${data.text.slice(0, 50)}...` : data.text,
              });
            } else {
              toast.info(`收到跨端剪贴板内容`, {
                description: data.text.length > 50 ? `${data.text.slice(0, 50)}...` : data.text,
                action: {
                  label: '复制',
                  onClick: () => {
                    navigator.clipboard.writeText(data.text);
                    toast.success('已复制到系统剪贴板');
                  },
                },
              });
            }

            if (configRef.current?.soundEnabled) {
              playChime('receive');
            }
          }
        } catch (e) {
          console.error('Error parsing WS message:', e);
        }
      };

      ws.onclose = () => {
        if (isDestroyed) return;
        reconnectTimeoutRef.current = window.setTimeout(connectWS, 3000);
      };

      ws.onerror = () => {
        if (!isDestroyed && ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      };
    }

    connectWS();

    return () => {
      isDestroyed = true;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        try {
          wsRef.current.close();
        } catch (_) {}
        wsRef.current = null;
      }
    };
  }, [fetchInfo, fetchFiles]);

  const handleDeleteFile = async (id: string) => {
    try {
      const res = await fetch(`/api/files/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setFiles((prev) => prev.filter((f) => f.id !== id));
        toast.success('文件记录已删除');
      }
    } catch (e) {
      toast.error('删除失败');
    }
  };

  const handleBatchDeleteFiles = async (ids: string[]) => {
    try {
      const res = await fetch('/api/files/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) {
        const delSet = new Set(ids);
        setFiles((prev) => prev.filter((f) => !delSet.has(f.id)));
      }
    } catch (e) {
      toast.error('批量删除失败');
    }
  };

  const handleClearAllFiles = async () => {
    if (files.length === 0) return;
    const allIds = files.map((f) => f.id);
    await handleBatchDeleteFiles(allIds);
  };

  const handleOpenFolder = async () => {
    try {
      if (window.electronAPI?.openDownloadsFolder) {
        await window.electronAPI.openDownloadsFolder();
        toast.success('已在文件管理器中打开');
        return;
      }
      const res = await fetch('/api/open-folder', { method: 'POST' });
      if (res.ok) {
        toast.success('已在文件管理器中打开');
      }
    } catch (e) {
      toast.error('无法打开目录');
    }
  };

  const handleSendClipboard = async (text: string) => {
    try {
      const clipId = Math.random().toString(36).substring(2, 10);
      processedClipboardIdsRef.current.add(clipId);
      const res = await fetch('/api/clipboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: clipId,
          text,
          senderName: viewMode === 'desktop' ? '电脑端' : '手机端',
        }),
      });
      if (res.ok) {
        const newItem: ClipboardItem = {
          id: clipId,
          text,
          senderName: '本机',
          timestamp: Date.now(),
        };
        setClipboards((prev) => {
          if (prev.some((item) => item.id === clipId || (item.text === text && Math.abs(item.timestamp - newItem.timestamp) < 2500))) {
            return prev;
          }
          return [newItem, ...prev];
        });
        if (configRef.current?.soundEnabled) {
          playChime('send');
        }
      }
    } catch (e) {
      toast.error('发送文字失败');
    }
  };

  const handleSelectIp = async (ip: string) => {
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedIp: ip }),
      });
      if (res.ok) {
        setSystemInfo((prev) =>
          prev
            ? {
                ...prev,
                ip,
                url: `http://${ip}:${prev.port}`,
              }
            : prev
        );
        toast.success(`局域网访问 IP 已切换为: ${ip}`);
      }
    } catch (e) {
      toast.error('切换 IP 失败');
    }
  };

  const handleUpdateConfig = async (newConfig: Partial<AppConfig>) => {
    try {
      if (newConfig.downloadsDir && window.electronAPI?.setDownloadsDir) {
        await window.electronAPI.setDownloadsDir(newConfig.downloadsDir);
      }
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
      if (res.ok) {
        const data = await res.json();
        setSystemInfo((prev) =>
          prev
            ? {
                ...prev,
                config: data.config,
                downloadsDir: data.downloadsDir || prev.downloadsDir,
              }
            : prev
        );
      }
    } catch (e) {
      toast.error('更新配置失败');
    }
  };

  const handleRefreshNetwork = async () => {
    try {
      const res = await fetch('/api/network/rescan', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setSystemInfo((prev) =>
          prev
            ? {
                ...prev,
                ip: data.ip,
                interfaces: data.interfaces,
                url: data.url,
              }
            : prev
        );
        toast.success('局域网 IP 检索完成', {
          description: `当前优选网卡 IP: ${data.ip}`,
        });
        return data;
      }
    } catch (e) {
      await fetchInfo();
    }
    return null;
  };

  return (
    <>
      <Toaster
        position={viewMode === 'mobile' ? 'bottom-center' : 'top-right'}
        offset={viewMode === 'mobile' ? '20px' : '54px'}
        theme="dark"
        richColors
        closeButton
        toastOptions={{
          className: 'window-no-drag',
          style: { WebkitAppRegion: 'no-drag' } as any,
        }}
      />

      {viewMode === 'desktop' ? (
        <DesktopView
          systemInfo={systemInfo}
          files={files}
          clipboards={clipboards}
          onUploadSuccess={fetchFiles}
          onDeleteFile={handleDeleteFile}
          onBatchDeleteFiles={handleBatchDeleteFiles}
          onSendClipboard={handleSendClipboard}
          onOpenFolder={handleOpenFolder}
          onSwitchToMobile={() => setViewMode('mobile')}
          onSelectIp={handleSelectIp}
          onUpdateConfig={handleUpdateConfig}
          onClearAllFiles={handleClearAllFiles}
          onRefreshNetwork={handleRefreshNetwork}
        />
      ) : (
        <MobileView
          systemInfo={systemInfo}
          files={files}
          clipboards={clipboards}
          onUploadSuccess={fetchFiles}
          onSendClipboard={handleSendClipboard}
          onSwitchToDesktop={() => setViewMode('desktop')}
        />
      )}
    </>
  );
};

export default App;
