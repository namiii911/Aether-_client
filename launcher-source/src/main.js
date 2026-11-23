const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { Client } = require('minecraft-launcher-core');
let win;
function createWindow() {
  win = new BrowserWindow({ width: 1100, height: 720, minWidth: 850, minHeight: 600, backgroundColor: '#070d18', autoHideMenuBar: true, webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false } });
  win.loadFile(path.join(__dirname, 'index.html'));
}
app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
ipcMain.handle('aether:launch', async (_event, settings) => {
  const username = String(settings.username || '').trim();
  if (!/^[A-Za-z0-9_]{3,16}$/.test(username)) throw new Error('Enter a valid offline username (3–16 letters, numbers or underscores).');
  const launcher = new Client();
  launcher.on('debug', m => win?.webContents.send('aether:log', String(m)));
  launcher.on('data', m => win?.webContents.send('aether:log', String(m)));
  launcher.on('progress', (p, s) => win?.webContents.send('aether:progress', { progress: p, status: s }));
  const root = settings.gameDir || path.join(app.getPath('appData'), '.minecraft');
  await launcher.launch({
    authorization: { access_token: '0', client_token: '0', uuid: '00000000-0000-0000-0000-000000000000', name: username, user_properties: '{}' },
    root, version: { number: '1.21.11', type: 'release' },
    memory: { max: String(settings.ram || 4) + 'G', min: '2G' }
  });
  return { ok: true, message: 'Minecraft launch process started.' };
});