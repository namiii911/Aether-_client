const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("aether", {
  version: () => ipcRenderer.invoke("aether:version"),
  openExternal: (url) => ipcRenderer.invoke("aether:open-external", url)
});
