const { app, BrowserWindow, ipcMain, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { Client } = require('minecraft-launcher-core');
const { Auth } = require('msmc');

const MINECRAFT_VERSION = '1.21.11';
const JAVA_MAJOR = 21;
let win;
let cachedMicrosoftXbox = null;
const microsoftTokenPath = () => path.join(app.getPath('userData'), 'microsoft-account.dat');

function saveMicrosoftRefreshToken(refreshToken) {
  if (!safeStorage.isEncryptionAvailable()) throw new Error('Secure credential storage is unavailable on this Windows account.');
  fs.mkdirSync(path.dirname(microsoftTokenPath()), { recursive: true });
  fs.writeFileSync(microsoftTokenPath(), safeStorage.encryptString(refreshToken));
}

async function getMicrosoftXbox() {
  if (cachedMicrosoftXbox && cachedMicrosoftXbox.validate()) return cachedMicrosoftXbox;
  const file = microsoftTokenPath();
  if (!fs.existsSync(file)) throw new Error('Sign in with your Microsoft account first.');
  if (!safeStorage.isEncryptionAvailable()) throw new Error('Secure credential storage is unavailable on this Windows account.');
  const refreshToken = safeStorage.decryptString(fs.readFileSync(file));
  const auth = new Auth('select_account');
  cachedMicrosoftXbox = await auth.refresh(refreshToken);
  const updated = cachedMicrosoftXbox.msToken?.refresh_token;
  if (updated) saveMicrosoftRefreshToken(updated);
  return cachedMicrosoftXbox;
}

async function getMicrosoftAuthorization() {
  const xbox = await getMicrosoftXbox();
  const minecraft = await xbox.getMinecraft();
  const entitlements = await minecraft.entitlements();
  if (!entitlements.includes('game_minecraft') && !entitlements.includes('product_minecraft')) {
    throw new Error('This Microsoft account does not appear to own Minecraft Java Edition.');
  }
  return minecraft.mclc();
}

function sendLog(message) {
  win?.webContents.send('aether:log', String(message));
}

function createWindow() {
  win = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 850,
    minHeight: 620,
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
    let output = '';
    child.stdout?.on('data', data => {
      const message = data.toString().trim();
      output += message + '\n';
      if (message) sendLog(message);
    });
    child.stderr?.on('data', data => {
      const message = data.toString().trim();
      output += message + '\n';
      if (message) sendLog(message);
    });
    child.once('error', reject);
    child.once('close', code => {
      if (code === 0) resolve(output.trim());
      else reject(new Error(output.trim() || `${command} exited with code ${code}`));
    });
  });
}

function offlineUuid(username) {
  const bytes = crypto.createHash('md5').update(`OfflinePlayer:${username}`).digest();
  bytes[6] = (bytes[6] & 0x0f) | 0x30;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

function findJava(root) {
  if (!fs.existsSync(root)) return null;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const candidate = path.join(root, entry.name, 'bin', 'java.exe');
    if (entry.isDirectory() && fs.existsSync(candidate)) return candidate;
  }
  return null;
}

async function resolveJava(customPath) {
  if (customPath && String(customPath).trim()) {
    const selected = path.resolve(String(customPath).trim().replace(/^"|"$/g, ''));
    if (!fs.existsSync(selected) || !fs.statSync(selected).isFile()) {
      throw new Error('The custom Java path does not point to a file. Select java.exe or clear the custom path.');
    }
    await runProcess(selected, ['-version']);
    return selected;
  }

  if (process.platform !== 'win32' || process.arch !== 'x64') {
    throw new Error('Automatic Java 21 setup currently supports Windows 64-bit only. Set a valid Java executable path to continue.');
  }

  const runtimeRoot = path.join(app.getPath('userData'), 'runtime', 'temurin-21');
  const installedJava = findJava(runtimeRoot);
  if (installedJava) return installedJava;

  sendLog('Java 21 was not found. Downloading Eclipse Temurin JRE 21...');
  const metadataUrl = 'https://api.adoptium.net/v3/assets/latest/21/hotspot?architecture=x64&image_type=jre&os=windows&vendor=eclipse';
  const metadataResponse = await fetch(metadataUrl);
  if (!metadataResponse.ok) throw new Error('Could not retrieve Java 21 download information from Eclipse Adoptium.');
  const metadata = await metadataResponse.json();
  const binary = metadata[0]?.binary?.package;
  if (!binary?.link || !binary?.checksum) throw new Error('Eclipse Adoptium did not provide a verifiable Java package.');

  const runtimeDir = path.dirname(runtimeRoot);
  const zipPath = path.join(runtimeDir, 'temurin-21.zip');
  fs.mkdirSync(runtimeDir, { recursive: true });
  sendLog('Downloading Java 21 runtime. This is a one-time setup...');
  const downloadResponse = await fetch(binary.link);
  if (!downloadResponse.ok) throw new Error('Java 21 download failed.');
  const archive = Buffer.from(await downloadResponse.arrayBuffer());
  const actualHash = crypto.createHash('sha256').update(archive).digest('hex');
  if (actualHash.toLowerCase() !== binary.checksum.toLowerCase()) {
    throw new Error('Java runtime checksum verification failed. The download was discarded.');
  }
  fs.writeFileSync(zipPath, archive);

  const extractDir = path.join(runtimeDir, 'temurin-21-extract');
  fs.rmSync(extractDir, { recursive: true, force: true });
  fs.mkdirSync(extractDir, { recursive: true });
  const quote = value => String(value).replace(/'/g, "''");
  sendLog('Verifying and extracting Java 21...');
  await runProcess('powershell.exe', [
    '-NoProfile', '-NonInteractive', '-Command',
    `Expand-Archive -LiteralPath '${quote(zipPath)}' -DestinationPath '${quote(extractDir)}' -Force`
  ]);
  const javaPath = findJava(extractDir);
  if (!javaPath) throw new Error('Java downloaded, but java.exe was not found in the archive.');
  fs.rmSync(runtimeRoot, { recursive: true, force: true });
  fs.renameSync(extractDir, runtimeRoot);
  fs.rmSync(zipPath, { force: true });
  const finalJava = findJava(runtimeRoot);
  if (!finalJava) throw new Error('Java 21 installation did not complete correctly.');
  await runProcess(finalJava, ['-version']);
  sendLog('Java 21 is ready.');
  return finalJava;
}

async function installFabric(root, javaPath) {
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
  await runProcess(javaPath, [
    '-jar', tempJar, 'client',
    '-dir', root,
    '-mcversion', MINECRAFT_VERSION,
    '-loader', 'latest'
  ]);

  const versionsDir = path.join(root, 'versions');
  const installed = fs.readdirSync(versionsDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && entry.name.startsWith('fabric-loader-') && entry.name.endsWith(`-${MINECRAFT_VERSION}`))
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

ipcMain.handle('aether:login-microsoft', async () => {
  if (!safeStorage.isEncryptionAvailable()) throw new Error('Secure credential storage is unavailable. AETHER cannot safely save Microsoft credentials on this device.');
  sendLog('Opening Microsoft sign-in...');
  const auth = new Auth('select_account');
  auth.on('load', (_asset, message) => sendLog(message));
  const xbox = await auth.launch('electron', { width: 600, height: 720, resizable: true });
  const minecraft = await xbox.getMinecraft();
  const entitlements = await minecraft.entitlements();
  if (!entitlements.includes('game_minecraft') && !entitlements.includes('product_minecraft')) {
    throw new Error('Microsoft sign-in worked, but this account does not appear to own Minecraft Java Edition.');
  }
  const refreshToken = xbox.msToken?.refresh_token;
  if (!refreshToken) throw new Error('Microsoft did not return a refresh token. Please try signing in again.');
  saveMicrosoftRefreshToken(refreshToken);
  cachedMicrosoftXbox = xbox;
  sendLog('Microsoft account verified: ' + minecraft.profile.name);
  return { ok: true, username: minecraft.profile.name };
});

ipcMain.handle('aether:logout-microsoft', async () => {
  cachedMicrosoftXbox = null;
  fs.rmSync(microsoftTokenPath(), { force: true });
  return { ok: true };
});

ipcMain.handle('aether:account-status', async () => ({ signedIn: fs.existsSync(microsoftTokenPath()) }));

ipcMain.handle('aether:install-fabric', async (_event, settings = {}) => {
  const root = settings.gameDir ? path.resolve(settings.gameDir) : path.join(app.getPath('appData'), '.minecraft');
  fs.mkdirSync(root, { recursive: true });
  sendLog('Preparing Java 21...');
  const javaPath = await resolveJava(settings.javaPath);
  return { ok: true, profile: await installFabric(root, javaPath) };
});

ipcMain.handle('aether:launch', async (_event, settings = {}) => {
  const accountType = settings.accountType || 'local';
  const username = String(settings.username || '').trim();
  if (!['local', 'microsoft'].includes(accountType)) throw new Error('Choose a supported account type.');
  if (accountType === 'local' && !/^[A-Za-z0-9_]{3,16}$/.test(username)) {
    throw new Error('Enter a valid local username (3–16 letters, numbers or underscores).');
  }

  const ram = Number(settings.ram || 4);
  if (![2, 4, 6, 8, 12, 16].includes(ram)) throw new Error('Choose a supported RAM limit.');
  const root = settings.gameDir ? path.resolve(settings.gameDir) : path.join(app.getPath('appData'), '.minecraft');
  fs.mkdirSync(root, { recursive: true });
  sendLog('Preparing Java 21...');
  const javaPath = await resolveJava(settings.javaPath);
  const authorization = accountType === 'microsoft'
    ? await getMicrosoftAuthorization()
    : {
        access_token: '0',
        client_token: '0',
        uuid: offlineUuid(username),
        name: username,
        user_properties: '{}',
        meta: { type: 'mojang', demo: false }
      };
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
    authorization,
    root,
    javaPath,
    version: settings.profile === 'fabric'
      ? { number: MINECRAFT_VERSION, type: 'release', custom: profile }
      : { number: MINECRAFT_VERSION, type: 'release' },
    memory: { max: `${ram}G`, min: '2G' }
  });
  return { ok: true, message: `${settings.profile === 'fabric' ? 'Fabric' : 'Minecraft'} launch process started.` };
});
