const { contextBridge, ipcRenderer } = require('electron');

// Expose a limited API to the renderer process
contextBridge.exposeInMainWorld('electron', {
  startBrowser: () => ipcRenderer.send('start-browser')
});