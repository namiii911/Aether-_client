const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('aether', {
  launch: settings => ipcRenderer.invoke('aether:launch', settings),
  installFabric: settings => ipcRenderer.invoke('aether:install-fabric', settings),
  onLog: callback => ipcRenderer.on('aether:log', (_event, message) => callback(message)),
  onProgress: callback => ipcRenderer.on('aether:progress', (_event, value) => callback(value))
});
