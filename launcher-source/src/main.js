const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');
const { Client } = require('minecraft-launcher-core');

const MINECRAFT_VERSION = '1.21.11';
let win;

function sendLog(message) {
  win?.webContents.send('aether:log', String(message));
}

function createWindow() {
  win = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 850,
    minHeight: 600,
    backgroundColor: '#070d18',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.loadFile(path.join(__dirname, 'index.html'));
}

function runProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true, ...options });
    let stderr = '';
    child.stdout?.on('data', data => sendLog(data.toString().trim()));
    child.stderr?.on('data', data => {
      const message = data.toString().trim();
      stderr += message + '\n';
      if (message) sendLog(message);
    });
    child.once('error', reject);
    child.once('close', code => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `${command} exited with code ${code}`));
    });
  });
}

async function getJavaVersion() {
  await runProcess('java', ['-version']);
}

async function installFabric(root) {
  sendLog('Checking Java runtime...');
  try {
    await getJavaVersion();
  } catch {
    throw new Error('Java was not found. Install Java 21 (64-bit), then restart AETHER. Automatic Java setup is not included yet.');
  }

  sendLog('Getting the official Fabric installer...');
  const versionsResponse = await fetch('https://meta.fabricmc.net/v2/versions/installer');
  if (!versionsResponse.ok) throw new Error('Could not retrieve Fabric installer metadata.');
  const installers = await versionsResponse.json();
  const installer = installers.find(item => item.url && /^https:\/\/maven\.fabricmc\.net\//.test(item.url));
  if (!installer) throw new Error('Fabric did not return a trusted installer download.');

  const tempJar = path.join(app.getPath('temp'), `aether-fabric-installer-${installer.version}.jar`);
  if (!fs.existsSync(tempJar)) {
    const download = await fetch(installer.url);
    if (!download.ok) throw new Error('Fabric installer download failed.');
    fs.writeFileSync(tempJar, Buffer.from(await download.arrayBuffer()));
  }

  sendLog(`Installing Fabric for Minecraft ${MINECRAFT_VERSION}...`);
  await runProcess('java', [
    '-jar', tempJar, 'client',
    '-dir', root,
    '-mcversion', MINECRAFT_VERSION,
    '-loader', 'latest'
  ]);

  const versionsDir = path.join(root, 'versions');
  const installed = fs.readdirSync(versionsDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && entry.name.startsWith(`fabric-loader-`) && entry.name.endsWith(`-${MINECRAFT_VERSION}`))
    .map(entry => entry.name)
    .sort()
    .pop();

  if (!installed || !fs.existsSync(path.join(versionsDir, installed, `${installed}.json`))) {
    throw new Error('Fabric installer finished, but its launch profile was not found.');
  }
  sendLog(`Fabric installed: ${installed}`);
  return installed;
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('aether:install-fabric', async (_event, settings = {}) => {
  const root = settings.gameDir || path.join(app.getPath('appData'), '.minecraft');
  fs.mkdirSync(root, { recursive: true });
  return { ok: true, profile: await installFabric(root) };
});

ipcMain.handle('aether:launch', async (_event, settings = {}) => {
  const accountType = settings.accountType || 'local';
  const username = String(settings.username || '').trim();
  if (accountType !== 'local') {
    throw new Error('Microsoft sign-in is not configured yet. AETHER will not pretend a local account is a premium account.');
  }
  if (!/^[A-Za-z0-9_]{3,16}$/.test(username)) {
    throw new Error('Enter a valid local username (3–16 letters, numbers or underscores).');
  }

  const root = settings.gameDir || path.join(app.getPath('appData'), '.minecraft');
  const launcher = new Client();
  launcher.on('debug', message => sendLog(message));
  launcher.on('data', message => sendLog(message));
  launcher.on('progress', (progress, status) => {
    win?.webContents.send('aether:progress', { progress, status });
  });

  let profile = MINECRAFT_VERSION;
  if (settings.profile === 'fabric') {
    const versionsDir = path.join(root, 'versions');
    const installedProfiles = fs.existsSync(versionsDir)
      ? fs.readdirSync(versionsDir, { withFileTypes: true })
          .filter(entry => entry.isDirectory() && entry.name.startsWith('fabric-loader-') && entry.name.endsWith(`-${MINECRAFT_VERSION}`))
          .map(entry => entry.name)
          .filter(name => fs.existsSync(path.join(versionsDir, name, `${name}.json`)))
          .sort()
      : [];
    profile = installedProfiles[installedProfiles.length - 1];
    if (!profile) throw new Error('Fabric is not installed yet. Click INSTALL FABRIC first.');
  }

  await launcher.launch({
    authorization: {
      access_token: '0',
      client_token: '0',
      uuid: '00000000-0000-0000-0000-000000000000',
      name: username,
      user_properties: '{}'
    },
    root,
    version: settings.profile === 'fabric'
      ? { number: MINECRAFT_VERSION, type: 'release', custom: profile }
      : { number: MINECRAFT_VERSION, type: 'release' },
    memory: { max: String(settings.ram || 4) + 'G', min: '2G' }
  });
  return { ok: true, message: `${settings.profile === 'fabric' ? 'Fabric' : 'Minecraft'} launch process started.` };
});
