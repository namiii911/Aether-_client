const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('aether', {
  launch: settings => ipcRenderer.invoke('aether:launch', settings),
  microsoftLogin: () => ipcRenderer.invoke('aether:microsoft-login'),
  openGameFolder: gameDir => ipcRenderer.invoke('aether:open-game-folder', gameDir),
  openModsFolder: gameDir => ipcRenderer.invoke('aether:open-mods-folder', gameDir),
  onDeviceCode: callback => ipcRenderer.on('aether:device-code', (_event, value) => callback(value)),
  onLog: callback => ipcRenderer.on('aether:log', (_event, message) => callback(message)),
  onProgress: callback => ipcRenderer.on('aether:progress', (_event, value) => callback(value))
});