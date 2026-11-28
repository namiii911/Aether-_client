const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('aether', {
  launch: settings => ipcRenderer.invoke('aether:launch', settings),
  loginMicrosoft: () => ipcRenderer.invoke('aether:login-microsoft'),
  logoutMicrosoft: () => ipcRenderer.invoke('aether:logout-microsoft'),
  accountStatus: () => ipcRenderer.invoke('aether:account-status'),
  socialSignup: data => ipcRenderer.invoke('aether:social-signup', data),
  socialLogin: data => ipcRenderer.invoke('aether:social-login', data),
  socialLogout: () => ipcRenderer.invoke('aether:social-logout'),
  socialState: () => ipcRenderer.invoke('aether:social-state'),
  socialSearch: username => ipcRenderer.invoke('aether:social-search', username),
  socialRequest: username => ipcRenderer.invoke('aether:social-request', username),
  socialRespond: data => ipcRenderer.invoke('aether:social-respond', data),
  socialRemove: id => ipcRenderer.invoke('aether:social-remove', id),
  socialHeartbeat: () => ipcRenderer.invoke('aether:social-heartbeat'),
  socialProfileUpdate: data => ipcRenderer.invoke('aether:social-profile-update', data),
  installFabric: settings => ipcRenderer.invoke('aether:install-fabric', settings),
  searchLibrary: options => ipcRenderer.invoke('aether:library-search', options),
  installLibraryItem: options => ipcRenderer.invoke('aether:library-install', options),
  onLog: callback => ipcRenderer.on('aether:log', (_event, message) => callback(message)),
  onProgress: callback => ipcRenderer.on('aether:progress', (_event, value) => callback(value)),
  onSocialRefresh: callback => ipcRenderer.on('aether:social-refresh', () => callback())
});
