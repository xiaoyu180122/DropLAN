const { app, BrowserWindow, Tray, Menu, Notification, shell, nativeImage, ipcMain, dialog, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { fork } = require('child_process');


const diagFile = 'C:\\Users\\Lenovo\\droplan_diag.log';
function diagLog(msg) {
  try {
    fs.appendFileSync(diagFile, `[${new Date().toLocaleTimeString()}] [PID ${process.pid}] ${msg}\n`, 'utf8');
  } catch (_) {}
}

diagLog(`Process started. execPath: ${process.execPath}, argv: ${JSON.stringify(process.argv)}`);

process.on('uncaughtException', (err) => {
  diagLog(`UNCAUGHT EXCEPTION: ${err ? (err.stack || err) : 'unknown'}`);
});
process.on('unhandledRejection', (reason) => {
  diagLog(`UNHANDLED REJECTION: ${reason}`);
});
let defaultDownloads = path.join(process.cwd(), 'downloads');
try {
  if (app.isPackaged) {
    defaultDownloads = path.join(app.getPath('downloads'), 'DropLAN');
  }
} catch (e) {}

let downloadsDir = defaultDownloads;

function getEffectiveDownloadsDir() {
  if (global.currentDownloadsDir && typeof global.currentDownloadsDir === 'string') {
    return global.currentDownloadsDir;
  }
  try {
    const cfgPath = path.resolve(app.getPath('userData'), 'config.json');
    if (fs.existsSync(cfgPath)) {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
      if (cfg.downloadsDir && typeof cfg.downloadsDir === 'string') {
        global.currentDownloadsDir = cfg.downloadsDir;
        return cfg.downloadsDir;
      }
    }
  } catch (_) {}
  return downloadsDir;
}

// Initialize downloadsDir from saved config on startup
try {
  downloadsDir = getEffectiveDownloadsDir();
} catch (_) {}

const iconIcoPath = path.resolve(__dirname, '../assets/icon.ico');
const iconPngPath = path.resolve(__dirname, '../assets/icon.png');
const trayIconPath = path.resolve(__dirname, '../assets/tray.png');
const preloadPath = path.resolve(__dirname, 'preload.cjs');

// Crucial for Windows: Set AppUserModelId so Taskbar displays DropLAN's custom icon instead of default Electron atom icon
if (process.platform === 'win32') {
  app.setAppUserModelId('com.droplan.desktop');
}

// Enable smooth hardware acceleration with disabled GPU sandbox for 100% stability on Windows
app.commandLine.appendSwitch('disable-gpu-sandbox');

// Register IPC handlers
ipcMain.handle('copy-to-clipboard', (event, text) => {
  if (typeof text === 'string') {
    clipboard.writeText(text);
    return true;
  }
  return false;
});

ipcMain.handle('select-folder', async () => {
  const current = getEffectiveDownloadsDir();
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '选择 DropLAN 文件接收保存目录',
    defaultPath: current,
    properties: ['openDirectory', 'createDirectory'],
  });
  if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
    const selected = result.filePaths[0];
    downloadsDir = selected;
    global.currentDownloadsDir = selected;
    process.env.DROPLAN_DOWNLOADS_DIR = selected;
    diagLog(`select-folder updated downloadsDir to: ${selected}`);
    return selected;
  }
  return null;
});

ipcMain.handle('show-item-in-folder', (event, filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      shell.showItemInFolder(filePath);
      return true;
    }
  } catch (err) {
    console.error('Failed to show item in folder:', err);
  }
  return false;
});

ipcMain.handle('open-file', async (event, filePath, fileName) => {
  try {
    let target = filePath;
    if (!target || !fs.existsSync(target)) {
      if (fileName && global.currentDownloadsDir) {
        const candidate = path.resolve(global.currentDownloadsDir, fileName);
        if (fs.existsSync(candidate)) target = candidate;
      }
    }
    if (target && fs.existsSync(target)) {
      const errMsg = await shell.openPath(target);
      return !errMsg; // shell.openPath returns an empty string on success
    }
  } catch (err) {
    console.error('Failed to open file with shell.openPath:', err);
  }
  return false;
});

ipcMain.handle('send-notification', (event, options) => {
  try {
    if (Notification.isSupported()) {
      let appIcon = fs.existsSync(iconPngPath) ? nativeImage.createFromPath(iconPngPath) : undefined;
      new Notification({
        title: options?.title || 'DropLAN 跨端快传',
        body: options?.body || '',
        icon: appIcon,
      }).show();
      return true;
    }
  } catch (err) {
    console.error('Failed to send notification:', err);
  }
  return false;
});

ipcMain.handle('get-downloads-dir', () => {
  return getEffectiveDownloadsDir();
});

ipcMain.handle('set-downloads-dir', (event, newPath) => {
  if (newPath && typeof newPath === 'string') {
    if (!fs.existsSync(newPath)) {
      try {
        fs.mkdirSync(newPath, { recursive: true });
      } catch (_) {}
    }
    downloadsDir = newPath;
    global.currentDownloadsDir = newPath;
    process.env.DROPLAN_DOWNLOADS_DIR = newPath;
    diagLog(`set-downloads-dir updated downloadsDir to: ${newPath}`);
    return true;
  }
  return false;
});

ipcMain.handle('open-downloads-folder', () => {
  const targetDir = getEffectiveDownloadsDir();
  if (!fs.existsSync(targetDir)) {
    try {
      fs.mkdirSync(targetDir, { recursive: true });
    } catch (_) {}
  }
  diagLog(`open-downloads-folder invoked: opening ${targetDir}`);
  shell.openPath(targetDir);
  return true;
});

// Window controls for custom title bar
ipcMain.handle('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window:maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('window:close', () => {
  if (mainWindow) {
    mainWindow.hide();
  }
});

ipcMain.handle('window:isMaximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

ipcMain.handle('app:exit', () => {
  terminateAllAndQuit();
});

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
diagLog(`requestSingleInstanceLock result: ${gotTheLock}`);
if (!gotTheLock) {
  diagLog(`Another instance is already running. Quitting this instance.`);
  app.quit();
} else {
  app.on('second-instance', () => {
    diagLog(`second-instance event received! Bringing window to front.`);
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });

  // === Crash & Exit Logging ===
  app.on('before-quit', (e) => diagLog('EVENT: before-quit'));
  app.on('will-quit', (e) => diagLog('EVENT: will-quit'));
  app.on('quit', (e, exitCode) => diagLog(`EVENT: quit, exitCode=${exitCode}`));
  app.on('render-process-gone', (event, webContents, details) => {
    diagLog(`RENDERER CRASHED: reason=${details.reason} exitCode=${details.exitCode}`);
  });
  app.on('child-process-gone', (event, details) => {
    diagLog(`CHILD PROCESS GONE: type=${details.type} reason=${details.reason} exitCode=${details.exitCode}`);
  });

  // CRITICAL: prevent auto-quit when all windows are closed (we want tray mode)
  app.on('window-all-closed', () => {
    diagLog('EVENT: window-all-closed (NOT quitting, tray mode)');
    // Do NOT call app.quit() here — tray keeps running
  });

  app.whenReady().then(() => {
    diagLog(`app.whenReady fired.`);
    createWindow();
    createTray();
    startBackendServer();
    loadAppWithRetry();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      } else if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  });
}

function loadAppWithRetry() {
  const targetUrl = 'http://127.0.0.1:5200';
  let attempts = 0;
  const tryLoad = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    attempts++;
    diagLog(`Attempting to load ${targetUrl} (attempt #${attempts})...`);
    mainWindow.loadURL(targetUrl)
      .then(() => {
        diagLog(`Successfully loaded ${targetUrl} into mainWindow!`);
        mainWindow.show();
        mainWindow.focus();
      })
      .catch((err) => {
        diagLog(`loadURL attempt #${attempts} error: ${err ? err.message : err}`);
        if (attempts < 60) {
          setTimeout(tryLoad, 250);
        }
      });
  };
  tryLoad();
}

function startBackendServer() {
  process.env.PORT = '5200';
  process.env.DROPLAN_DOWNLOADS_DIR = downloadsDir;
  process.env.DROPLAN_USER_DATA = app.getPath('userData');

  let serverScript = path.resolve(__dirname, '../server/dist_server.cjs');
  if (app.isPackaged) {
    const unpackedBundle = path.join(process.resourcesPath, 'app.asar.unpacked', 'server', 'dist_server.cjs');
    if (fs.existsSync(unpackedBundle)) {
      serverScript = unpackedBundle;
    }
  }

  try {
    // Run Express & WebSocket server directly inside Electron's main process for 100% stability and zero child process issues
    require(serverScript);
    diagLog('DropLAN Backend Server successfully loaded and running inside main process.');
  } catch (err) {
    diagLog(`Failed to load serverScript inside main process: ${err ? (err.stack || err) : err}`);
  }
}

function createWindow() {
  const windowIcon = process.platform === 'win32' && fs.existsSync(iconIcoPath) ? iconIcoPath : iconPngPath;
  const notifIcon = fs.existsSync(iconPngPath) ? nativeImage.createFromPath(iconPngPath) : undefined;

  // Track startup state — block hide-to-tray until user has actually seen the window
  let startupComplete = false;

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 980,
    minHeight: 650,
    frame: false,
    backgroundColor: '#09090b',
    title: 'DropLAN - 局域网极速跨端快传',
    icon: windowIcon,
    autoHideMenuBar: true,
    show: false, // Don't show until content is ready
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  if (process.platform === 'win32' && fs.existsSync(iconIcoPath)) {
    mainWindow.setIcon(iconIcoPath);
  }

  mainWindow.once('ready-to-show', () => {
    diagLog('mainWindow ready-to-show fired!');
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    diagLog(`mainWindow did-fail-load: ${errorCode} ${errorDescription} (${validatedURL})`);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    diagLog('mainWindow did-finish-load successfully!');
    // Mark startup as complete after first successful page load
    startupComplete = true;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // Safety net: force-show window after 3 seconds regardless of load state
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      diagLog('Safety-net: force-showing mainWindow after 3s timeout.');
      mainWindow.show();
      mainWindow.focus();
    }
  }, 3000);

  // Intercept close event: minimize to tray instead of quitting
  // BUT only after startup is complete — during startup, block close entirely
  mainWindow.on('close', (event) => {
    diagLog(`mainWindow close event fired. app.isQuitting=${app.isQuitting}, startupComplete=${startupComplete}`);
    if (!app.isQuitting) {
      event.preventDefault();
      if (startupComplete) {
        mainWindow.hide();
        if (Notification.isSupported()) {
          new Notification({
            title: 'DropLAN 已收起至系统托盘',
            body: '局域网快传引擎在后台持续运行，手机端仍可随时扫码或发送文件。',
            icon: notifIcon,
          }).show();
        }
      } else {
        diagLog('Blocked close during startup — keeping window alive.');
      }
      return false;
    }
  });
}

function createTray() {
  try {
    let trayIcon;
    if (fs.existsSync(iconPngPath)) {
      trayIcon = nativeImage.createFromPath(iconPngPath);
    } else if (fs.existsSync(iconIcoPath)) {
      trayIcon = nativeImage.createFromPath(iconIcoPath);
    } else {
      trayIcon = nativeImage.createEmpty();
    }

    tray = new Tray(trayIcon);
    tray.setToolTip('DropLAN - 局域网极速跨端快传 (运行中)');

    const contextMenu = Menu.buildFromTemplate([
      {
        label: '显示 DropLAN 主窗口',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        },
      },
      {
        label: '打开文件接收目录',
        click: () => {
          const targetDir = getEffectiveDownloadsDir();
          if (!fs.existsSync(targetDir)) {
            try {
              fs.mkdirSync(targetDir, { recursive: true });
            } catch (_) {}
          }
          diagLog(`Tray click: opening downloads directory: ${targetDir}`);
          shell.openPath(targetDir);
        },
      },
      { type: 'separator' },
      {
        label: '退出 DropLAN (完全退出)',
        click: () => {
          terminateAllAndQuit();
        },
      },
    ]);

    tray.setContextMenu(contextMenu);
    tray.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.focus();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    });
    tray.on('double-click', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  } catch (err) {
    console.error('Failed to create tray:', err);
  }
}

function terminateAllAndQuit(reason = 'unknown') {
  if (app.isQuitting) return;
  app.isQuitting = true;
  diagLog(`terminateAllAndQuit triggered. Reason: ${reason}`);

  // 1. Destroy tray icon
  if (tray) {
    try { tray.destroy(); } catch (_) {}
    tray = null;
  }

  // 2. Destroy all windows
  try {
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
      try { win.destroy(); } catch (_) {}
    }
    mainWindow = null;
  } catch (_) {}

  // 3. Clean exit of all Electron runtime processes
  app.exit(0);
}

app.on('before-quit', () => {
  terminateAllAndQuit('app.before-quit');
});

app.on('will-quit', () => {
  terminateAllAndQuit('app.will-quit');
});

process.on('SIGINT', () => {
  terminateAllAndQuit('process.SIGINT');
});

process.on('SIGTERM', () => {
  terminateAllAndQuit('process.SIGTERM');
});

app.on('window-all-closed', () => {
  diagLog('app.window-all-closed event fired.');
  if (process.platform !== 'darwin' && app.isQuitting) {
    terminateAllAndQuit('window-all-closed');
  }
});
