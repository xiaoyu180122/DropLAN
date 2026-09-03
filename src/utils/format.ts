export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  if (isToday) {
    return `${hours}:${minutes}`;
  }
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
}

export function getFileExt(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

export function isImageFile(filename: string, mimetype?: string): boolean {
  const ext = getFileExt(filename);
  return (
    ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'heic', 'bmp', 'ico', 'avif'].includes(ext) ||
    Boolean(mimetype?.startsWith('image/'))
  );
}

export function isVideoFile(filename: string, mimetype?: string): boolean {
  const ext = getFileExt(filename);
  return (
    ['mp4', 'mov', 'mkv', 'avi', 'webm', 'flv', 'm4v', '3gp'].includes(ext) ||
    Boolean(mimetype?.startsWith('video/'))
  );
}

export function isAudioFile(filename: string, mimetype?: string): boolean {
  const ext = getFileExt(filename);
  return (
    ['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg', 'opus'].includes(ext) ||
    Boolean(mimetype?.startsWith('audio/'))
  );
}

export function isTextFile(filename: string, mimetype?: string): boolean {
  const ext = getFileExt(filename);
  return (
    [
      'txt',
      'md',
      'json',
      'js',
      'ts',
      'jsx',
      'tsx',
      'html',
      'css',
      'py',
      'java',
      'go',
      'rs',
      'c',
      'cpp',
      'h',
      'yaml',
      'yml',
      'xml',
      'sh',
      'bat',
      'cmd',
      'ps1',
      'log',
      'sql',
      'env',
      'ini',
      'conf',
    ].includes(ext) ||
    Boolean(mimetype?.startsWith('text/'))
  );
}

export function getFileTypeBadge(filename: string, mimetype?: string): { label: string; color: string } {
  const ext = getFileExt(filename);

  if (isImageFile(filename, mimetype)) {
    return { label: ext.toUpperCase() || 'IMG', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
  }
  if (isVideoFile(filename, mimetype)) {
    return { label: ext.toUpperCase() || 'VIDEO', color: 'bg-sky-500/15 text-sky-400 border-sky-500/30' };
  }
  if (isAudioFile(filename, mimetype)) {
    return { label: ext.toUpperCase() || 'AUDIO', color: 'bg-violet-500/15 text-violet-400 border-violet-500/30' };
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return { label: ext.toUpperCase() || 'ZIP', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
  }
  if (['pdf'].includes(ext)) {
    return { label: 'PDF', color: 'bg-rose-500/15 text-rose-400 border-rose-500/30' };
  }
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'csv'].includes(ext)) {
    return { label: ext.toUpperCase(), color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' };
  }
  if (isTextFile(filename, mimetype)) {
    return { label: ext.toUpperCase(), color: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/30' };
  }
  return { label: ext.toUpperCase() || 'FILE', color: 'bg-zinc-800 text-zinc-400 border-zinc-700' };
}
