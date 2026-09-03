const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  showItemInFolder: (filePath) => ipcRenderer.invoke('show-item-in-folder', filePath),
  openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),
  sendNotification: (options) => ipcRenderer.invoke('send-notification', options),
  getDownloadsDir: () => ipcRenderer.invoke('get-downloads-dir'),
  setDownloadsDir: (newPath) => ipcRenderer.invoke('set-downloads-dir', newPath),
  openDownloadsFolder: () => ipcRenderer.invoke('open-downloads-folder'),
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  exitApp: () => ipcRenderer.invoke('app:exit'),
});
