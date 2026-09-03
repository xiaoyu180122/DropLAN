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
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Play,
  Gauge,
} from 'lucide-react';
import { toast } from 'sonner';
import { FileInfo } from '../types';
import {
  formatBytes,
  formatTime,
  isImageFile,
  isVideoFile,
  isAudioFile,
  isTextFile,
  isNonNativeVideo,
  getFileExt,
} from '../utils/format';

interface MediaPreviewModalProps {
  file: FileInfo | null;
  files?: FileInfo[];
  onSelectFile?: (file: FileInfo) => void;
  onClose: () => void;
  onDownload?: (file: FileInfo) => void;
}

export const MediaPreviewModal: React.FC<MediaPreviewModalProps> = ({
  file,
  files,
  onSelectFile,
  onClose,
  onDownload,
}) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isLoadingText, setIsLoadingText] = useState(false);
  const [copied, setCopied] = useState(false);

  // Image states
  const [imgLoading, setImgLoading] = useState(true);
  const [imgError, setImgError] = useState(false);

  // Video states
  const [useTranscode, setUseTranscode] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Reset states when file changes
  useEffect(() => {
    setScale(1);
    setRotation(0);
    setTextContent(null);
    setImgLoading(true);
    setImgError(false);

    if (file) {
      setUseTranscode(isNonNativeVideo(file.originalName));
      setPlaybackRate(1);

      if (isTextFile(file.originalName, file.mimetype)) {
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
    }
  }, [file]);

  // Handle keyboard events (Escape, ArrowLeft, ArrowRight)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  if (!file) return null;

  const previewUrl = `/api/preview/${file.id}`;
  const streamUrl = `/api/stream/${file.id}`;
  const downloadUrl = `/api/download/${file.id}`;
  const isImg = isImageFile(file.originalName, file.mimetype);
  const isVid = isVideoFile(file.originalName, file.mimetype);
  const isAud = isAudioFile(file.originalName, file.mimetype);
  const isTxt = isTextFile(file.originalName, file.mimetype);
  const fileExt = getFileExt(file.originalName).toUpperCase();

  // Navigation handlers
  const currentIndex = files ? files.findIndex((f) => f.id === file.id) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex !== -1 && currentIndex < (files ? files.length - 1 : 0);

  const handlePrev = () => {
    if (hasPrev && files && onSelectFile) {
      onSelectFile(files[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (hasNext && files && onSelectFile) {
      onSelectFile(files[currentIndex + 1]);
    }
  };

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

  const handleOpenInSystem = async () => {
    if (window.electronAPI?.openFile && file.path) {
      const ok = await window.electronAPI.openFile(file.path);
      if (ok) {
        toast.success('已调用系统程序打开');
        return;
      }
    }
    // Web fallback: call server endpoint
    try {
      const res = await fetch(`/api/open-file/${file.id}`, { method: 'POST' });
      if (res.ok) {
        toast.success('已调用系统程序打开');
      } else {
        toast.error('无法调用系统程序，建议直接下载');
      }
    } catch {
      toast.error('无法调用系统程序，建议直接下载');
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!isImg || imgError) return;
    e.preventDefault();
    if (e.deltaY < 0) {
      setScale((prev) => Math.min(prev + 0.15, 4));
    } else {
      setScale((prev) => Math.max(prev - 0.15, 0.4));
    }
  };

  const changePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between"
        onClick={onClose}
      >
        {/* Top Control Bar */}
        <div
          className="w-full flex items-center justify-between p-4 px-6 bg-gradient-to-b from-black/90 to-transparent z-20"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-300">
              {isImg && <ImageIcon className="w-5 h-5 text-emerald-400" />}
              {isVid && <Video className="w-5 h-5 text-sky-400" />}
              {isAud && <Music className="w-5 h-5 text-violet-400" />}
              {isTxt && <FileText className="w-5 h-5 text-amber-400" />}
              {!isImg && !isVid && !isAud && !isTxt && (
                <span className="text-[10px] font-mono font-bold text-zinc-400">{fileExt}</span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-white truncate max-w-xs md:max-w-lg font-mono">
                  {file.originalName}
                </h2>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/50 shrink-0">
                  {fileExt}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                {formatBytes(file.size)} · 来自 {file.senderName} · {formatTime(file.timestamp)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Open in System Default App */}
            <button
              onClick={handleOpenInSystem}
              className="btn-press p-2 rounded-xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-all text-xs flex items-center gap-1.5 px-3"
              title="用系统默认软件打开 (如照片、PotPlayer等)"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden md:inline">系统程序打开</span>
            </button>

            {/* Copy Link */}
            <button
              onClick={handleCopyLink}
              className="btn-press p-2 rounded-xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-all text-xs flex items-center gap-1.5 px-3"
              title="复制直链"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">复制直链</span>
            </button>

            {/* Download */}
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

            {/* Close */}
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
          {/* Previous File Button */}
          {hasPrev && (
            <button
              onClick={handlePrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/50 shadow-2xl backdrop-blur-md transition-all hidden md:flex items-center justify-center"
              title="上一项 (左方向键)"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Next File Button */}
          {hasNext && (
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/50 shadow-2xl backdrop-blur-md transition-all hidden md:flex items-center justify-center"
              title="下一项 (右方向键)"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Image Preview */}
          {isImg && (
            <div className="w-full h-full flex items-center justify-center select-none overflow-hidden relative">
              {imgLoading && !imgError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 gap-3 z-10">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
                  <span className="text-xs font-mono text-zinc-400">正在载入高质量图像...</span>
                </div>
              )}

              {!imgError ? (
                <motion.img
                  key={`${file.id}-${file.timestamp}`}
                  src={previewUrl}
                  alt={file.originalName}
                  onLoad={() => setImgLoading(false)}
                  onError={() => {
                    setImgLoading(false);
                    setImgError(true);
                  }}
                  style={{
                    transform: `scale(${scale}) rotate(${rotation}deg)`,
                    transition: 'transform 0.12s ease-out',
                    opacity: imgLoading ? 0 : 1,
                  }}
                  className="max-h-[82vh] max-w-[90vw] object-contain rounded-lg shadow-2xl transition-opacity duration-200"
                  draggable={false}
                />
              ) : (
                /* Fallback if browser cannot decode image */
                <div className="p-8 rounded-2xl border border-zinc-800 bg-zinc-900/90 text-center space-y-4 max-w-md shadow-2xl">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
                    <AlertCircle className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{file.originalName}</h3>
                    <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                      该图片格式（{fileExt}）受浏览器解码支持限制，无法直接在网页中解析。请点击下方直接用系统看图软件打开。
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                      onClick={handleOpenInSystem}
                      className="btn-press px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>用系统看图软件打开</span>
                    </button>
                    <button
                      onClick={() => {
                        if (onDownload) onDownload(file);
                        else window.location.href = downloadUrl;
                      }}
                      className="btn-press px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>下载原图</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Video Preview */}
          {isVid && (
            <div className="w-full max-w-4xl max-h-[80vh] flex flex-col items-center justify-center space-y-3">
              <video
                key={`${file.id}-${useTranscode ? 'stream' : 'native'}`}
                ref={videoRef}
                src={useTranscode ? streamUrl : previewUrl}
                controls
                autoPlay
                poster={`/api/thumbnail/${file.id}`}
                onError={() => {
                  if (!useTranscode) {
                    toast.info('检测到特殊视频封装，正在切换流式转码播放...');
                    setUseTranscode(true);
                  }
                }}
                className="max-h-[72vh] w-full rounded-2xl border border-zinc-800 bg-black shadow-2xl"
              />

              {/* Video Quick Controls */}
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800/80 backdrop-blur-md text-xs">
                <span className="text-zinc-400 font-mono text-[11px] flex items-center gap-1 mr-1">
                  <Gauge className="w-3.5 h-3.5 text-sky-400" />
                  倍速:
                </span>
                {[0.5, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => changePlaybackRate(rate)}
                    className={`px-2 py-0.5 rounded-md font-mono text-[11px] transition-colors ${
                      playbackRate === rate
                        ? 'bg-sky-500/20 text-sky-400 font-semibold border border-sky-500/30'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}

                <div className="h-3 w-px bg-zinc-800 mx-1.5" />

                <button
                  onClick={handleOpenInSystem}
                  className="btn-press text-zinc-300 hover:text-sky-400 flex items-center gap-1 text-[11px]"
                  title="使用系统中已安装的 PotPlayer、VLC 或自带播放器打开"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>系统播放器打开</span>
                </button>
              </div>
            </div>
          )}

          {/* Audio Preview */}
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

          {/* Text/Code Preview */}
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

          {/* Other Non-Previewable File Types */}
          {!isImg && !isVid && !isAud && !isTxt && (
            <div className="p-8 rounded-2xl border border-zinc-800 bg-zinc-900/80 text-center space-y-4 max-w-sm">
              <div className="w-16 h-16 rounded-2xl bg-zinc-800/80 flex items-center justify-center text-zinc-400 mx-auto">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">{file.originalName}</h3>
                <p className="text-xs text-zinc-500 mt-1">此文件类型暂不支持在浏览器内直接渲染</p>
              </div>
              <div className="flex flex-col gap-2 w-full">
                <button
                  onClick={handleOpenInSystem}
                  className="btn-press w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs flex items-center justify-center gap-2 border border-zinc-700"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>在系统关联软件中打开</span>
                </button>
                <button
                  onClick={() => {
                    if (onDownload) onDownload(file);
                    else window.location.href = downloadUrl;
                  }}
                  className="btn-press w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>下载文件到本地</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Toolbar for Images */}
        {isImg && !imgError && (
          <div
            className="w-full flex items-center justify-center p-4 bg-gradient-to-t from-black/90 to-transparent z-20"
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
