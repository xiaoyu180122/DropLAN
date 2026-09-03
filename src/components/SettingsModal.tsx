import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Folder,
  FolderOpen,
  Clipboard,
  Bell,
  Volume2,
  VolumeX,
  Trash2,
  Check,
  HardDrive,
  Shield,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppConfig, SystemInfo } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  systemInfo: SystemInfo | null;
  onUpdateConfig: (newConfig: Partial<AppConfig>) => Promise<void>;
  onClearAllFiles?: () => Promise<void>;
  onOpenFolder: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  systemInfo,
  onUpdateConfig,
  onClearAllFiles,
  onOpenFolder,
}) => {
  const [isChangingDir, setIsChangingDir] = useState(false);
  const [customPathInput, setCustomPathInput] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const currentConfig: AppConfig = systemInfo?.config || {
    downloadsDir: systemInfo?.downloadsDir || '',
    autoClipboard: true,
    notifyOnReceive: true,
    soundEnabled: true,
  };

  const handleSelectFolder = async () => {
    if (window.electronAPI?.selectFolder) {
      try {
        const selected = await window.electronAPI.selectFolder();
        if (selected) {
          if (window.electronAPI.setDownloadsDir) {
            await window.electronAPI.setDownloadsDir(selected);
          }
          await onUpdateConfig({ downloadsDir: selected });
          toast.success('文件接收保存目录已更新', { description: selected });
        }
      } catch (err) {
        toast.error('选择目录失败');
      }
    } else {
      setCustomPathInput(systemInfo?.downloadsDir || '');
      setIsChangingDir(true);
    }
  };

  const handleSaveCustomPath = async () => {
    const trimmed = customPathInput.trim();
    if (!trimmed) return;
    try {
      if (window.electronAPI?.setDownloadsDir) {
        await window.electronAPI.setDownloadsDir(trimmed);
      }
      await onUpdateConfig({ downloadsDir: trimmed });
      setIsChangingDir(false);
      toast.success('保存路径已更新');
    } catch (err) {
      toast.error('保存路径失败');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="settings-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            key="settings-panel"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-lg rounded-2xl bg-zinc-950 border border-zinc-800 p-6 shadow-hud space-y-6 will-change-transform"
            onClick={(e) => e.stopPropagation()}
          >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <HardDrive className="w-4 h-4" />
              </div>
              <h2 className="text-base font-semibold text-white">系统首选项与设置</h2>
            </div>
            <button
              onClick={onClose}
              className="btn-press p-1.5 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* 1. Download Path Configuration */}
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Folder className="w-3.5 h-3.5 text-emerald-400" />
                  文件接收保存目录
                </span>
                <button
                  onClick={onOpenFolder}
                  className="btn-press text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>打开目录</span>
                </button>
              </div>

              {!isChangingDir ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-2 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-xs text-zinc-300 truncate">
                    {systemInfo?.downloadsDir || '默认 downloads 目录'}
                  </div>
                  <button
                    onClick={handleSelectFolder}
                    className="btn-press px-3 py-2 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-white shrink-0"
                  >
                    更改路径
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={customPathInput}
                    onChange={(e) => setCustomPathInput(e.target.value)}
                    placeholder="输入绝对路径，如 D:\Downloads"
                    className="w-full p-2 rounded-lg bg-zinc-950 border border-zinc-700 font-mono text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setIsChangingDir(false)}
                      className="px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleSaveCustomPath}
                      className="btn-press px-3 py-1 rounded bg-emerald-500 text-black font-semibold text-xs"
                    >
                      确认更改
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Auto Clipboard Sync */}
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between">
              <div className="space-y-0.5 pr-4">
                <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                  <Clipboard className="w-3.5 h-3.5 text-emerald-400" />
                  自动写入系统剪贴板
                </span>
                <p className="text-[11px] text-zinc-400">
                  手机端发送文字时，无需点击手动复制，自动直接写入电脑剪贴板
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={currentConfig.autoClipboard}
                onClick={() => onUpdateConfig({ autoClipboard: !currentConfig.autoClipboard })}
                className={`btn-press w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  currentConfig.autoClipboard ? 'bg-emerald-500' : 'bg-zinc-800'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    currentConfig.autoClipboard ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* 3. Notification */}
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between">
              <div className="space-y-0.5 pr-4">
                <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-sky-400" />
                  接收文件时系统通知
                </span>
                <p className="text-[11px] text-zinc-400">
                  当手机发来文件且软件在后台托盘时，弹出 Windows 提示气泡
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={currentConfig.notifyOnReceive}
                onClick={() => onUpdateConfig({ notifyOnReceive: !currentConfig.notifyOnReceive })}
                className={`btn-press w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  currentConfig.notifyOnReceive ? 'bg-emerald-500' : 'bg-zinc-800'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    currentConfig.notifyOnReceive ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* 4. Sound Feedback */}
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between">
              <div className="space-y-0.5 pr-4">
                <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                  {currentConfig.soundEnabled ? (
                    <Volume2 className="w-3.5 h-3.5 text-violet-400" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5 text-zinc-500" />
                  )}
                  传输完成提示音
                </span>
                <p className="text-[11px] text-zinc-400">在接收与发送完成时播放轻柔交互提示音</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={currentConfig.soundEnabled}
                onClick={() => onUpdateConfig({ soundEnabled: !currentConfig.soundEnabled })}
                className={`btn-press w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  currentConfig.soundEnabled ? 'bg-emerald-500' : 'bg-zinc-800'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    currentConfig.soundEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Danger Zone: Clear History */}
          {onClearAllFiles && (
            <div className="border-t border-zinc-800/80 pt-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-rose-400">清空所有传输记录与文件</p>
                <p className="text-[11px] text-zinc-500">将删除接收记录以及物理下载文件</p>
              </div>

              {!confirmClear ? (
                <button
                  onClick={() => setConfirmClear(true)}
                  className="btn-press px-3 py-1.5 rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs font-medium transition-colors"
                >
                  清空文件
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200"
                  >
                    取消
                  </button>
                  <button
                    onClick={async () => {
                      await onClearAllFiles();
                      setConfirmClear(false);
                      toast.success('已清空所有传输记录');
                    }}
                    className="btn-press px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs"
                  >
                    确定清空
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Desktop Complete Quit Option */}
          {window.electronAPI?.isElectron && (
            <div className="border-t border-zinc-800/80 pt-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-300">彻底退出 DropLAN</p>
                <p className="text-[11px] text-zinc-500">停止局域网传输服务并彻底释放所有内存与后台进程</p>
              </div>
              <button
                onClick={() => window.electronAPI?.exitApp?.()}
                className="btn-press px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-rose-500/50 hover:bg-rose-500/10 text-zinc-300 hover:text-rose-400 text-xs font-medium transition-colors"
              >
                退出软件
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
};
