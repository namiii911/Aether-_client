const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { Client } = require('minecraft-launcher-core');

let win;
let launching = false;

function send(channel, payload) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

function createWindow() {
  win = new BrowserWindow({
    width: 1180, height: 780, minWidth: 900, minHeight: 650,
    backgroundColor: '#070913', autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: true
    }
  });
  win.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(createWindow);
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

ipcMain.handle('aether:choose-directory', async () => {
  const result = await dialog.showOpenDialog(win, { title: 'Choose Minecraft game folder', properties: ['openDirectory', 'createDirectory'] });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('aether:launch', async (_event, settings = {}) => {
  if (launching) throw new Error('Minecraft is already starting. Please wait.');
  const username = String(settings.username || '').trim();
  if (!/^[A-Za-z0-9_]{3,16}$/.test(username)) {
    throw new Error('Enter a valid offline username (3–16 letters, numbers or underscores).');
  }

  const allowedVersions = ['1.21.11', '1.21.10', '1.21.8', '1.21.5', '1.20.1'];
  const version = allowedVersions.includes(String(settings.version)) ? String(settings.version) : '1.21.11';
  const ram = [2, 4, 6, 8].includes(Number(settings.ram)) ? Number(settings.ram) : 4;
  const defaultRoot = path.join(app.getPath('appData'), '.minecraft');
  const root = path.resolve(String(settings.gameDir || defaultRoot));
  try { fs.mkdirSync(root, { recursive: true }); } catch (error) { throw new Error('Cannot create game directory: ' + error.message); }

  launching = true;
  send('aether:status', 'Preparing Minecraft ' + version + '…');
  const launcher = new Client();
  launcher.on('debug', message => send('aether:log', String(message)));
  launcher.on('data', message => send('aether:log', String(message)));
  launcher.on('progress', (progress, status) => send('aether:progress', { progress, status }));
  launcher.on('close', code => {
    launching = false;
    send('aether:status', 'Minecraft closed (exit code ' + code + ').');
    send('aether:launch-state', false);
  });

  try {
    await launcher.launch({
      authorization: {
        access_token: '0', client_token: '0',
        uuid: '00000000-0000-0000-0000-000000000000',
        name: username, user_properties: '{}'
      },
      root,
      version: { number: version, type: 'release' },
      memory: { max: ram + 'G', min: '2G' }
    });
    send('aether:status', 'Launch process started. Check the game window.');
    return { ok: true, message: 'Launch process started.' };
  } catch (error) {
    launching = false;
    send('aether:launch-state', false);
    throw new Error(error && error.message ? error.message : String(error));
  }
});
