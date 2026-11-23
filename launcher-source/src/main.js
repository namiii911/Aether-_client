const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { spawnSync } = require('child_process');
const { Client } = require('minecraft-launcher-core');

let win;
let launching = false;
let installingFabric = false;

function send(channel, payload) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

function checkJava() {
  const result = spawnSync('java', ['-version'], { encoding: 'utf8', windowsHide: true, timeout: 5000 });
  if (result.error || result.status !== 0) return { available: false, major: null, version: null, message: 'Java was not found. Install Java 21 for Minecraft 1.21.x.' };
  const output = String(result.stderr || '') + '\n' + String(result.stdout || '');
  const match = output.match(/version\s+"(?:1\.)?(\d+)/i) || output.match(/openjdk\s+(\d+)/i);
  const major = match ? Number(match[1]) : null;
  return { available: Number.isInteger(major), major, version: output.trim().split('\n')[0] || 'Java detected', message: Number.isInteger(major) ? 'Java ' + major + ' detected.' : 'Java version could not be identified.' };
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'AETHER-CLIENT/1.4.2' } }, response => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) return getJson(response.headers.location).then(resolve, reject);
      if (response.statusCode !== 200) return reject(new Error('Download request failed (' + response.statusCode + ').'));
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => body += chunk);
      response.on('end', () => { try { resolve(JSON.parse(body)); } catch (_) { reject(new Error('Invalid response from Fabric metadata.')); } });
    }).on('error', reject);
  });
}

function downloadFile(url, destination) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destination);
    https.get(url, { headers: { 'User-Agent': 'AETHER-CLIENT/1.4.2' } }, response => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        file.close(); fs.rmSync(destination, { force: true });
        return downloadFile(response.headers.location, destination).then(resolve, reject);
      }
      if (response.statusCode !== 200) { file.close(); fs.rmSync(destination, { force: true }); return reject(new Error('Fabric installer download failed (' + response.statusCode + ').')); }
      response.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', error => { file.close(); fs.rmSync(destination, { force: true }); reject(error); });
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: 1180, height: 780, minWidth: 900, minHeight: 650,
    backgroundColor: '#070913', autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  win.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(createWindow);
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

ipcMain.handle('aether:check-java', () => checkJava());
ipcMain.handle('aether:choose-directory', async () => {
  const result = await dialog.showOpenDialog(win, { title: 'Choose Minecraft game folder', properties: ['openDirectory', 'createDirectory'] });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('aether:install-fabric', async (_event, settings = {}) => {
  if (installingFabric || launching) throw new Error('Wait until the current operation finishes.');
  const mcVersion = String(settings.version || '1.21.11');
  if (!/^1\.\d+(\.\d+)?$/.test(mcVersion)) throw new Error('Invalid Minecraft version.');
  const root = path.resolve(String(settings.gameDir || path.join(app.getPath('appData'), '.minecraft')));
  const java = checkJava();
  const requiredJava = mcVersion === '1.20.1' ? 17 : 21;
  if (!java.available || java.major < requiredJava) throw new Error('Fabric for Minecraft ' + mcVersion + ' requires Java ' + requiredJava + '. ' + java.message);
  installingFabric = true;
  send('aether:install-state', true);
  try {
    fs.mkdirSync(root, { recursive: true });
    send('aether:status', 'Checking Fabric support for Minecraft ' + mcVersion + '…');
    const loaders = await getJson('https://meta.fabricmc.net/v2/versions/loader/' + encodeURIComponent(mcVersion));
    if (!Array.isArray(loaders) || !loaders.length) throw new Error('Fabric does not currently list a loader for Minecraft ' + mcVersion + '. Try another game version.');
    const loaderVersion = loaders[0].loader.version;
    const installerMeta = await getJson('https://meta.fabricmc.net/v2/versions/installer');
    const installerVersion = installerMeta.find(item => item.stable) || installerMeta[0];
    if (!installerVersion || !installerVersion.version) throw new Error('Could not find a Fabric installer release.');
    const installerUrl = 'https://maven.fabricmc.net/net/fabricmc/fabric-installer/' + installerVersion.version + '/fabric-installer-' + installerVersion.version + '.jar';
    const installerPath = path.join(app.getPath('userData'), 'fabric-installer-' + installerVersion.version + '.jar');
    fs.mkdirSync(path.dirname(installerPath), { recursive: true });
    send('aether:status', 'Downloading Fabric installer ' + installerVersion.version + '…');
    await downloadFile(installerUrl, installerPath);
    send('aether:status', 'Installing Fabric Loader ' + loaderVersion + '…');
    const result = spawnSync('java', ['-jar', installerPath, 'client', '-dir', root, '-mcversion', mcVersion, '-loader', loaderVersion], { encoding: 'utf8', windowsHide: true, timeout: 180000, maxBuffer: 4 * 1024 * 1024 });
    const output = String(result.stdout || '') + '\n' + String(result.stderr || '');
    if (output.trim()) send('aether:log', output.trim());
    if (result.error) throw new Error(result.error.message);
    if (result.status !== 0) throw new Error('Fabric installer failed. ' + (output.trim().slice(-1200) || 'Exit code ' + result.status));
    const profile = 'fabric-loader-' + loaderVersion + '-' + mcVersion;
    send('aether:status', 'Fabric installed: ' + profile);
    return { ok: true, profile, loaderVersion, message: 'Fabric Loader ' + loaderVersion + ' installed for Minecraft ' + mcVersion + '.' };
  } finally {
    installingFabric = false;
    send('aether:install-state', false);
  }
});

ipcMain.handle('aether:launch', async (_event, settings = {}) => {
  if (launching || installingFabric) throw new Error('Wait until the current operation finishes.');
  const username = String(settings.username || '').trim();
  if (!/^[A-Za-z0-9_]{3,16}$/.test(username)) throw new Error('Enter a valid offline username (3–16 letters, numbers or underscores).');
  const allowedVersions = ['1.21.11', '1.21.10', '1.21.8', '1.21.5', '1.20.1'];
  const version = allowedVersions.includes(String(settings.version)) ? String(settings.version) : '1.21.11';
  const useFabric = settings.loader === 'fabric';
  const java = checkJava();
  const requiredJava = version === '1.20.1' ? 17 : 21;
  if (!java.available || java.major < requiredJava) throw new Error('Minecraft ' + version + ' requires Java ' + requiredJava + ' or newer. ' + java.message);
  const ram = [2, 4, 6, 8].includes(Number(settings.ram)) ? Number(settings.ram) : 4;
  const root = path.resolve(String(settings.gameDir || path.join(app.getPath('appData'), '.minecraft')));
  fs.mkdirSync(root, { recursive: true });
  let versionNumber = version;
  if (useFabric) {
    const versionsDir = path.join(root, 'versions');
    const candidates = fs.existsSync(versionsDir) ? fs.readdirSync(versionsDir).filter(name => name.startsWith('fabric-loader-') && name.endsWith('-' + version)) : [];
    if (!candidates.length) throw new Error('Fabric is not installed for Minecraft ' + version + ' yet. Press INSTALL FABRIC first.');
    versionNumber = candidates.sort().slice(-1)[0];
  }
  launching = true;
  send('aether:launch-state', true);
  send('aether:status', 'Preparing ' + (useFabric ? 'Fabric ' : 'Minecraft ') + version + '…');
  const launcher = new Client();
  launcher.on('debug', message => send('aether:log', String(message)));
  launcher.on('data', message => send('aether:log', String(message)));
  launcher.on('progress', (progress, status) => send('aether:progress', { progress, status }));
  launcher.on('close', code => { launching = false; send('aether:status', 'Minecraft closed (exit code ' + code + ').'); send('aether:launch-state', false); });
  try {
    await launcher.launch({
      authorization: { access_token: '0', client_token: '0', uuid: '00000000-0000-0000-0000-000000000000', name: username, user_properties: '{}' },
      root, version: { number: versionNumber, type: 'release' }, memory: { max: ram + 'G', min: '2G' }
    });
    send('aether:status', 'Launch process started. Check the game window.');
    return { ok: true, message: 'Launch process started.' };
  } catch (error) {
    launching = false; send('aether:launch-state', false);
    throw new Error(error && error.message ? error.message : String(error));
  }
});
