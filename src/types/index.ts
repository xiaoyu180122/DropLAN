export interface FileInfo {
  id: string;
  name: string;
  originalName: string;
  size: number;
  mimetype: string;
  sender: 'desktop' | 'mobile';
  senderName: string;
  timestamp: number;
  path?: string;
}

export interface ConnectedDevice {
  id: string;
  ip: string;
  deviceType: 'desktop' | 'mobile' | 'Unknown';
  deviceName: string;
  connectedAt: number;
}

export interface NetworkInterface {
  name: string;
  address: string;
  type: 'wifi' | 'ethernet' | 'virtual' | 'other';
  score: number;
  isRecommended: boolean;
}

export interface AppConfig {
  downloadsDir: string;
  autoClipboard: boolean;
  notifyOnReceive: boolean;
  soundEnabled: boolean;
  selectedIp?: string | null;
}

export interface SystemInfo {
  ip: string;
  interfaces?: NetworkInterface[];
  port: number;
  url: string;
  hostname: string;
  downloadsDir: string;
  devices: ConnectedDevice[];
  config?: AppConfig;
}

export interface ClipboardItem {
  id: string;
  text: string;
  senderName: string;
  timestamp: number;
}

export interface ElectronAPI {
  isElectron: boolean;
  copyToClipboard: (text: string) => Promise<boolean>;
  selectFolder: () => Promise<string | null>;
  showItemInFolder: (filePath: string) => Promise<boolean>;
  openFile?: (filePath: string) => Promise<boolean>;
  sendNotification: (options: { title: string; body: string }) => Promise<boolean>;
  getDownloadsDir: () => Promise<string>;
  setDownloadsDir: (newPath: string) => Promise<boolean>;
  openDownloadsFolder: () => Promise<boolean>;
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
  exitApp: () => Promise<void>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
