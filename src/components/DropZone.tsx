import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UploadCloud, FileUp, Sparkles, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { formatBytes } from '../utils/format';

interface DropZoneProps {
  onUploadSuccess?: () => void;
  sender?: 'desktop' | 'mobile';
  senderName?: string;
}

export const DropZone: React.FC<DropZoneProps> = ({
  onUploadSuccess,
  sender = 'desktop',
  senderName = 'Desktop PC',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFileName, setCurrentFileName] = useState('');
  const [transferSpeed, setTransferSpeed] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Global paste handler (support Ctrl+V for images / files)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file') {
          const file = items[i].getAsFile();
          if (file) files.push(file);
        }
      }

      if (files.length > 0) {
        uploadFiles(files);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(Array.from(e.target.files));
    }
  };

  const uploadFiles = (files: File[]) => {
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);
    setCurrentFileName(files.length === 1 ? files[0].name : `${files.length} 个文件`);

    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }
    formData.append('sender', sender);
    formData.append('senderName', senderName);

    const xhr = new XMLHttpRequest();
    let startTime = Date.now();
    let lastLoaded = 0;

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percent);

        // Calculate real-time LAN speed
        const now = Date.now();
        const timeDiff = (now - startTime) / 1000;
        if (timeDiff > 0.3) {
          const bytesDiff = event.loaded - lastLoaded;
          const speed = bytesDiff / timeDiff;
          setTransferSpeed(`${formatBytes(speed)}/s`);
          startTime = now;
          lastLoaded = event.loaded;
        }
      }
    };

    xhr.onload = () => {
      setIsUploading(false);
      setTransferSpeed('');
      if (xhr.status >= 200 && xhr.status < 300) {
        toast.success(
          files.length === 1 ? `已发送: ${files[0].name}` : `已发送 ${files.length} 个文件`,
          {
            description: '局域网传输完成，手机端已可接收',
          }
        );
        onUploadSuccess?.();
      } else {
        toast.error('上传失败，请重试');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    xhr.onerror = () => {
      setIsUploading(false);
      setTransferSpeed('');
      toast.error('网络传输中断');
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    xhr.open('POST', '/api/upload', true);
    xhr.send(formData);
  };

  return (
    <div className="w-full relative">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      <motion.div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        whileHover={{ scale: 1.005 }}
        whileTap={{ scale: 0.995 }}
        transition={{ type: 'spring', duration: 0.35, bounce: 0.1 }}
        className={`relative cursor-pointer overflow-hidden rounded-xl border-2 border-dashed p-8 md:p-12 transition-all duration-200 flex flex-col items-center justify-center text-center group ${
          isDragging
            ? 'border-emerald-400 bg-emerald-950/20 shadow-glow-emerald'
            : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 hover:bg-zinc-900/60'
        }`}
      >
        {/* Subtle Ambient Light Glow */}
        <div className="absolute inset-0 bg-radial from-emerald-500/5 to-transparent pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity" />

        <AnimatePresence mode="wait">
          {isUploading ? (
            <motion.div
              key="uploading"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md flex flex-col items-center space-y-4"
            >
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Loader2 className="w-7 h-7 animate-spin text-emerald-400" />
              </div>

              <div className="w-full space-y-2 text-center">
                <p className="text-sm font-medium text-zinc-200 truncate max-w-xs mx-auto">
                  正在发送: {currentFileName}
                </p>
                <div className="w-full bg-zinc-800/80 rounded-full h-2 overflow-hidden border border-zinc-700/50">
                  <motion.div
                    className="bg-emerald-400 h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ ease: 'easeOut', duration: 0.2 }}
                  />
                </div>
                <div className="flex justify-between items-center text-xs text-zinc-400 font-mono px-1">
                  <span>{uploadProgress}%</span>
                  <span>{transferSpeed || '高速内网传输中...'}</span>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center space-y-4"
            >
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-transform duration-200 ${
                  isDragging
                    ? 'scale-110 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-glow-emerald'
                    : 'bg-zinc-800/60 text-zinc-400 border border-zinc-700/60 group-hover:text-emerald-400 group-hover:border-emerald-500/30 group-hover:scale-105'
                }`}
              >
                {isDragging ? (
                  <FileUp className="w-8 h-8 animate-bounce text-emerald-400" />
                ) : (
                  <UploadCloud className="w-8 h-8" />
                )}
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base md:text-lg font-semibold text-zinc-100 tracking-tight flex items-center justify-center gap-2">
                  <span>拖拽文件至此发送给手机</span>
                  <Sparkles className="w-4 h-4 text-emerald-400 opacity-80" />
                </h3>
                <p className="text-xs md:text-sm text-zinc-400 max-w-md">
                  或点击浏览文件 · 支持直接 <kbd className="px-1.5 py-0.5 text-xs bg-zinc-800 text-zinc-300 rounded border border-zinc-700 font-mono">Ctrl+V</kbd> 粘贴截图
                </p>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <span className="btn-press inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 group-hover:bg-emerald-500 group-hover:text-black group-hover:border-emerald-400 transition-colors">
                  <Plus className="w-4 h-4" />
                  选择电脑文件
                </span>
                <span className="text-xs text-zinc-500 font-mono">
                  局域网跑满千兆 · 无大小限制
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
