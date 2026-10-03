const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getDeviceInfo: () => ipcRenderer.invoke('get-device-info'),
  selectFile: () => ipcRenderer.invoke('select-file'),
  getPendingTeleportFiles: () => ipcRenderer.invoke('get-pending-teleport-files'),
  registerContextMenu: () => ipcRenderer.invoke('register-context-menu'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  readFileBytes: (filePath) => ipcRenderer.invoke('read-file-bytes', filePath),
  onTeleportFileRequested: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('teleport-file-requested', handler);
    return () => ipcRenderer.removeListener('teleport-file-requested', handler);
  }
});
