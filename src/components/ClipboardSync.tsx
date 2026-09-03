import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clipboard, Send, Check, Copy, MessageSquareShare } from 'lucide-react';
import { toast } from 'sonner';
import { ClipboardItem } from '../types';
import { formatTime } from '../utils/format';

interface ClipboardSyncProps {
  onSendText: (text: string) => void;
  recentClipboards: ClipboardItem[];
  compact?: boolean;
}

export const ClipboardSync: React.FC<ClipboardSyncProps> = ({
  onSendText,
  recentClipboards,
  compact = false,
}) => {
  const [inputText, setInputText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    onSendText(trimmed);
    setInputText('');
    toast.success('已跨端同步剪贴板', {
      description: '另一端已实时收到该文本',
    });
  };

  const handleCopy = (item: ClipboardItem) => {
    navigator.clipboard.writeText(item.text).then(() => {
      setCopiedId(item.id);
      toast.success('已复制到剪贴板');
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  return (
    <div className={`flex flex-col ${compact ? 'space-y-3' : 'space-y-4'}`}>
      {/* Input Area */}
      <div className="relative">
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="输入文字、链接或备忘，实时同步到对方设备..."
          rows={compact ? 2 : 3}
          className="w-full rounded-xl bg-zinc-900/80 border border-zinc-800 p-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all resize-none"
        />

        <div className="flex items-center justify-between mt-2">
          <span className="text-[11px] text-zinc-500 font-mono">
            快捷键: <kbd className="px-1 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400">Ctrl+Enter</kbd> 发送
          </span>

          <button
            onClick={handleSend}
            disabled={!inputText.trim()}
            className="btn-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500 text-black hover:bg-emerald-400 disabled:opacity-40 disabled:pointer-events-none transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>发送到手机</span>
          </button>
        </div>
      </div>

      {/* Recent Clipboard Items */}
      {recentClipboards.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
            <Clipboard className="w-3.5 h-3.5 text-emerald-400" />
            <span>最新剪贴板消息</span>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {recentClipboards.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.16 }}
                  className="group relative flex items-start justify-between gap-2 p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-200 break-all select-all font-mono leading-relaxed">
                      {item.text}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-500">
                      <span>来自: {item.senderName}</span>
                      <span>·</span>
                      <span>{formatTime(item.timestamp)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleCopy(item)}
                    title="复制"
                    className="btn-press p-1.5 rounded-md bg-zinc-800/60 hover:bg-zinc-700 text-zinc-400 hover:text-emerald-400 transition-colors shrink-0"
                  >
                    {copiedId === item.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
};
