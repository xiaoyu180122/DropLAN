import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Camera,
  Image as ImageIcon,
  FileText,
  MessageSquare,
  Download,
  UploadCloud,
  Check,
  Laptop,
  Copy,
  Zap,
  Loader2,
  ChevronDown,
  Monitor,
  Archive,
  Eye,
  Trash2,
  Play,
} from 'lucide-react';
import { toast } from 'sonner';
import { SystemInfo, FileInfo, ClipboardItem } from '../../types';
import {
  formatBytes,
  formatTime,
  getFileTypeBadge,
  isImageFile,
  isVideoFile,
  isAudioFile,
  isTextFile,
} from '../../utils/format';
import { MediaPreviewModal } from '../MediaPreviewModal';

interface MobileViewProps {
  systemInfo: SystemInfo | null;
  files: FileInfo[];
  clipboards: ClipboardItem[];
  onUploadSuccess: () => void;
  onSendClipboard: (text: string) => void;
  onSwitchToDesktop: () => void;
}

export const MobileView: React.FC<MobileViewProps> = ({
  systemInfo,
  files,
  clipboards,
  onUploadSuccess,
  onSendClipboard,
  onSwitchToDesktop,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState('');
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [copiedClipboardId, setCopiedClipboardId] = useState<string | null>(null);
  const [previewingFile, setPreviewingFile] = useState<FileInfo | null>(null);
  const [activeTab, setActiveTab] = useState<'fromPc' | 'fromMobile' | 'clipboard'>('fromPc');

  // Dedicated inputs
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const anyFileInputRef = useRef<HTMLInputElement>(null);

  const pcFiles = files.filter((f) => f.sender === 'desktop');
  const mobileFiles = files.filter((f) => f.sender === 'mobile');

  const handleUpload = (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    for (let i = 0; i < selectedFiles.length; i++) {
      formData.append('files', selectedFiles[i]);
    }
    formData.append('sender', 'mobile');
    formData.append('senderName', '智能手机终端');

    const xhr = new XMLHttpRequest();
    let startTime = Date.now();
    let lastLoaded = 0;

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percent);

        const now = Date.now();
        const timeDiff = (now - startTime) / 1000;
        if (timeDiff > 0.3) {
          const speed = (event.loaded - lastLoaded) / timeDiff;
          setUploadSpeed(`${formatBytes(speed)}/s`);
          startTime = now;
          lastLoaded = event.loaded;
        }
      }
    };

    xhr.onload = () => {
      setIsUploading(false);
      setUploadSpeed('');
      if (xhr.status >= 200 && xhr.status < 300) {
        toast.success(`发送成功！电脑端已接收`);
        onUploadSuccess();
      } else {
        toast.error('上传失败，请检查局域网连接');
      }
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (mediaInputRef.current) mediaInputRef.current.value = '';
      if (anyFileInputRef.current) anyFileInputRef.current.value = '';
    };

    xhr.onerror = () => {
      setIsUploading(false);
      setUploadSpeed('');
      toast.error('传输中断');
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (mediaInputRef.current) mediaInputRef.current.value = '';
      if (anyFileInputRef.current) anyFileInputRef.current.value = '';
    };

    xhr.open('POST', '/api/upload', true);
    xhr.send(formData);
  };

  const handleSendText = () => {
    const trimmed = textInput.trim();
    if (!trimmed) return;
    onSendClipboard(trimmed);
    setTextInput('');
    setShowTextInput(false);
    toast.success('文字已发送到电脑端');
  };

  const handleCopyText = (item: ClipboardItem) => {
    navigator.clipboard.writeText(item.text).then(() => {
      setCopiedClipboardId(item.id);
      toast.success('已复制到手机剪贴板');
      setTimeout(() => setCopiedClipboardId(null), 1500);
    });
  };

  const handleDownload = (file: FileInfo) => {
    const downloadUrl = `/api/download/${file.id}`;
    window.location.href = downloadUrl;
    toast.success(`开始下载: ${file.originalName}`);
  };

  const handleDownloadAllZip = () => {
    if (files.length === 0) return;
    window.location.href = '/api/download-zip';
    toast.success('正在打包全部文件为 ZIP 并下载...');
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col pb-16">
      {/* Hidden File Pickers */}
      {/* 1. Camera Direct Capture */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleUpload(e.target.files)}
        className="hidden"
      />
      {/* 2. Photo / Video Gallery */}
      <input
        ref={mediaInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={(e) => handleUpload(e.target.files)}
        className="hidden"
      />
      {/* 3. Any Documents */}
      <input
        ref={anyFileInputRef}
        type="file"
        multiple
        onChange={(e) => handleUpload(e.target.files)}
        className="hidden"
      />

      {/* Top Mobile Header */}
      <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-[#09090b]/90 backdrop-blur-xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Zap className="w-4 h-4 fill-emerald-400/20" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-sm tracking-tight text-white font-mono">
                DropLAN
              </h1>
              <span className="px-1 py-0.5 rounded text-[9px] font-mono font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                LAN
              </span>
            </div>
            <p className="text-[10px] text-zinc-400">
              已直连: {systemInfo?.hostname || '电脑工作台'}
            </p>
          </div>
        </div>

        <button
          onClick={onSwitchToDesktop}
          className="btn-press flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white"
        >
          <Monitor className="w-3.5 h-3.5 text-zinc-400" />
          <span>电脑端</span>
        </button>
      </header>

      {/* Uploading Status Floating Banner */}
      <AnimatePresence>
        {isUploading && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="sticky top-14 z-20 mx-4 mt-2 p-3.5 rounded-2xl bg-zinc-900 border border-emerald-500/40 shadow-glow-emerald"
          >
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-medium text-emerald-400 flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                正在极速直传电脑...
              </span>
              <span className="font-mono text-zinc-300">
                {uploadProgress}% {uploadSpeed && `(${uploadSpeed})`}
              </span>
            </div>
            <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full transition-all duration-150 ease-out rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 p-4 space-y-5">
        {/* Core Mobile Upload Triggers (3 Big Quick Buttons + Text Box) */}
        <div className="grid grid-cols-3 gap-2.5">
          {/* 1. Camera Direct Capture */}
          <button
            onClick={() => cameraInputRef.current?.click()}
            disabled={isUploading}
            className="btn-press flex flex-col items-center justify-center p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-emerald-500/50 text-center space-y-1.5 shadow-sm active:bg-zinc-800"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Camera className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-zinc-100">拍照即传</span>
            <span className="text-[10px] text-zinc-500">拍完直达电脑</span>
          </button>

          {/* 2. Photo / Video Library */}
          <button
            onClick={() => mediaInputRef.current?.click()}
            disabled={isUploading}
            className="btn-press flex flex-col items-center justify-center p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-sky-500/50 text-center space-y-1.5 shadow-sm active:bg-zinc-800"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <ImageIcon className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-zinc-100">手机相册</span>
            <span className="text-[10px] text-zinc-500">原画照片/视频</span>
          </button>

          {/* 3. Any Document File */}
          <button
            onClick={() => anyFileInputRef.current?.click()}
            disabled={isUploading}
            className="btn-press flex flex-col items-center justify-center p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-amber-500/50 text-center space-y-1.5 shadow-sm active:bg-zinc-800"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-zinc-100">发送文件</span>
            <span className="text-[10px] text-zinc-500">PDF/压缩包等</span>
          </button>
        </div>

        {/* Quick Send Text / Clipboard Input */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              隔空传字 / 复制内容发电脑
            </span>
            <button
              onClick={() => setShowTextInput(!showTextInput)}
              className="text-xs text-zinc-400 hover:text-emerald-400 font-medium"
            >
              {showTextInput ? '收起' : '展开'}
            </button>
          </div>

          <AnimatePresence>
            {showTextInput && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2 pt-1"
              >
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="在此粘贴或输入网址、备忘、验证码，直接同步至电脑..."
                  rows={3}
                  className="w-full p-2.5 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 resize-none font-mono"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleSendText}
                    disabled={!textInput.trim()}
                    className="btn-press px-4 py-1.5 rounded-xl bg-emerald-500 text-black font-semibold text-xs disabled:opacity-40"
                  >
                    发送到电脑
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
          <div className="flex items-center gap-1 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800 text-xs">
            <button
              onClick={() => setActiveTab('fromPc')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'fromPc'
                  ? 'bg-zinc-800 text-white font-medium shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              电脑发来的 ({pcFiles.length})
            </button>
            <button
              onClick={() => setActiveTab('fromMobile')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'fromMobile'
                  ? 'bg-zinc-800 text-white font-medium shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              我发出的 ({mobileFiles.length})
            </button>
            <button
              onClick={() => setActiveTab('clipboard')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'clipboard'
                  ? 'bg-zinc-800 text-white font-medium shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              文字 ({clipboards.length})
            </button>
          </div>

          {files.length > 0 && activeTab !== 'clipboard' && (
            <button
              onClick={handleDownloadAllZip}
              className="btn-press flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-emerald-400 text-xs font-medium"
              title="打包全部为 ZIP"
            >
              <Archive className="w-3 h-3" />
              <span>全存(ZIP)</span>
            </button>
          )}
        </div>

        {/* Tab Content 1 & 2: File Lists */}
        {(activeTab === 'fromPc' || activeTab === 'fromMobile') && (
          <div className="space-y-2.5">
            {(activeTab === 'fromPc' ? pcFiles : mobileFiles).length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-zinc-800/80 bg-zinc-950/40">
                <p className="text-xs text-zinc-500">
                  {activeTab === 'fromPc' ? '电脑端暂未发送文件过来' : '手机端暂未发送文件'}
                </p>
              </div>
            ) : (
              (activeTab === 'fromPc' ? pcFiles : mobileFiles).map((file) => {
                const badge = getFileTypeBadge(file.originalName, file.mimetype);
                const isImg = isImageFile(file.originalName, file.mimetype);
                const isVid = isVideoFile(file.originalName, file.mimetype);
                const isAud = isAudioFile(file.originalName, file.mimetype);
                const isTxt = isTextFile(file.originalName, file.mimetype);
                const canPreview = isImg || isVid || isAud || isTxt;

                return (
                  <div
                    key={file.id}
                    className="p-3 rounded-2xl border border-zinc-800/80 bg-zinc-900/50 flex items-center justify-between gap-3"
                  >
                    <div
                      onClick={() => canPreview && setPreviewingFile(file)}
                      className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                    >
                      {/* Thumbnail */}
                      <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-zinc-800 bg-zinc-950 flex items-center justify-center">
                        {isImg ? (
                          <img
                            src={`/api/preview/${file.id}`}
                            alt={file.originalName}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : isVid ? (
                          <Play className="w-5 h-5 text-sky-400" />
                        ) : (
                          <span
                            className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${badge.color}`}
                          >
                            {badge.label}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 space-y-0.5">
                        <h4 className="text-xs font-semibold text-zinc-200 truncate font-mono">
                          {file.originalName}
                        </h4>
                        <p className="text-[10px] text-zinc-400 font-mono">
                          {formatBytes(file.size)} · {formatTime(file.timestamp)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {canPreview && (
                        <button
                          onClick={() => setPreviewingFile(file)}
                          className="btn-press p-2 rounded-xl bg-zinc-800/80 text-zinc-300"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDownload(file)}
                        className="btn-press p-2 rounded-xl bg-emerald-500 text-black font-semibold"
                        title="保存到手机"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab Content 3: Clipboard List */}
        {activeTab === 'clipboard' && (
          <div className="space-y-2.5">
            {clipboards.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-zinc-800/80 bg-zinc-950/40">
                <p className="text-xs text-zinc-500">暂无文字快传记录</p>
              </div>
            ) : (
              clipboards.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl border border-zinc-800/80 bg-zinc-900/50 space-y-2"
                >
                  <p className="text-xs text-zinc-200 break-all font-mono leading-relaxed select-all">
                    {item.text}
                  </p>
                  <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60 text-[10px] text-zinc-500">
                    <span>
                      来自 {item.senderName} · {formatTime(item.timestamp)}
                    </span>
                    <button
                      onClick={() => handleCopyText(item)}
                      className="btn-press flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 text-emerald-400 font-medium"
                    >
                      {copiedClipboardId === item.id ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>复制</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Media Lightbox Preview Modal */}
      <MediaPreviewModal
        file={previewingFile}
        onClose={() => setPreviewingFile(null)}
        onDownload={handleDownload}
      />
    </div>
  );
};
