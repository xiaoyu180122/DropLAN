import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Download,
  Copy,
  Check,
  FileText,
  Video,
  Music,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { FileInfo } from '../types';
import { formatBytes, formatTime, isImageFile, isVideoFile, isAudioFile, isTextFile } from '../utils/format';

interface MediaPreviewModalProps {
  file: FileInfo | null;
  onClose: () => void;
  onDownload?: (file: FileInfo) => void;
}

export const MediaPreviewModal: React.FC<MediaPreviewModalProps> = ({ file, onClose, onDownload }) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isLoadingText, setIsLoadingText] = useState(false);
  const [copied, setCopied] = useState(false);

  // Reset controls when file changes
  useEffect(() => {
    setScale(1);
    setRotation(0);
    setTextContent(null);

    if (file && isTextFile(file.originalName, file.mimetype)) {
      setIsLoadingText(true);
      fetch(`/api/file-content/${file.id}`)
        .then((res) => res.json())
        .then((data) => {
          setTextContent(data.text || '');
        })
        .catch(() => {
          setTextContent('无法加载文本内容');
        })
        .finally(() => {
          setIsLoadingText(false);
        });
    }
  }, [file]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!file) return null;

  const previewUrl = `/api/preview/${file.id}`;
  const downloadUrl = `/api/download/${file.id}`;
  const isImg = isImageFile(file.originalName, file.mimetype);
  const isVid = isVideoFile(file.originalName, file.mimetype);
  const isAud = isAudioFile(file.originalName, file.mimetype);
  const isTxt = isTextFile(file.originalName, file.mimetype);

  const handleCopyLink = () => {
    const directUrl = `${window.location.origin}${downloadUrl}`;
    navigator.clipboard.writeText(directUrl).then(() => {
      setCopied(true);
      toast.success('已复制下载直链');
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const handleCopyText = () => {
    if (textContent) {
      navigator.clipboard.writeText(textContent).then(() => {
        toast.success('文本内容已复制');
      });
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!isImg) return;
    e.preventDefault();
    if (e.deltaY < 0) {
      setScale((prev) => Math.min(prev + 0.15, 4));
    } else {
      setScale((prev) => Math.max(prev - 0.15, 0.4));
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col justify-between"
        onClick={onClose}
      >
        {/* Top Floating Control Bar */}
        <div
          className="w-full flex items-center justify-between p-4 px-6 bg-gradient-to-b from-black/80 to-transparent z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-300">
              {isImg && <ImageIcon className="w-5 h-5 text-emerald-400" />}
              {isVid && <Video className="w-5 h-5 text-sky-400" />}
              {isAud && <Music className="w-5 h-5 text-violet-400" />}
              {isTxt && <FileText className="w-5 h-5 text-amber-400" />}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white truncate max-w-xs md:max-w-lg font-mono">
                {file.originalName}
              </h2>
              <p className="text-xs text-zinc-400">
                {formatBytes(file.size)} · 来自 {file.senderName} · {formatTime(file.timestamp)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="btn-press p-2 rounded-xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-all text-xs flex items-center gap-1.5 px-3"
              title="复制直链"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">复制直链</span>
            </button>

            <button
              onClick={() => {
                if (onDownload) {
                  onDownload(file);
                } else {
                  window.location.href = downloadUrl;
                }
              }}
              className="btn-press p-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold transition-all text-xs flex items-center gap-1.5 px-3"
            >
              <Download className="w-3.5 h-3.5" />
              <span>下载</span>
            </button>

            <button
              onClick={onClose}
              className="btn-press p-2 rounded-xl bg-zinc-900/90 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              title="关闭 (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Center Content Viewer */}
        <div
          className="flex-1 flex items-center justify-center p-4 md:p-8 overflow-hidden relative"
          onClick={(e) => e.stopPropagation()}
          onWheel={handleWheel}
        >
          {isImg && (
            <div className="w-full h-full flex items-center justify-center select-none overflow-hidden">
              <motion.img
                src={previewUrl}
                alt={file.originalName}
                style={{
                  transform: `scale(${scale}) rotate(${rotation}deg)`,
                  transition: 'transform 0.12s ease-out',
                }}
                className="max-h-[82vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
                draggable={false}
              />
            </div>
          )}

          {isVid && (
            <div className="w-full max-w-4xl max-h-[80vh] flex items-center justify-center">
              <video
                src={previewUrl}
                controls
                autoPlay
                className="max-h-[75vh] w-full rounded-2xl border border-zinc-800 bg-black shadow-2xl"
              />
            </div>
          )}

          {isAud && (
            <div className="w-full max-w-md p-6 rounded-2xl border border-zinc-800 bg-zinc-900/90 shadow-hud text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-400 flex items-center justify-center mx-auto shadow-glow-violet animate-pulse">
                <Music className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white truncate">{file.originalName}</h3>
                <p className="text-xs text-zinc-400 mt-1">{formatBytes(file.size)}</p>
              </div>
              <audio src={previewUrl} controls autoPlay className="w-full mt-2" />
            </div>
          )}

          {isTxt && (
            <div className="w-full max-w-4xl max-h-[75vh] flex flex-col rounded-2xl border border-zinc-800 bg-zinc-950/90 shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
                <span className="text-xs font-mono text-zinc-400">纯文本 / 代码预览</span>
                <button
                  onClick={handleCopyText}
                  className="btn-press text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>复制代码</span>
                </button>
              </div>
              <div className="p-4 overflow-auto flex-1 font-mono text-xs text-zinc-300 leading-relaxed custom-scrollbar max-h-[65vh]">
                {isLoadingText ? (
                  <div className="flex items-center justify-center py-12 text-zinc-500 gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                    <span>加载文本中...</span>
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap break-all">{textContent}</pre>
                )}
              </div>
            </div>
          )}

          {!isImg && !isVid && !isAud && !isTxt && (
            <div className="p-8 rounded-2xl border border-zinc-800 bg-zinc-900/80 text-center space-y-4 max-w-sm">
              <div className="w-16 h-16 rounded-2xl bg-zinc-800/80 flex items-center justify-center text-zinc-400 mx-auto">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">{file.originalName}</h3>
                <p className="text-xs text-zinc-500 mt-1">此文件类型暂不支持在线直接渲染</p>
              </div>
              <button
                onClick={() => {
                  if (onDownload) onDownload(file);
                  else window.location.href = downloadUrl;
                }}
                className="btn-press w-full py-2.5 rounded-xl bg-emerald-500 text-black font-semibold text-xs flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>立即下载该文件</span>
              </button>
            </div>
          )}
        </div>

        {/* Bottom Toolbar for Images */}
        {isImg && (
          <div
            className="w-full flex items-center justify-center p-4 bg-gradient-to-t from-black/80 to-transparent z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 backdrop-blur-md shadow-lg">
              <button
                onClick={() => setScale((prev) => Math.max(prev - 0.25, 0.4))}
                className="btn-press p-1.5 rounded-full hover:bg-zinc-800 text-zinc-300 hover:text-white"
                title="缩小 (滚轮向后)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono text-zinc-400 px-2 select-none">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={() => setScale((prev) => Math.min(prev + 0.25, 4))}
                className="btn-press p-1.5 rounded-full hover:bg-zinc-800 text-zinc-300 hover:text-white"
                title="放大 (滚轮向前)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <div className="h-4 w-px bg-zinc-800 mx-1" />
              <button
                onClick={() => setRotation((prev) => (prev + 90) % 360)}
                className="btn-press p-1.5 rounded-full hover:bg-zinc-800 text-zinc-300 hover:text-white"
                title="顺时针旋转 90°"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setScale(1);
                  setRotation(0);
                }}
                className="btn-press p-1.5 rounded-full hover:bg-zinc-800 text-zinc-300 hover:text-white"
                title="重置缩放比例"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
