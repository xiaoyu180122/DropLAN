import React, { useState, useEffect } from 'react';
import { Zap, Minus, Square, Copy, X } from 'lucide-react';

export const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const isElectron = !!window.electronAPI?.isElectron;

  useEffect(() => {
    if (!isElectron) return;

    // Check initial maximized state
    window.electronAPI?.isMaximized?.().then((max) => {
      setIsMaximized(max);
    });

    const handleResize = () => {
      window.electronAPI?.isMaximized?.().then((max) => {
        setIsMaximized(max);
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isElectron]);

  const handleMinimize = () => {
    window.electronAPI?.minimizeWindow?.();
  };

  const handleMaximize = () => {
    window.electronAPI?.maximizeWindow?.();
    setIsMaximized(!isMaximized);
  };

  const handleClose = () => {
    window.electronAPI?.closeWindow?.();
  };

  const handleDoubleClick = () => {
    if (isElectron) {
      handleMaximize();
    }
  };

  return (
    <header
      className="h-10 w-full bg-zinc-950 border-b border-zinc-800/80 flex items-center justify-between px-3 select-none window-drag z-50 sticky top-0"
      onDoubleClick={handleDoubleClick}
    >
      {/* Left: Brand & Badge */}
      <div className="flex items-center gap-2.5">
        <div className="w-5 h-5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-glow-emerald">
          <Zap className="w-3 h-3 fill-emerald-400/20" />
        </div>
        <span className="font-semibold text-xs text-zinc-200 tracking-tight font-mono">
          DropLAN
        </span>
        <span className="text-zinc-600 text-xs">·</span>
        <span className="text-[11px] text-zinc-400 font-medium">
          局域网极速跨端快传
        </span>
        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400/90 border border-emerald-500/20">
          Desktop v1.0.0
        </span>
      </div>

      {/* Center Drag Zone */}
      <div className="flex-1 h-full mx-4" />

      {/* Right: Window Controls (Only visible in Electron) */}
      {isElectron ? (
        <div className="flex items-center gap-1 window-no-drag">
          <button
            onClick={handleMinimize}
            className="w-8 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/70 transition-colors btn-press"
            title="最小化到任务栏"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleMaximize}
            className="w-8 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/70 transition-colors btn-press"
            title={isMaximized ? '还原窗口' : '最大化窗口'}
          >
            {isMaximized ? (
              <Copy className="w-3 h-3 rotate-180" />
            ) : (
              <Square className="w-3 h-3" />
            )}
          </button>

          <button
            onClick={handleClose}
            className="w-8 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-rose-600 transition-colors btn-press"
            title="关闭 (收起至托盘后台运行)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : null}
    </header>
  );
};
