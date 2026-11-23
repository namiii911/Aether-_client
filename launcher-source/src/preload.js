const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('aether', {
  launch: settings => ipcRenderer.invoke('aether:launch', settings),
  chooseDirectory: () => ipcRenderer.invoke('aether:choose-directory'),
  onLog: callback => {
    const listener = (_event, message) => callback(message);
    ipcRenderer.on('aether:log', listener);
    return () => ipcRenderer.removeListener('aether:log', listener);
  },
  onProgress: callback => {
    const listener = (_event, value) => callback(value);
    ipcRenderer.on('aether:progress', listener);
    return () => ipcRenderer.removeListener('aether:progress', listener);
  },
  onStatus: callback => {
    const listener = (_event, value) => callback(value);
    ipcRenderer.on('aether:status', listener);
    return () => ipcRenderer.removeListener('aether:status', listener);
  },
  onLaunchState: callback => {
    const listener = (_event, value) => callback(value);
    ipcRenderer.on('aether:launch-state', listener);
    return () => ipcRenderer.removeListener('aether:launch-state', listener);
  }
});
