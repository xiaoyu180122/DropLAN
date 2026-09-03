import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import multer from 'multer';
import cors from 'cors';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { exec, spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { ZipArchive } from 'archiver';

const currentDir = typeof __dirname !== 'undefined' ? __dirname : (typeof import.meta !== 'undefined' && import.meta.url ? path.dirname(fileURLToPath(import.meta.url)) : process.cwd());
const projectRoot = path.resolve(currentDir, '..');
const userDataDir = process.env.DROPLAN_USER_DATA || projectRoot;
let downloadsDir = process.env.DROPLAN_DOWNLOADS_DIR || path.resolve(projectRoot, 'downloads');

// Ensure downloads directory exists
if (!fs.existsSync(downloadsDir)) {
  try {
    fs.mkdirSync(downloadsDir, { recursive: true });
  } catch (e) {}
}

// Media cache directories for on-the-fly previews and thumbnails
const cacheDir = path.resolve(userDataDir, 'cache');
const thumbCacheDir = path.resolve(cacheDir, 'thumbnails');
const previewCacheDir = path.resolve(cacheDir, 'previews');

try {
  fs.mkdirSync(thumbCacheDir, { recursive: true });
  fs.mkdirSync(previewCacheDir, { recursive: true });
} catch (_) {}

// Check system FFmpeg availability
let ffmpegAvailable = false;
try {
  exec('ffmpeg -version', (err) => {
    ffmpegAvailable = !err;
    if (ffmpegAvailable) {
      console.log('[DropLAN] FFmpeg available: Full-format video/image transcoding enabled.');
    } else {
      console.log('[DropLAN] FFmpeg not found on system PATH: Falling back to direct streaming.');
    }
  });
} catch (_) {
  ffmpegAvailable = false;
}

// Comprehensive MIME types dictionary
const MIME_TYPES = {
  // Images
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  jfif: 'image/jpeg',
  pjpeg: 'image/jpeg',
  pjp: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  svgz: 'image/svg+xml',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  avif: 'image/avif',
  heic: 'image/heic',
  heif: 'image/heif',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  psd: 'image/vnd.adobe.photoshop',
  dng: 'image/x-adobe-dng',
  cr2: 'image/x-canon-cr2',
  cr3: 'image/x-canon-cr3',
  nef: 'image/x-nikon-nef',
  arw: 'image/x-sony-arw',
  // Videos
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  webm: 'video/webm',
  ogv: 'video/ogg',
  ogg: 'video/ogg',
  mov: 'video/quicktime',
  qt: 'video/quicktime',
  mkv: 'video/x-matroska',
  avi: 'video/x-msvideo',
  wmv: 'video/x-ms-wmv',
  asf: 'video/x-ms-asf',
  flv: 'video/x-flv',
  f4v: 'video/x-f4v',
  ts: 'video/mp2t',
  mts: 'video/mp2t',
  m2ts: 'video/mp2t',
  rm: 'video/vnd.rn-realmedia',
  rmvb: 'video/vnd.rn-realmedia',
  '3gp': 'video/3gpp',
  '3g2': 'video/3gpp2',
  vob: 'video/dvd',
  mpg: 'video/mpeg',
  mpeg: 'video/mpeg',
  // Audio
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  flac: 'audio/flac',
  aac: 'audio/aac',
  m4a: 'audio/mp4',
  wma: 'audio/x-ms-wma',
  opus: 'audio/opus',
  // Documents
  pdf: 'application/pdf',
  txt: 'text/plain',
  md: 'text/markdown',
  json: 'application/json',
  js: 'text/javascript',
  tsx: 'text/plain',
  jsx: 'text/plain',
  html: 'text/html',
  css: 'text/css',
  csv: 'text/csv',
  xml: 'application/xml',
};

function getFileExtension(filename = '') {
  const ext = path.extname(filename).toLowerCase().replace('.', '');
  return ext;
}

function getMimeType(filename, originalName, fallbackMime) {
  const ext = getFileExtension(originalName) || getFileExtension(filename);
  if (MIME_TYPES[ext]) {
    return MIME_TYPES[ext];
  }
  if (fallbackMime && fallbackMime !== 'application/octet-stream') {
    return fallbackMime;
  }
  return 'application/octet-stream';
}

function resolveFilePath(file) {
  if (!file) return null;
  // 1. Direct recorded path
  if (file.path && fs.existsSync(file.path)) {
    return file.path;
  }
  // 2. In active downloadsDir
  const inDownloads = path.resolve(downloadsDir, file.name);
  if (fs.existsSync(inDownloads)) {
    return inDownloads;
  }
  // 3. In appConfig.downloadsDir if different
  if (appConfig.downloadsDir && appConfig.downloadsDir !== downloadsDir) {
    const inConfigDir = path.resolve(appConfig.downloadsDir, file.name);
    if (fs.existsSync(inConfigDir)) return inConfigDir;
  }
  // 4. In projectRoot/downloads
  const inProject = path.resolve(projectRoot, 'downloads', file.name);
  if (fs.existsSync(inProject)) {
    return inProject;
  }
  return inDownloads;
}

// Config file management
const configFile = path.resolve(userDataDir, 'config.json');
let appConfig = {
  downloadsDir: downloadsDir,
  autoClipboard: true,
  notifyOnReceive: true,
  soundEnabled: true,
  selectedIp: null,
};

if (fs.existsSync(configFile)) {
  try {
    const loaded = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    appConfig = { ...appConfig, ...loaded };
    if (appConfig.downloadsDir && typeof appConfig.downloadsDir === 'string') {
      if (!fs.existsSync(appConfig.downloadsDir)) {
        try {
          fs.mkdirSync(appConfig.downloadsDir, { recursive: true });
        } catch (_) {}
      }
      downloadsDir = appConfig.downloadsDir;
    }
  } catch (e) {
    console.warn('Failed to load config.json:', e);
  }
}

global.currentDownloadsDir = downloadsDir;
process.env.DROPLAN_DOWNLOADS_DIR = downloadsDir;

function saveConfig() {
  try {
    fs.writeFileSync(configFile, JSON.stringify(appConfig, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to save config:', e);
  }
}

// In-memory file registry with persistent metadata file
// Stored in userDataDir so the user's Downloads folder remains 100% clean of program files
function getMetaFile() {
  const metaInUserData = path.resolve(userDataDir, 'file_registry.json');
  const legacyInDownloads = path.resolve(downloadsDir, '.metadata.json');

  // Migrate legacy .metadata.json out of downloadsDir
  if (fs.existsSync(legacyInDownloads)) {
    try {
      if (!fs.existsSync(metaInUserData)) {
        const legacyData = fs.readFileSync(legacyInDownloads, 'utf8');
        fs.writeFileSync(metaInUserData, legacyData, 'utf8');
      }
      fs.unlinkSync(legacyInDownloads);
    } catch (e) {}
  }

  return metaInUserData;
}

let fileRegistry = [];
const metaPath = getMetaFile();
if (fs.existsSync(metaPath)) {
  try {
    fileRegistry = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  } catch (e) {
    fileRegistry = [];
  }
}

function saveMeta() {
  try {
    fs.writeFileSync(getMetaFile(), JSON.stringify(fileRegistry, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to save metadata:', e);
  }
}

// Advanced network interface analysis & multi-IP discovery
function getAllIPs() {
  const interfaces = os.networkInterfaces();
  const results = [];

  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        const isTunnelOrVpn = /tunnel|vpn|tap|wintun|tailscale|zerotier|radmin|clash|sing-box|sakurai/i.test(name);
        const isVirtual = isTunnelOrVpn || /vEthernet|virtual|vmware|vbox|docker|hyper-v/i.test(name);
        const isWiFi = /wi-fi|wlan|wireless/i.test(name);
        const isEthernet = /ethernet|eth|以太网|本地连接/i.test(name);

        let type = 'other';
        let score = 1;
        if (isWiFi) {
          type = 'wifi';
          score = 20;
        } else if (isEthernet) {
          type = 'ethernet';
          score = 15;
        } else if (isVirtual) {
          type = 'virtual';
          score = -10;
        }

        if (net.address.startsWith('192.168.')) score += 5;
        else if (net.address.startsWith('10.')) score += 3;
        else if (net.address.startsWith('172.')) score += 2;
        else if (net.address.startsWith('198.18.')) score -= 15; // Proxy tunnel range

        results.push({
          name,
          address: net.address,
          type,
          score,
          isRecommended: score > 5,
        });
      }
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}

function getLocalIP() {
  const all = getAllIPs();
  if (appConfig.selectedIp && all.some((item) => item.address === appConfig.selectedIp)) {
    return appConfig.selectedIp;
  }
  return all.length > 0 ? all[0].address : '127.0.0.1';
}

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(cors());
app.use(express.json());

// Active connected devices tracker
const connectedClients = new Map();

wss.on('connection', (ws, req) => {
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  const remoteIp = req.socket.remoteAddress?.replace(/^.*:/, '') || 'Unknown';
  const clientId = Math.random().toString(36).substring(2, 9);

  connectedClients.set(clientId, {
    id: clientId,
    ip: remoteIp,
    deviceType: 'Unknown',
    deviceName: 'New Device',
    connectedAt: Date.now(),
    ws,
  });

  broadcastDevices();

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === 'IDENTIFY') {
        const client = connectedClients.get(clientId);
        if (client) {
          client.deviceId = data.deviceId;
          client.deviceType = data.deviceType || 'mobile';
          client.deviceName = data.deviceName || (data.deviceType === 'desktop' ? 'Desktop PC' : 'Mobile Device');

          // Deduplicate: Clean up any previous stale/zombie connection from the same deviceId or same mobile IP
          for (const [existingId, existingClient] of connectedClients.entries()) {
            if (existingId !== clientId) {
              const isSameDeviceId = data.deviceId && existingClient.deviceId === data.deviceId;
              const isSameMobileIp = data.deviceType === 'mobile' && existingClient.deviceType === 'mobile' && existingClient.ip === client.ip;
              if (isSameDeviceId || isSameMobileIp) {
                try {
                  existingClient.ws.terminate();
                } catch (_) {}
                connectedClients.delete(existingId);
              }
            }
          }

          broadcastDevices();
        }
      } else if (data.type === 'CLIPBOARD_SHARE') {
        const clipId = data.id || Math.random().toString(36).substring(2, 10);
        broadcast(
          {
            type: 'CLIPBOARD_RECEIVED',
            id: clipId,
            text: data.text,
            senderName: data.senderName || 'Anonymous Device',
            timestamp: Date.now(),
          },
          ws
        );
      }
    } catch (err) {
      console.error('Error handling WebSocket message:', err);
    }
  });

  ws.on('close', () => {
    connectedClients.delete(clientId);
    broadcastDevices();
  });
});

// Periodic heartbeat ping to prune abandoned/ghost sockets (e.g. mobile lock screen or silent disconnect)
setInterval(() => {
  let changed = false;
  for (const [id, client] of connectedClients.entries()) {
    if (client.ws.isAlive === false || client.ws.readyState !== WebSocket.OPEN) {
      try { client.ws.terminate(); } catch (_) {}
      connectedClients.delete(id);
      changed = true;
      continue;
    }
    client.ws.isAlive = false;
    try {
      client.ws.ping();
    } catch (_) {
      connectedClients.delete(id);
      changed = true;
    }
  }
  if (changed) {
    broadcastDevices();
  }
}, 25000);

function broadcast(payload, excludeWs = null) {
  const msg = JSON.stringify(payload);
  for (const client of connectedClients.values()) {
    if (client.ws.readyState === WebSocket.OPEN && client.ws !== excludeWs) {
      client.ws.send(msg);
    }
  }
}

function broadcastDevices() {
  const devices = Array.from(connectedClients.values()).map((d) => ({
    id: d.id,
    ip: d.ip,
    deviceType: d.deviceType,
    deviceName: d.deviceName,
    connectedAt: d.connectedAt,
  }));
  broadcast({
    type: 'DEVICES_UPDATED',
    devices,
  });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }
    cb(null, downloadsDir);
  },
  filename: (req, file, cb) => {
    let originalName = file.originalname;
    try {
      originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    } catch (e) {
      originalName = file.originalname;
    }

    const ext = path.extname(originalName);
    const basename = path.basename(originalName, ext);
    let finalName = `${basename}${ext}`;
    let counter = 1;

    while (fs.existsSync(path.join(downloadsDir, finalName))) {
      finalName = `${basename}_${counter}${ext}`;
      counter++;
    }

    cb(null, finalName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 * 1024 }, // 10GB limit
});

// REST API Endpoints

// 1. Get System Info & IP
app.get('/api/info', (req, res) => {
  const interfaces = getAllIPs();
  const currentIp = getLocalIP();
  const port = server.address() ? server.address().port : 5200;
  const hostname = os.hostname();
  const devices = Array.from(connectedClients.values()).map((d) => ({
    id: d.id,
    ip: d.ip,
    deviceType: d.deviceType,
    deviceName: d.deviceName,
    connectedAt: d.connectedAt,
  }));

  res.json({
    ip: currentIp,
    interfaces,
    port,
    url: `http://${currentIp}:${port}`,
    hostname,
    downloadsDir,
    devices,
    config: appConfig,
  });
});

// 1.1 Rescan Network Interfaces & IP
app.post('/api/network/rescan', (req, res) => {
  const interfaces = getAllIPs();
  let currentIp = getLocalIP();
  const exists = interfaces.some((item) => item.address === currentIp);
  if (!exists && interfaces.length > 0) {
    currentIp = interfaces[0].address;
    appConfig.selectedIp = currentIp;
    saveConfig();
  }
  const port = server.address() ? server.address().port : 5200;
  const networkData = {
    ip: currentIp,
    interfaces,
    url: `http://${currentIp}:${port}`,
  };
  broadcast({ type: 'NETWORK_UPDATED', ...networkData });
  res.json({ success: true, ...networkData });
});

// 2. Get & Update App Config
app.get('/api/config', (req, res) => {
  res.json(appConfig);
});

app.post('/api/config', (req, res) => {
  const { downloadsDir: newDir, autoClipboard, notifyOnReceive, soundEnabled, selectedIp } = req.body;

  if (newDir && typeof newDir === 'string') {
    if (!fs.existsSync(newDir)) {
      try {
        fs.mkdirSync(newDir, { recursive: true });
      } catch (e) {
        return res.status(400).json({ error: '无法创建指定存储目录' });
      }
    }
    downloadsDir = newDir;
    appConfig.downloadsDir = newDir;
    global.currentDownloadsDir = newDir;
    process.env.DROPLAN_DOWNLOADS_DIR = newDir;
  }

  if (typeof autoClipboard === 'boolean') appConfig.autoClipboard = autoClipboard;
  if (typeof notifyOnReceive === 'boolean') appConfig.notifyOnReceive = notifyOnReceive;
  if (typeof soundEnabled === 'boolean') appConfig.soundEnabled = soundEnabled;
  if (selectedIp !== undefined) appConfig.selectedIp = selectedIp;

  saveConfig();
  broadcast({ type: 'CONFIG_UPDATED', config: appConfig });

  res.json({ success: true, config: appConfig, downloadsDir });
});

// 3. Get Files List
app.get('/api/files', (req, res) => {
  res.json({
    files: fileRegistry,
    downloadsDir,
  });
});

// 4. Upload File
app.post('/api/upload', upload.array('files'), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files provided' });
  }

  const sender = req.body.sender || 'desktop';
  const senderName = req.body.senderName || (sender === 'desktop' ? 'Desktop PC' : 'Mobile Device');
  const addedFiles = [];

  for (const file of req.files) {
    const fileId = Math.random().toString(36).substring(2, 10);
    let originalName = file.originalname;
    try {
      originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    } catch (e) {
      originalName = file.originalname;
    }

    const fileInfo = {
      id: fileId,
      name: file.filename,
      originalName: originalName,
      size: file.size,
      mimetype: file.mimetype,
      sender,
      senderName,
      timestamp: Date.now(),
      path: file.path,
    };

    fileRegistry.unshift(fileInfo);
    addedFiles.push(fileInfo);
  }

  saveMeta();

  broadcast({
    type: 'FILES_ADDED',
    files: addedFiles,
  });

  res.json({
    success: true,
    count: addedFiles.length,
    files: addedFiles,
  });
});

// Helper to pipe a file stream with Range support
function streamFileWithRange(req, res, filePath, mimeType, filename) {
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    const fileStream = fs.createReadStream(filePath, { start, end });

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': mimeType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
    });
    fileStream.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': mimeType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
      'Accept-Ranges': 'bytes',
    });
    fs.createReadStream(filePath).pipe(res);
  }
}

// 5. Download Single File (Attachment)
app.get('/api/download/:id', (req, res) => {
  const file = fileRegistry.find((f) => f.id === req.params.id);
  if (!file) {
    return res.status(404).json({ error: 'File not found' });
  }

  const filePath = resolveFilePath(file);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File on disk missing' });
  }

  res.download(filePath, file.originalName || file.name);
});

// 6. In-Browser Media Preview (Supports Full-Format Images & Video Streaming)
app.get('/api/preview/:id', (req, res) => {
  const file = fileRegistry.find((f) => f.id === req.params.id);
  if (!file) {
    return res.status(404).json({ error: 'File not found' });
  }

  const filePath = resolveFilePath(file);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File on disk missing' });
  }

  const ext = getFileExtension(file.originalName) || getFileExtension(file.name);
  const rawMime = getMimeType(file.name, file.originalName, file.mimetype);
  const filename = file.originalName || file.name;

  // Special handling for formats unsupported by browser <img> (HEIC, HEIF, TIFF, PSD, RAW formats)
  const isSpecialImage = ['heic', 'heif', 'tif', 'tiff', 'psd', 'dng', 'cr2', 'cr3', 'nef', 'arw'].includes(ext);

  if (isSpecialImage && req.query.raw !== 'true') {
    const previewCacheFile = path.resolve(previewCacheDir, `${file.id}.jpg`);
    if (fs.existsSync(previewCacheFile)) {
      return streamFileWithRange(req, res, previewCacheFile, 'image/jpeg', `${filename}.jpg`);
    }

    if (ffmpegAvailable) {
      const proc = spawn('ffmpeg', [
        '-hide_banner',
        '-loglevel', 'error',
        '-y',
        '-i', filePath,
        '-frames:v', '1',
        '-q:v', '2',
        previewCacheFile,
      ]);

      proc.on('close', (code) => {
        if (code === 0 && fs.existsSync(previewCacheFile)) {
          return streamFileWithRange(req, res, previewCacheFile, 'image/jpeg', `${filename}.jpg`);
        }
        return streamFileWithRange(req, res, filePath, rawMime, filename);
      });

      proc.on('error', () => {
        return streamFileWithRange(req, res, filePath, rawMime, filename);
      });
      return;
    }
  }

  // Standard delivery for native images and videos with proper MIME type
  streamFileWithRange(req, res, filePath, rawMime, filename);
});

// 6.1 On-the-fly Video Transcoding & Remux Streaming (Fragmented MP4 for all formats)
app.get('/api/stream/:id', (req, res) => {
  const file = fileRegistry.find((f) => f.id === req.params.id);
  if (!file) {
    return res.status(404).json({ error: 'File not found' });
  }

  const filePath = resolveFilePath(file);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File on disk missing' });
  }

  if (!ffmpegAvailable) {
    return res.redirect(`/api/preview/${file.id}`);
  }

  res.writeHead(200, {
    'Content-Type': 'video/mp4',
    'Accept-Ranges': 'none',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Connection': 'keep-alive',
  });

  const ffmpegArgs = [
    '-hide_banner',
    '-loglevel', 'error',
    '-i', filePath,
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-tune', 'zerolatency',
    '-crf', '25',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-ac', '2',
    '-movflags', 'frag_keyframe+empty_moov+default_base_moof',
    '-f', 'mp4',
    'pipe:1',
  ];

  const proc = spawn('ffmpeg', ffmpegArgs, { stdio: ['ignore', 'pipe', 'ignore'] });
  proc.stdout.pipe(res);

  const cleanup = () => {
    try { proc.kill('SIGKILL'); } catch (_) {}
  };

  req.on('close', cleanup);
  res.on('finish', cleanup);
  proc.on('error', () => {
    if (!res.headersSent) res.status(500).send('Transcoding error');
  });
});

// 6.2 Intelligent Media Thumbnail Endpoint
app.get('/api/thumbnail/:id', (req, res) => {
  const file = fileRegistry.find((f) => f.id === req.params.id);
  if (!file) {
    return res.status(404).json({ error: 'File not found' });
  }

  const filePath = resolveFilePath(file);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File on disk missing' });
  }

  const ext = getFileExtension(file.originalName) || getFileExtension(file.name);
  const rawMime = getMimeType(file.name, file.originalName, file.mimetype);
  const isWebImg = ['jpg', 'jpeg', 'jfif', 'pjpeg', 'pjp', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif'].includes(ext);

  // If already standard web image under 2MB, serve directly
  const stat = fs.statSync(filePath);
  if (isWebImg && stat.size < 2 * 1024 * 1024) {
    return streamFileWithRange(req, res, filePath, rawMime, file.originalName || file.name);
  }

  const thumbFile = path.resolve(thumbCacheDir, `${file.id}.jpg`);
  if (fs.existsSync(thumbFile)) {
    return streamFileWithRange(req, res, thumbFile, 'image/jpeg', 'thumb.jpg');
  }

  const isVideo = ['mp4', 'mov', 'mkv', 'avi', 'webm', 'flv', 'f4v', 'm4v', '3gp', '3g2', 'wmv', 'asf', 'rm', 'rmvb', 'ts', 'mts', 'm2ts', 'vob', 'mpg', 'mpeg'].includes(ext);
  const isSpecialImage = ['heic', 'heif', 'tif', 'tiff', 'psd', 'dng', 'cr2', 'cr3', 'nef', 'arw'].includes(ext) || isWebImg;

  if (ffmpegAvailable && (isVideo || isSpecialImage)) {
    const ffmpegArgs = isVideo
      ? [
          '-hide_banner',
          '-loglevel', 'error',
          '-y',
          '-ss', '00:00:01',
          '-i', filePath,
          '-frames:v', '1',
          '-vf', 'scale=360:-1:flags=fast_bilinear',
          '-q:v', '3',
          thumbFile,
        ]
      : [
          '-hide_banner',
          '-loglevel', 'error',
          '-y',
          '-i', filePath,
          '-frames:v', '1',
          '-vf', 'scale=360:-1:flags=fast_bilinear',
          '-q:v', '3',
          thumbFile,
        ];

    const proc = spawn('ffmpeg', ffmpegArgs);
    proc.on('close', (code) => {
      if (code === 0 && fs.existsSync(thumbFile)) {
        return streamFileWithRange(req, res, thumbFile, 'image/jpeg', 'thumb.jpg');
      }
      if (isWebImg) {
        return streamFileWithRange(req, res, filePath, rawMime, file.originalName || file.name);
      }
      res.status(404).send('No thumbnail available');
    });
    proc.on('error', () => {
      if (isWebImg) {
        return streamFileWithRange(req, res, filePath, rawMime, file.originalName || file.name);
      }
      res.status(404).send('Thumbnail error');
    });
    return;
  }

  // Fallback: if web image without ffmpeg, send original
  if (isWebImg) {
    return streamFileWithRange(req, res, filePath, rawMime, file.originalName || file.name);
  }

  res.status(404).send('No thumbnail available');
});

// 6.3 Open File in Native System Application (PotPlayer, Photos, etc.)
app.post('/api/open-file/:id', (req, res) => {
  const file = fileRegistry.find((f) => f.id === req.params.id);
  if (!file) {
    return res.status(404).json({ error: 'File not found' });
  }

  const filePath = resolveFilePath(file);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File on disk missing' });
  }

  if (process.platform === 'win32') {
    exec(`start "" "${filePath}"`, (err) => {
      if (err) {
        console.error('Failed to open file in system:', err);
        return res.status(500).json({ error: '无法调起系统程序打开该文件' });
      }
      res.json({ success: true, filePath });
    });
  } else if (process.platform === 'darwin') {
    exec(`open "${filePath}"`, (err) => {
      if (err) return res.status(500).json({ error: 'Failed to open file' });
      res.json({ success: true, filePath });
    });
  } else {
    exec(`xdg-open "${filePath}"`, (err) => {
      if (err) return res.status(500).json({ error: 'Failed to open file' });
      res.json({ success: true, filePath });
    });
  }
});

// 7. Preview Text / Code Content
app.get('/api/file-content/:id', (req, res) => {
  const file = fileRegistry.find((f) => f.id === req.params.id);
  if (!file) {
    return res.status(404).json({ error: 'File not found' });
  }

  const filePath = resolveFilePath(file);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File on disk missing' });
  }

  try {
    const stat = fs.statSync(filePath);
    const maxBytes = 500 * 1024; // 500 KB limit for preview
    const buffer = Buffer.alloc(Math.min(stat.size, maxBytes));
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, buffer.length, 0);
    fs.closeSync(fd);

    const text = buffer.toString('utf8');
    res.json({
      text,
      isTruncated: stat.size > maxBytes,
      size: stat.size,
      filename: file.originalName || file.name,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read file content' });
  }
});

// 8. Streamed Dynamic ZIP Package Download
app.get('/api/download-zip', async (req, res) => {
  try {
    const ids = req.query.ids ? req.query.ids.split(',') : null;
    const targetFiles = ids ? fileRegistry.filter((f) => ids.includes(f.id)) : fileRegistry;

    if (targetFiles.length === 0) {
      return res.status(400).json({ error: '没有选中的文件可供打包' });
    }

    const archiveName = `DropLAN_Files_${new Date().toISOString().slice(0, 10)}_${Date.now().toString().slice(-4)}.zip`;
    res.attachment(archiveName);
    res.setHeader('Content-Type', 'application/zip');

    const archive = new ZipArchive();
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      if (!res.headersSent) res.status(500).send('Archive error');
    });

    archive.pipe(res);

    for (const file of targetFiles) {
      const filePath = resolveFilePath(file);
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: file.originalName || file.name });
      }
    }

    await archive.finalize();
  } catch (err) {
    console.error('Failed to create zip archive:', err);
    if (!res.headersSent) res.status(500).json({ error: '打包失败' });
  }
});

// 9. Open Download Folder in Windows Explorer
app.post('/api/open-folder', (req, res) => {
  const isWindows = process.platform === 'win32';
  const isMac = process.platform === 'darwin';

  if (isWindows) {
    exec(`explorer.exe "${downloadsDir}"`, (err) => {
      if (err) console.error('Failed to open explorer:', err);
    });
  } else if (isMac) {
    exec(`open "${downloadsDir}"`);
  } else {
    exec(`xdg-open "${downloadsDir}"`);
  }

  res.json({ success: true, path: downloadsDir });
});

// 10. Locate specific file in Windows Explorer
app.post('/api/locate-file', (req, res) => {
  const { id } = req.body;
  const file = fileRegistry.find((f) => f.id === id);
  if (!file) return res.status(404).json({ error: 'File not found' });

  const filePath = resolveFilePath(file);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File on disk missing' });

  const isWindows = process.platform === 'win32';
  const isMac = process.platform === 'darwin';

  if (isWindows) {
    exec(`explorer.exe /select,"${filePath}"`, (err) => {
      if (err) console.error('Failed to locate file:', err);
    });
  } else if (isMac) {
    exec(`open -R "${filePath}"`);
  } else {
    exec(`xdg-open "${downloadsDir}"`);
  }

  res.json({ success: true, filePath });
});

// 11. Delete File Record (and optionally delete file)
app.delete('/api/files/:id', (req, res) => {
  const index = fileRegistry.findIndex((f) => f.id === req.params.id);
  if (index !== -1) {
    const file = fileRegistry[index];
    fileRegistry.splice(index, 1);
    saveMeta();

    const filePath = resolveFilePath(file);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.warn('Could not delete physical file:', e);
      }
    }

    // Also clean up thumbnails or preview caches if any
    try {
      const thumbFile = path.resolve(thumbCacheDir, `${req.params.id}.jpg`);
      if (fs.existsSync(thumbFile)) fs.unlinkSync(thumbFile);
      const prevFile = path.resolve(previewCacheDir, `${req.params.id}.jpg`);
      if (fs.existsSync(prevFile)) fs.unlinkSync(prevFile);
    } catch (_) {}

    broadcast({
      type: 'FILE_DELETED',
      id: req.params.id,
    });
  }
  res.json({ success: true });
});

// 12. Batch Delete Files
app.post('/api/files/batch-delete', (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids array required' });

  for (const id of ids) {
    const index = fileRegistry.findIndex((f) => f.id === id);
    if (index !== -1) {
      const file = fileRegistry[index];
      fileRegistry.splice(index, 1);
      const filePath = resolveFilePath(file);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {}
      }
      try {
        const thumbFile = path.resolve(thumbCacheDir, `${id}.jpg`);
        if (fs.existsSync(thumbFile)) fs.unlinkSync(thumbFile);
        const prevFile = path.resolve(previewCacheDir, `${id}.jpg`);
        if (fs.existsSync(prevFile)) fs.unlinkSync(prevFile);
      } catch (_) {}
    }
  }

  saveMeta();
  broadcast({ type: 'FILES_BATCH_DELETED', ids });
  res.json({ success: true });
});

// 13. Clipboard Sharing API
app.post('/api/clipboard', (req, res) => {
  const { text, senderName, id } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text required' });
  }

  const clipId = id || Math.random().toString(36).substring(2, 10);

  broadcast({
    type: 'CLIPBOARD_RECEIVED',
    id: clipId,
    text,
    senderName: senderName || 'Unknown Device',
    timestamp: Date.now(),
  });

  res.json({ success: true, id: clipId });
});

// Serve frontend dist if available (for production build)
let distDir = path.resolve(projectRoot, 'dist');
if (!fs.existsSync(distDir) && fs.existsSync(path.resolve(__dirname, '../dist'))) {
  distDir = path.resolve(__dirname, '../dist');
}
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(distDir, 'index.html'));
  });
}

// Start Server
const PORT = process.env.PORT || 5200;
server.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP();
  console.log(`\n=================================================`);
  console.log(`🚀 DropLAN Local LAN Transfer Server Running!`);
  console.log(`💻 Local Access:   http://localhost:${PORT}`);
  console.log(`📱 LAN Scan Access: http://${ip}:${PORT}`);
  console.log(`📂 Downloads Path: ${downloadsDir}`);
  console.log(`=================================================\n`);
});

// Self-termination safety: cleanly exit whenever parent process disconnects or terminates
process.on('disconnect', () => {
  try { server.close(); } catch (_) {}
  process.exit(0);
});

process.on('SIGINT', () => {
  try { server.close(); } catch (_) {}
  process.exit(0);
});

process.on('SIGTERM', () => {
  try { server.close(); } catch (_) {}
  process.exit(0);
});
