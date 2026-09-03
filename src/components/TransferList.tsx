import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Download,
  FolderOpen,
  Copy,
  Trash2,
  FileText,
  Smartphone,
  Laptop,
  Search,
  Check,
  ExternalLink,
  Eye,
  CheckSquare,
  Square,
  Archive,
  Play,
  Crosshair,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import { FileInfo } from '../types';
import {
  formatBytes,
  formatTime,
  getFileTypeBadge,
  isImageFile,
  isVideoFile,
  isAudioFile,
  isTextFile,
} from '../utils/format';

interface TransferListProps {
  files: FileInfo[];
  onDeleteFile: (id: string) => void;
  onBatchDeleteFiles?: (ids: string[]) => void;
  onOpenFolder?: () => void;
  onPreviewFile?: (file: FileInfo) => void;
  isDesktop?: boolean;
}

export const TransferList: React.FC<TransferListProps> = ({
  files,
  onDeleteFile,
  onBatchDeleteFiles,
  onOpenFolder,
  onPreviewFile,
  isDesktop = true,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'media' | 'docs'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter files by search term and category
  const filteredFiles = files.filter((f) => {
    const matchesSearch =
      f.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.senderName.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (activeCategory === 'media') {
      return isImageFile(f.originalName, f.mimetype) || isVideoFile(f.originalName, f.mimetype);
    }
    if (activeCategory === 'docs') {
      return !isImageFile(f.originalName, f.mimetype) && !isVideoFile(f.originalName, f.mimetype);
    }
    return true;
  });

  const mediaCount = files.filter(
    (f) => isImageFile(f.originalName, f.mimetype) || isVideoFile(f.originalName, f.mimetype)
  ).length;
  const docsCount = files.length - mediaCount;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredFiles.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredFiles.map((f) => f.id)));
    }
  };

  const handleCopyLink = (file: FileInfo) => {
    const downloadUrl = `${window.location.origin}/api/download/${file.id}`;
    navigator.clipboard.writeText(downloadUrl).then(() => {
      setCopiedId(file.id);
      toast.success('已复制下载直链');
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  const handleDownload = (file: FileInfo) => {
    const downloadUrl = `/api/download/${file.id}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = file.originalName || file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`开始下载: ${file.originalName}`);
  };

  const handleDownloadZip = (ids?: string[]) => {
    const targetIds = ids || Array.from(selectedIds);
    let url = '/api/download-zip';
    if (targetIds.length > 0) {
      url += `?ids=${targetIds.join(',')}`;
    }
    window.location.href = url;
    toast.success('正在打包并下载 ZIP 压缩包...');
  };

  const handleLocateFile = async (file: FileInfo) => {
    if (window.electronAPI?.showItemInFolder && file.path) {
      try {
        const ok = await window.electronAPI.showItemInFolder(file.path);
        if (ok) {
          toast.success('已在文件夹中精确定位文件');
          return;
        }
      } catch (e) {}
    }

    try {
      const res = await fetch('/api/locate-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: file.id }),
      });
      if (res.ok) {
        toast.success('已在资源管理器中定位文件');
      } else {
        toast.error('无法定位文件');
      }
    } catch (e) {
      toast.error('定位失败');
    }
  };

  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return;
    if (onBatchDeleteFiles) {
      onBatchDeleteFiles(Array.from(selectedIds));
      setSelectedIds(new Set());
      setIsSelectMode(false);
      toast.success('批量删除完成');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            <span>实时传输记录</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700/60">
              {files.length}
            </span>
          </h3>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800 text-xs">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeCategory === 'all'
                  ? 'bg-zinc-800 text-white font-medium shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              全部 ({files.length})
            </button>
            <button
              onClick={() => setActiveCategory('media')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeCategory === 'media'
                  ? 'bg-zinc-800 text-emerald-400 font-medium shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              媒体 ({mediaCount})
            </button>
            <button
              onClick={() => setActiveCategory('docs')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeCategory === 'docs'
                  ? 'bg-zinc-800 text-sky-400 font-medium shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              文档档案 ({docsCount})
            </button>
          </div>
        </div>

        {/* Action Group */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Search Bar */}
          {files.length > 3 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索文件..."
                className="w-36 md:w-44 pl-8 pr-3 py-1.5 text-xs rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          )}

          {/* Batch Mode Toggle */}
          {files.length > 0 && (
            <button
              onClick={() => {
                setIsSelectMode(!isSelectMode);
                if (isSelectMode) setSelectedIds(new Set());
              }}
              className={`btn-press px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                isSelectMode
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              {isSelectMode ? '退出多选' : '批量选择'}
            </button>
          )}

          {/* Download All as ZIP */}
          {files.length > 0 && (
            <button
              onClick={() => handleDownloadZip()}
              className="btn-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 text-zinc-300 hover:text-emerald-400 transition-colors"
              title="打包全部文件下载为 ZIP 压缩文件"
            >
              <Archive className="w-3.5 h-3.5 text-emerald-400" />
              <span>打包全部 (ZIP)</span>
            </button>
          )}

          {isDesktop && onOpenFolder && (
            <button
              onClick={onOpenFolder}
              className="btn-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-colors"
            >
              <FolderOpen className="w-3.5 h-3.5 text-zinc-400" />
              <span>打开目录</span>
            </button>
          )}
        </div>
      </div>

      {/* Batch Operations Floating Bar */}
      <AnimatePresence>
        {isSelectMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between overflow-hidden"
          >
            <div className="flex items-center gap-3">
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white font-medium"
              >
                {selectedIds.size === filteredFiles.length && filteredFiles.length > 0 ? (
                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Square className="w-4 h-4 text-zinc-500" />
                )}
                <span>全选 ({filteredFiles.length})</span>
              </button>

              <span className="text-xs text-zinc-500">|</span>
              <span className="text-xs text-emerald-400 font-mono">已选择 {selectedIds.size} 项</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDownloadZip(Array.from(selectedIds))}
                disabled={selectedIds.size === 0}
                className="btn-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black disabled:opacity-40 disabled:pointer-events-none transition-all"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>打包下载所选</span>
              </button>

              {onBatchDeleteFiles && (
                <button
                  onClick={handleBatchDelete}
                  disabled={selectedIds.size === 0}
                  className="btn-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>删除所选</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File Items Grid / List */}
      <div className="space-y-2.5">
        {filteredFiles.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed border-zinc-800/80 bg-zinc-950/40 space-y-2">
            <p className="text-xs text-zinc-400 font-medium">暂无传输记录</p>
            <p className="text-[11px] text-zinc-600">
              从电脑拖入文件，或使用手机扫码发送照片与文件
            </p>
          </div>
        ) : (
          filteredFiles.map((file) => {
            const badge = getFileTypeBadge(file.originalName, file.mimetype);
            const isImg = isImageFile(file.originalName, file.mimetype);
            const isVid = isVideoFile(file.originalName, file.mimetype);
            const isAud = isAudioFile(file.originalName, file.mimetype);
            const isTxt = isTextFile(file.originalName, file.mimetype);
            const canPreview = isImg || isVid || isAud || isTxt;
            const isSelected = selectedIds.has(file.id);

            return (
              <motion.div
                key={file.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.18 }}
                className={`p-3 rounded-2xl border transition-all flex items-center justify-between group ${
                  isSelected
                    ? 'bg-emerald-500/10 border-emerald-500/40'
                    : 'bg-zinc-900/50 border-zinc-800/70 hover:border-zinc-700 hover:bg-zinc-900/80'
                }`}
              >
                {/* Left: Checkbox + Thumbnail + Info */}
                <div className="flex items-center gap-3 min-w-0 pr-4">
                  {isSelectMode && (
                    <button
                      type="button"
                      onClick={() => toggleSelect(file.id)}
                      className="p-1 rounded text-zinc-400 hover:text-white"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Square className="w-4 h-4 text-zinc-500" />
                      )}
                    </button>
                  )}

                  {/* Thumbnail / Media Badge */}
                  <div
                    onClick={() => canPreview && onPreviewFile && onPreviewFile(file)}
                    className={`relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-zinc-800/80 flex items-center justify-center bg-zinc-950 ${
                      canPreview ? 'cursor-pointer group/thumb' : ''
                    }`}
                  >
                    {isImg ? (
                      <>
                        <img
                          src={`/api/thumbnail/${file.id}`}
                          alt={file.originalName}
                          className="w-full h-full object-cover transition-transform duration-200 group-hover/thumb:scale-110"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `/api/preview/${file.id}`;
                          }}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                          <Eye className="w-4 h-4 text-white" />
                        </div>
                      </>
                    ) : isVid ? (
                      <div className="relative w-full h-full flex items-center justify-center bg-zinc-950">
                        <img
                          src={`/api/thumbnail/${file.id}`}
                          alt={file.originalName}
                          className="w-full h-full object-cover opacity-75"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-sky-400 bg-black/20">
                          <Play className="w-4 h-4 fill-sky-400/30" />
                          <span className="text-[8px] font-mono mt-0.5 text-zinc-300">VIDEO</span>
                        </div>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                          <Eye className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    ) : isAud ? (
                      <div className="flex flex-col items-center justify-center text-violet-400">
                        <span className="text-[10px] font-mono font-bold">♪ AUDIO</span>
                      </div>
                    ) : (
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${badge.color}`}>
                        {badge.label}
                      </span>
                    )}
                  </div>

                  {/* File Metadata */}
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h4
                        onClick={() => canPreview && onPreviewFile && onPreviewFile(file)}
                        className={`text-xs font-semibold text-zinc-200 truncate font-mono ${
                          canPreview ? 'hover:text-emerald-400 cursor-pointer' : ''
                        }`}
                        title={file.originalName}
                      >
                        {file.originalName}
                      </h4>
                      <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                        {formatBytes(file.size)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                      <span className="flex items-center gap-1">
                        {file.sender === 'desktop' ? (
                          <Laptop className="w-3 h-3 text-zinc-400" />
                        ) : (
                          <Smartphone className="w-3 h-3 text-emerald-400" />
                        )}
                        <span>{file.senderName}</span>
                      </span>
                      <span>·</span>
                      <span>{formatTime(file.timestamp)}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {canPreview && onPreviewFile && (
                    <button
                      onClick={() => onPreviewFile(file)}
                      className="btn-press p-2 rounded-xl bg-zinc-800/60 hover:bg-zinc-700 text-zinc-300 hover:text-emerald-400 transition-colors"
                      title="快速预览"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {isDesktop && (
                    <button
                      onClick={() => handleLocateFile(file)}
                      className="btn-press p-2 rounded-xl bg-zinc-800/60 hover:bg-zinc-700 text-zinc-300 hover:text-sky-400 transition-colors"
                      title="在资源管理器中定位"
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={() => handleCopyLink(file)}
                    className="btn-press p-2 rounded-xl bg-zinc-800/60 hover:bg-zinc-700 text-zinc-300 hover:text-emerald-400 transition-colors"
                    title="复制下载直链"
                  >
                    {copiedId === file.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <button
                    onClick={() => handleDownload(file)}
                    className="btn-press p-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 transition-colors"
                    title="下载文件"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onDeleteFile(file.id)}
                    className="btn-press p-2 rounded-xl bg-zinc-800/60 hover:bg-rose-500/20 hover:border-rose-500/30 text-zinc-400 hover:text-rose-400 transition-colors"
                    title="删除记录"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};
