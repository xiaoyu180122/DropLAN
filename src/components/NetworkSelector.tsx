import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wifi, Network, ShieldAlert, Check, ChevronDown, RefreshCw } from 'lucide-react';
import { NetworkInterface } from '../types';

interface NetworkSelectorProps {
  interfaces: NetworkInterface[];
  activeIp: string;
  onSelectIp: (ip: string) => void;
  onRefresh?: () => void | Promise<any>;
}

export const NetworkSelector: React.FC<NetworkSelectorProps> = ({
  interfaces,
  activeIp,
  onSelectIp,
  onRefresh,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleRescan = async () => {
    if (isScanning) return;
    setIsScanning(true);
    try {
      if (onRefresh) {
        await Promise.all([
          onRefresh(),
          new Promise((resolve) => setTimeout(resolve, 650)),
        ]);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 650));
      }
    } catch (_) {
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeInterface = interfaces.find((item) => item.address === activeIp) || {
    name: '默认网卡',
    address: activeIp,
    type: 'wifi' as const,
    score: 10,
    isRecommended: true,
  };

  const getBadge = (type: string, isRecommended: boolean) => {
    if (type === 'wifi') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <Wifi className="w-2.5 h-2.5" />
          Wi-Fi (推荐)
        </span>
      );
    }
    if (type === 'ethernet') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-sky-500/15 text-sky-400 border border-sky-500/30">
          <Network className="w-2.5 h-2.5" />
          以太网
        </span>
      );
    }
    if (type === 'virtual') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <ShieldAlert className="w-2.5 h-2.5" />
          虚拟网卡/VPN
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
        局域网
      </span>
    );
  };

  return (
    <div className="relative inline-flex items-center gap-1.5 text-left" ref={dropdownRef}>
      {/* 1. IP Selection Trigger Pill */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="btn-press flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-300 hover:text-white transition-all shadow-sm"
        title="点击切换用于生成二维码的局域网 IP"
      >
        <span className="flex items-center gap-1.5">
          {activeInterface.type === 'wifi' ? (
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          ) : activeInterface.type === 'ethernet' ? (
            <Network className="w-3.5 h-3.5 text-sky-400" />
          ) : (
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          )}
          <span className="font-mono text-emerald-400 font-medium">{activeIp}</span>
        </span>
        <span className="text-[11px] text-zinc-500 max-w-[80px] truncate hidden sm:inline">
          ({activeInterface.name})
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* 2. Manual Rescan LAN IP Button */}
      <motion.button
        type="button"
        onClick={handleRescan}
        disabled={isScanning}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.94 }}
        transition={{ type: 'spring', stiffness: 450, damping: 28 }}
        className={`btn-press relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all shadow-sm ${
          isScanning
            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)] cursor-wait'
            : 'bg-zinc-900 border-zinc-800 hover:border-emerald-500/40 hover:bg-zinc-800/80 text-zinc-400 hover:text-emerald-400'
        }`}
        title="手动重新检索当前局域网 IP 与网络适配器"
      >
        <motion.div
          animate={isScanning ? { rotate: 360 } : { rotate: 0 }}
          transition={
            isScanning
              ? { repeat: Infinity, duration: 0.75, ease: 'linear' }
              : { duration: 0.2, ease: 'easeOut' }
          }
          className="flex items-center justify-center"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </motion.div>
        <span className="text-[11px] font-mono hidden xl:inline">
          {isScanning ? '检索中' : '检索IP'}
        </span>
        {isScanning && (
          <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute left-0 top-full mt-2 w-72 rounded-2xl bg-zinc-950/95 border border-zinc-800 p-2 shadow-hud backdrop-blur-xl z-50 space-y-1"
          >
            <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-zinc-800/80 mb-1">
              <span className="text-[11px] font-semibold text-zinc-400 font-mono">
                选择当前局域网 IP
              </span>
              <button
                onClick={handleRescan}
                disabled={isScanning}
                className="p-1 text-zinc-500 hover:text-emerald-400 rounded transition-colors"
                title="重新检索网卡"
              >
                <RefreshCw className={`w-3 h-3 ${isScanning ? 'animate-spin text-emerald-400' : ''}`} />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {interfaces.length === 0 ? (
                <div className="p-3 text-center text-xs text-zinc-500">未检测到可用 IPv4 网卡</div>
              ) : (
                interfaces.map((item) => {
                  const isSelected = item.address === activeIp;
                  return (
                    <button
                      key={`${item.name}-${item.address}`}
                      type="button"
                      onClick={() => {
                        onSelectIp(item.address);
                        setIsOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded-xl transition-all flex items-center justify-between group ${
                        isSelected
                          ? 'bg-emerald-500/10 border border-emerald-500/30 text-white'
                          : 'hover:bg-zinc-900 border border-transparent text-zinc-300'
                      }`}
                    >
                      <div className="space-y-0.5 min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-zinc-200">
                            {item.address}
                          </span>
                          {getBadge(item.type, item.isRecommended)}
                        </div>
                        <p className="text-[11px] text-zinc-500 truncate font-mono">{item.name}</p>
                      </div>

                      {isSelected ? (
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <span className="w-4 h-4 shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            <div className="px-2.5 py-1.5 border-t border-zinc-800/60 mt-1 text-[10px] text-zinc-500">
              💡 手机扫码必须与电脑选择的 IP 处于同一路由器或 Wi-Fi
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
