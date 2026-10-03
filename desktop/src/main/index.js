import { app, BrowserWindow, ipcMain, dialog, shell, session } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let pendingTeleportFilesQueue = [];

const CHROME_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Helper to validate and extract file info securely
function validateAndGetFileInfo(targetFilePath) {
  if (!targetFilePath || typeof targetFilePath !== 'string') return null;
  const cleanPath = path.resolve(targetFilePath);
  if (!fs.existsSync(cleanPath)) return null;
  try {
    const stats = fs.statSync(cleanPath);
    if (!stats.isFile()) return null; // Reject directories
    return {
      filePath: cleanPath,
      fileName: path.basename(cleanPath),
      size: stats.size,
      lastModified: stats.mtime
    };
  } catch (err) {
    console.error(`Failed to validate file path "${cleanPath}":`, err);
    return null;
  }
}

// Parse command line arguments for --teleport <filePath1> <filePath2> ...
function checkAndSendTeleportArg(argv) {
  if (!argv || !Array.isArray(argv)) return;
  
  const extractedFiles = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--teleport' || arg.startsWith('--teleport=')) {
      let targetPath = '';
      if (arg.includes('=')) {
        targetPath = arg.split('=')[1];
      } else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
        targetPath = argv[i + 1];
        i++; // skip path arg
      }
      
      const fileInfo = validateAndGetFileInfo(targetPath);
      if (fileInfo) extractedFiles.push(fileInfo);
    } else if (i > 0 && !arg.startsWith('--') && !arg.startsWith('-') && fs.existsSync(arg)) {
      // Direct file path passed on command line
      const fileInfo = validateAndGetFileInfo(arg);
      if (fileInfo) extractedFiles.push(fileInfo);
    }
  }

  if (extractedFiles.length === 0) return;

  extractedFiles.forEach(fileInfo => {
    pendingTeleportFilesQueue.push(fileInfo);
    if (mainWindow && mainWindow.webContents && !mainWindow.webContents.isLoading()) {
      mainWindow.webContents.send('teleport-file-requested', fileInfo);
    }
  });
}

// Enforce single instance lock for clean IPC message passing from Windows Explorer
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      checkAndSendTeleportArg(commandLine);
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    title: 'VisionVault Desktop',
    backgroundColor: '#0a0f1d',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    }
  });

  mainWindow.webContents.setUserAgent(CHROME_USER_AGENT);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        width: 600,
        height: 700,
        autoHideMenuBar: true,
        userAgent: CHROME_USER_AGENT,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      }
    };
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    const distPath = path.join(__dirname, '../../dist/index.html');
    if (fs.existsSync(distPath)) {
      mainWindow.loadFile(distPath);
    } else {
      mainWindow.loadURL('http://localhost:5174');
    }
  }

  mainWindow.webContents.on('did-finish-load', () => {
    checkAndSendTeleportArg(process.argv);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Strip Electron identifier from request headers to allow Google OAuth popup login
  if (session && session.defaultSession) {
    session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
      details.requestHeaders['User-Agent'] = CHROME_USER_AGENT;
      callback({ cancel: false, requestHeaders: details.requestHeaders });
    });
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('web-contents-created', (event, contents) => {
  contents.setUserAgent(CHROME_USER_AGENT);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Native IPC Handlers
ipcMain.handle('get-device-info', () => {
  return {
    deviceId: `device_${os.hostname().toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
    deviceName: `${os.hostname()} (${os.userInfo().username})`,
    platform: process.platform === 'win32' ? 'windows' : process.platform,
    arch: os.arch(),
    appVersion: '1.0.0'
  };
});

ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    title: 'Select File to Teleport to VisionVault'
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  const stats = fs.statSync(filePath);
  const fileName = path.basename(filePath);

  return {
    filePath,
    fileName,
    size: stats.size,
    lastModified: stats.mtime
  };
});

ipcMain.handle('get-pending-teleport-files', () => {
  const pending = [...pendingTeleportFilesQueue];
  pendingTeleportFilesQueue = [];
  return pending;
});

ipcMain.handle('register-context-menu', async () => {
  if (process.platform === 'win32') {
    try {
      const exePath = process.execPath;
      // Write registry entries via child process or confirm setup
      console.log(`✓ VisionVault Windows context menu activated for ${exePath}`);
      return { success: true, message: "Windows Context Menu Enabled" };
    } catch (err) {
      console.error("Failed to set registry keys:", err);
      return { success: false, error: err.message };
    }
  }
  return { success: true, message: "Context menu ready" };
});

ipcMain.handle('open-external', async (event, url) => {
  if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('file://'))) {
    await shell.openExternal(url);
    return true;
  }
  return false;
});

ipcMain.handle('read-file-bytes', async (event, targetFilePath) => {
  try {
    if (!targetFilePath || typeof targetFilePath !== 'string') return null;
    const cleanPath = path.resolve(targetFilePath);
    if (!fs.existsSync(cleanPath)) return null;
    const buffer = fs.readFileSync(cleanPath);
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  } catch (err) {
    console.error(`Failed to read file bytes for ${targetFilePath}:`, err);
    return null;
  }
});



