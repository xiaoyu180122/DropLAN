import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Wifi,
  Smartphone,
  FolderOpen,
  Copy,
  ExternalLink,
  Zap,
  ArrowRightLeft,
  Check,
  Radio,
  Settings,
  Archive,
} from 'lucide-react';
import { toast } from 'sonner';
import { SystemInfo, FileInfo, ClipboardItem, AppConfig } from '../../types';
import { DropZone } from '../DropZone';
import { TransferList } from '../TransferList';
import { ClipboardSync } from '../ClipboardSync';
import { NetworkSelector } from '../NetworkSelector';
import { MediaPreviewModal } from '../MediaPreviewModal';
import { SettingsModal } from '../SettingsModal';
import { TitleBar } from './TitleBar';

interface DesktopViewProps {
  systemInfo: SystemInfo | null;
  files: FileInfo[];
  clipboards: ClipboardItem[];
  onUploadSuccess: () => void;
  onDeleteFile: (id: string) => void;
  onBatchDeleteFiles?: (ids: string[]) => void;
  onSendClipboard: (text: string) => void;
  onOpenFolder: () => void;
  onSwitchToMobile: () => void;
  onSelectIp: (ip: string) => void;
  onUpdateConfig: (newConfig: Partial<AppConfig>) => Promise<void>;
  onClearAllFiles?: () => Promise<void>;
  onRefreshNetwork?: () => Promise<any>;
}

export const DesktopView: React.FC<DesktopViewProps> = ({
  systemInfo,
  files,
  clipboards,
  onUploadSuccess,
  onDeleteFile,
  onBatchDeleteFiles,
  onSendClipboard,
  onOpenFolder,
  onSwitchToMobile,
  onSelectIp,
  onUpdateConfig,
  onClearAllFiles,
  onRefreshNetwork,
}) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [previewingFile, setPreviewingFile] = useState<FileInfo | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const activeIp = systemInfo?.ip || '127.0.0.1';
  const port = systemInfo?.port || 5200;
  const localUrl = `http://${activeIp}:${port}`;
  const interfaces = systemInfo?.interfaces || [];
  // Filter for real remote mobile devices (exclude local machine loopback 127.0.0.1)
  const mobileDevices =
    systemInfo?.devices.filter(
      (d) =>
        d.deviceType === 'mobile' &&
        d.ip !== '127.0.0.1' &&
        d.ip !== '::1' &&
        d.ip !== 'localhost'
    ) || [];

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(localUrl).then(() => {
      setCopiedUrl(true);
      toast.success('已复制手机端访问地址', {
        description: localUrl,
      });
      setTimeout(() => setCopiedUrl(false), 1600);
    });
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Top Fixed Area: Frameless Integrated TitleBar & App Header */}
      <div className="sticky top-0 z-30 bg-[#09090b]">
        {/* 1. Custom Desktop TitleBar */}
        <TitleBar />

        {/* 2. Seamless App Navigation Bar */}
        <header className="border-b border-zinc-800/80 bg-[#09090b]/90 backdrop-blur-xl px-4 md:px-6 py-2.5 window-drag">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            {/* Logo */}
            <div className="flex items-center gap-3 window-no-drag">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-glow-emerald">
                <Zap className="w-5 h-5 fill-emerald-400/20" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base tracking-tight text-white font-mono">
                    DropLAN
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    GIGABIT LAN
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 hidden sm:block">
                  极速免登 · 跨端无损直传 · 原生桌面客户端
                </p>
              </div>
            </div>

            {/* Central Network Multi-IP Switcher */}
            <div className="hidden md:flex items-center gap-2 window-no-drag">
              <NetworkSelector
                interfaces={interfaces}
                activeIp={activeIp}
                onSelectIp={onSelectIp}
                onRefresh={onRefreshNetwork}
              />
            </div>

            {/* Right Utilities */}
            <div className="flex items-center gap-2 window-no-drag">
              <button
                onClick={onOpenFolder}
                className="btn-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-colors"
                title="打开接收文件下载目录"
              >
                <FolderOpen className="w-3.5 h-3.5 text-zinc-400" />
                <span className="hidden sm:inline">下载目录</span>
              </button>

              <button
                onClick={() => setIsSettingsOpen(true)}
                className="btn-press p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-colors"
                title="首选项与设置"
              >
                <Settings className="w-4 h-4" />
              </button>

              <button
                onClick={onSwitchToMobile}
                className="btn-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 transition-colors"
                title="预览手机端移动界面"
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">手机端视口</span>
              </button>
            </div>
          </div>
        </header>
      </div>

      {/* Main Grid Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (QR & Devices & Text Sync) */}
        <div className="lg:col-span-4 space-y-6">
          {/* QR Code Connection Card */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 flex flex-col items-center text-center space-y-4 shadow-hud">
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Wifi className="w-3 h-3" />
                  同一局域网免安装
                </span>
              </div>
              <h2 className="text-base font-semibold text-zinc-100">
                手机相机扫码直连
              </h2>
              <p className="text-xs text-zinc-400">
                用手机原生相机或微信扫一扫，即刻互发照片与文件
              </p>
            </div>

            {/* QR Code Container */}
            <div className="p-4 rounded-2xl bg-white shadow-xl border border-zinc-700/50 relative group">
              <QRCodeSVG
                value={localUrl}
                size={180}
                level="M"
                marginSize={0}
                bgColor="#ffffff"
                fgColor="#09090b"
              />
            </div>

            {/* Mobile Network Selector below QR on smaller screens */}
            <div className="w-full flex md:hidden justify-center">
              <NetworkSelector
                interfaces={interfaces}
                activeIp={activeIp}
                onSelectIp={onSelectIp}
                onRefresh={onRefreshNetwork}
              />
            </div>

            {/* Quick URL Action */}
            <div className="w-full space-y-2">
              <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-300">
                <span className="truncate max-w-[200px]">{localUrl}</span>
                <button
                  onClick={handleCopyUrl}
                  className="btn-press p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 transition-colors"
                  title="复制手机端访问地址"
                >
                  {copiedUrl ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              <a
                href={localUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-press w-full py-2 rounded-xl text-xs font-medium bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>在新标签页中打开手机端</span>
              </a>
            </div>
          </div>

          {/* Connected Devices Card */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider font-mono flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
                <span>在线接入设备</span>
              </h3>
              <span className="text-[11px] font-mono text-zinc-500">
                {mobileDevices.length} 台在线
              </span>
            </div>

            <div className="space-y-2">
              {mobileDevices.length === 0 ? (
                <div className="p-4 rounded-xl border border-zinc-800/60 bg-zinc-950/40 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-800/50 flex items-center justify-center text-zinc-500">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-400 font-medium">
                      等待手机扫码接入
                    </p>
                    <p className="text-[11px] text-zinc-600">
                      手机打开网页后此处将实时点亮
                    </p>
                  </div>
                </div>
              ) : (
                mobileDevices.map((device) => (
                  <div
                    key={device.id}
                    className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-zinc-200">
                          {device.deviceName}
                        </p>
                        <p className="text-[10px] font-mono text-emerald-400">
                          {device.ip} · 在线活跃
                        </p>
                      </div>
                    </div>

                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Clipboard Sync Card */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-400" />
                <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider font-mono">
                  隔空剪贴板 · 文字快传
                </h3>
              </div>
              {systemInfo?.config?.autoClipboard && (
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  自动写入系统
                </span>
              )}
            </div>
            <ClipboardSync
              onSendText={onSendClipboard}
              recentClipboards={clipboards}
              compact={true}
            />
          </div>
        </div>

        {/* Right Area (Dropzone & Transfer Queue) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Tactile Dropzone */}
          <DropZone
            onUploadSuccess={onUploadSuccess}
            sender="desktop"
            senderName={systemInfo?.hostname || 'Desktop PC'}
          />

          {/* Live Transfer History List */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 md:p-6">
            <TransferList
              files={files}
              onDeleteFile={onDeleteFile}
              onBatchDeleteFiles={onBatchDeleteFiles}
              onOpenFolder={onOpenFolder}
              onPreviewFile={(file) => setPreviewingFile(file)}
              isDesktop={true}
            />
          </div>
        </div>
      </main>

      {/* Media Lightbox Preview Modal */}
      <MediaPreviewModal
        file={previewingFile}
        files={files}
        onSelectFile={(file) => setPreviewingFile(file)}
        onClose={() => setPreviewingFile(null)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        systemInfo={systemInfo}
        onUpdateConfig={onUpdateConfig}
        onClearAllFiles={onClearAllFiles}
        onOpenFolder={onOpenFolder}
      />
    </div>
  );
};
