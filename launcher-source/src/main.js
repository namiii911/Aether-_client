const { app, BrowserWindow, ipcMain, shell, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');
const { Client } = require('minecraft-launcher-core');
let win;
let premiumSession = null;
let CLIENT_ID = process.env.AETHER_MICROSOFT_CLIENT_ID || '';
try { CLIENT_ID = CLIENT_ID || require('./auth-config.json').microsoftClientId || ''; } catch {}
const authFile = () => path.join(app.getPath('userData'), 'account.dat');
function createWindow() {
  win = new BrowserWindow({ width: 1100, height: 720, minWidth: 850, minHeight: 600, backgroundColor: '#070d18', autoHideMenuBar: true, webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false } });
  win.loadFile(path.join(__dirname, 'index.html'));
}
async function postJson(url, body, headers = {}) {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.errorMessage || data.error_description || data.Message || data.error || `Request failed (${response.status})`);
  return data;
}
async function postForm(url, fields) {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(fields) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error_description || data.error || `Microsoft sign-in failed (${response.status})`);
  return data;
}
async function microsoftToMinecraft(msaAccessToken) {
  const xbl = await postJson('https://user.auth.xboxlive.com/user/authenticate', {
    Properties: { AuthMethod: 'RPS', SiteName: 'user.auth.xboxlive.com', RpsTicket: 'd=' + msaAccessToken },
    RelyingParty: 'http://auth.xboxlive.com', TokenType: 'JWT'
  });
  const uhs = xbl.DisplayClaims?.xui?.[0]?.uhs;
  if (!uhs) throw new Error('Xbox Live did not return a user identity. Check your Microsoft/Xbox account.');
  const xsts = await postJson('https://xsts.auth.xboxlive.com/xsts/authorize', {
    Properties: { SandboxId: 'RETAIL', UserTokens: [xbl.Token] },
    RelyingParty: 'rp://api.minecraftservices.com/', TokenType: 'JWT'
  });
  const mc = await postJson('https://api.minecraftservices.com/authentication/login_with_xbox', {
    identityToken: `XBL3.0 x=${uhs};${xsts.Token}`
  });
  const entResponse = await fetch('https://api.minecraftservices.com/entitlements/mcstore', { headers: { Authorization: 'Bearer ' + mc.access_token } });
  if (!entResponse.ok) throw new Error('Could not verify Minecraft ownership (' + entResponse.status + ').');
  const entitlements = await entResponse.json();
  if (!Array.isArray(entitlements.items) || entitlements.items.length === 0) throw new Error('This Microsoft account does not show a Minecraft entitlement.');
  const profileResponse = await fetch('https://api.minecraftservices.com/minecraft/profile', { headers: { Authorization: 'Bearer ' + mc.access_token } });
  if (!profileResponse.ok) throw new Error('Minecraft profile missing. Create your Java profile at minecraft.net first.');
  const profile = await profileResponse.json();
  return { access_token: mc.access_token, client_token: 'aether-client', uuid: profile.id, name: profile.name, user_properties: '{}', refresh_token: null, expires_at: Date.now() + (mc.expires_in || 86400) * 1000 };
}
async function beginMicrosoftLogin() {
  if (!CLIENT_ID) throw new Error('Microsoft sign-in is not configured yet. AETHER needs its own Microsoft Application (client) ID before Premium login can be enabled.');
  const device = await postForm('https://login.microsoftonline.com/consumers/oauth2/v2.0/devicecode', { client_id: CLIENT_ID, scope: 'XboxLive.signin offline_access' });
  win?.webContents.send('aether:device-code', { message: device.message, code: device.user_code, url: device.verification_uri });
  await shell.openExternal(device.verification_uri);
  const deadline = Date.now() + (device.expires_in || 900) * 1000;
  let interval = Math.max(5, device.interval || 5);
  let token;
  while (Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, interval * 1000));
    try {
      token = await postForm('https://login.microsoftonline.com/consumers/oauth2/v2.0/token', {
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code', client_id: CLIENT_ID, device_code: device.device_code
      });
      break;
    } catch (error) {
      const message = String(error.message);
      if (message.includes('authorization_pending')) continue;
      if (message.includes('slow_down')) { interval += 5; continue; }
      throw error;
    }
  }
  if (!token?.access_token) throw new Error('Microsoft sign-in code expired. Please try again.');
  const session = await microsoftToMinecraft(token.access_token);
  session.refresh_token = token.refresh_token || null;
  premiumSession = session;
  if (session.refresh_token && safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(JSON.stringify({ refresh_token: session.refresh_token }));
    await fs.writeFile(authFile(), encrypted);
  }
  return { name: session.name, uuid: session.uuid };
}
async function getPremiumSession() {
  if (premiumSession && premiumSession.expires_at > Date.now() + 60000) return premiumSession;
  let refreshToken = premiumSession?.refresh_token;
  if (!refreshToken && safeStorage.isEncryptionAvailable()) {
    try { const encrypted = await fs.readFile(authFile()); refreshToken = JSON.parse(safeStorage.decryptString(encrypted)).refresh_token; } catch {}
  }
  if (!refreshToken || !CLIENT_ID) throw new Error('Connect your Microsoft Premium account first.');
  const refreshed = await postForm('https://login.microsoftonline.com/consumers/oauth2/v2.0/token', { client_id: CLIENT_ID, grant_type: 'refresh_token', refresh_token: refreshToken, scope: 'XboxLive.signin offline_access' });
  const session = await microsoftToMinecraft(refreshed.access_token);
  session.refresh_token = refreshed.refresh_token || refreshToken;
  premiumSession = session;
  if (safeStorage.isEncryptionAvailable()) await fs.writeFile(authFile(), safeStorage.encryptString(JSON.stringify({ refresh_token: session.refresh_token })));
  return session;
}
function resolveGameDirectory(value) {
  return value && String(value).trim()
    ? path.resolve(String(value).trim())
    : path.join(app.getPath('appData'), '.minecraft');
}
async function ensureJavaRuntime(gameDirectory) {
  const root = resolveGameDirectory(gameDirectory);
  const runtimeRoot = path.join(root, 'runtime', 'java-runtime-delta', 'windows-x64');
  const javaPath = path.join(runtimeRoot, 'bin', 'java.exe');
  const markerPath = path.join(runtimeRoot, '.aether-runtime.json');
  try {
    const marker = JSON.parse(await fs.readFile(markerPath, 'utf8'));
    await fs.access(javaPath);
    if (marker.component === 'java-runtime-delta') return javaPath;
  } catch {}
  win?.webContents.send('aether:log', 'Preparing Java 21 runtime (first launch only)...');
  const indexResponse = await fetch('https://launchermeta.mojang.com/v1/products/java-runtime/2ec0cc96c44e5a76b9c8b7c39df7210883d12871/all.json');
  if (!indexResponse.ok) throw new Error('Could not load Mojang Java runtime index (' + indexResponse.status + ').');
  const runtimeIndex = await indexResponse.json();
  const releases = runtimeIndex['windows-x64']?.['java-runtime-delta'];
  if (!Array.isArray(releases) || releases.length === 0) throw new Error('Mojang has no Windows x64 Java 21 runtime listed.');
  const release = releases.find(item => item.availability?.progress === 100) || releases[0];
  const manifestResponse = await fetch(release.manifest.url);
  if (!manifestResponse.ok) throw new Error('Could not load Java runtime file list (' + manifestResponse.status + ').');
  const manifest = await manifestResponse.json();
  const safeTarget = relative => {
    const target = path.resolve(runtimeRoot, relative);
    if (!target.startsWith(runtimeRoot + path.sep)) throw new Error('Unsafe path in Java runtime manifest.');
    return target;
  };
  const entries = Object.entries(manifest.files || {});
  for (const [relative, entry] of entries) {
    if (entry.type === 'directory') await fs.mkdir(safeTarget(relative), { recursive: true });
  }
  const files = entries.filter(([, entry]) => entry.type === 'file');
  let completed = 0;
  const downloadOne = async ([relative, entry]) => {
    const destination = safeTarget(relative);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    const expected = entry.downloads?.raw;
    if (!expected?.url || !expected.sha1) throw new Error('Java runtime manifest is missing a file checksum or URL.');
    try {
      const existing = await fs.readFile(destination);
      if (existing.length === expected.size && crypto.createHash('sha1').update(existing).digest('hex') === expected.sha1) {
        completed++;
        return;
      }
    } catch {}
    const response = await fetch(expected.url);
    if (!response.ok) throw new Error('Java runtime download failed (' + response.status + '): ' + relative);
    const data = Buffer.from(await response.arrayBuffer());
    const digest = crypto.createHash('sha1').update(data).digest('hex');
    if (digest !== expected.sha1) throw new Error('Java runtime checksum mismatch: ' + relative);
    const temporary = destination + '.aether-download';
    await fs.writeFile(temporary, data);
    await fs.rename(temporary, destination);
    if (entry.executable) await fs.chmod(destination, 0o755);
    completed++;
    if (completed % 20 === 0 || completed === files.length) {
      win?.webContents.send('aether:log', 'Java runtime files: ' + completed + '/' + files.length);
    }
  };
  for (let i = 0; i < files.length; i += 6) {
    await Promise.all(files.slice(i, i + 6).map(downloadOne));
  }
  for (const [relative, entry] of entries) {
    if (entry.type !== 'link' || !entry.target) continue;
    const destination = safeTarget(relative);
    const source = path.resolve(path.dirname(destination), entry.target);
    if (source.startsWith(runtimeRoot + path.sep)) {
      try { await fs.mkdir(path.dirname(destination), { recursive: true }); await fs.copyFile(source, destination); } catch {}
    }
  }
  await fs.access(javaPath);
  await fs.writeFile(markerPath, JSON.stringify({ component: 'java-runtime-delta', version: release.version?.name || '21', manifest: release.manifest.sha1 }));
  win?.webContents.send('aether:log', 'Java 21 runtime is ready.');
  return javaPath;
}
async function installFabricProfile(gameDirectory, gameVersion = '1.21.11') {
  const root = resolveGameDirectory(gameDirectory);
  const versionsDir = path.join(root, 'versions');
  await fs.mkdir(versionsDir, { recursive: true });
  const metaResponse = await fetch(`https://meta.fabricmc.net/v2/versions/loader/${encodeURIComponent(gameVersion)}`, { headers: { Accept: 'application/json' } });
  if (!metaResponse.ok) throw new Error(`Fabric metadata unavailable for Minecraft ${gameVersion} (${metaResponse.status}).`);
  const choices = await metaResponse.json();
  const selected = Array.isArray(choices) ? choices.find(item => item.loader?.stable) || choices[0] : null;
  const loaderVersion = selected?.loader?.version;
  if (!loaderVersion) throw new Error(`Fabric does not currently list a loader for Minecraft ${gameVersion}.`);
  const profileResponse = await fetch(`https://meta.fabricmc.net/v2/versions/loader/${encodeURIComponent(gameVersion)}/${encodeURIComponent(loaderVersion)}/profile/json`, { headers: { Accept: 'application/json' } });
  if (!profileResponse.ok) throw new Error(`Could not retrieve the Fabric launch profile (${profileResponse.status}).`);
  const profile = await profileResponse.json();
  const profileId = String(profile.id || '');
  if (!/^fabric-loader-[A-Za-z0-9._-]+$/.test(profileId) || profile.inheritsFrom !== gameVersion) {
    throw new Error('Fabric returned an invalid or mismatched launch profile.');
  }
  const profileDir = path.join(versionsDir, profileId);
  const profileJson = path.join(profileDir, profileId + '.json');
  try {
    const existing = JSON.parse(await fs.readFile(profileJson, 'utf8'));
    if (existing.id === profileId && existing.inheritsFrom === gameVersion) return { versionId: profileId, loaderVersion, alreadyInstalled: true };
  } catch {}
  const zipResponse = await fetch(`https://meta.fabricmc.net/v2/versions/loader/${encodeURIComponent(gameVersion)}/${encodeURIComponent(loaderVersion)}/profile/zip`);
  if (!zipResponse.ok) throw new Error(`Could not download Fabric profile files (${zipResponse.status}).`);
  const zipPath = path.join(app.getPath('temp'), `aether-fabric-${Date.now()}.zip`);
  await fs.writeFile(zipPath, Buffer.from(await zipResponse.arrayBuffer()));
  try {
    const extractZip = require('extract-zip');
    await extractZip(zipPath, { dir: versionsDir });
  } finally {
    await fs.rm(zipPath, { force: true }).catch(() => {});
  }
  const installed = JSON.parse(await fs.readFile(profileJson, 'utf8'));
  if (installed.id !== profileId || installed.inheritsFrom !== gameVersion) {
    throw new Error('Fabric files were extracted, but the expected profile could not be verified.');
  }
  return { versionId: profileId, loaderVersion, alreadyInstalled: false };
}
async function openGameDirectory(value, child) {
  const root = resolveGameDirectory(value);
  const target = child ? path.join(root, child) : root;
  await fs.mkdir(target, { recursive: true });
  const error = await shell.openPath(target);
  if (error) throw new Error(error);
  return { ok: true, path: target };
}
ipcMain.handle('aether:open-game-folder', (_event, value) => openGameDirectory(value));
ipcMain.handle('aether:open-mods-folder', (_event, value) => openGameDirectory(value, 'mods'));
ipcMain.handle('aether:install-fabric', async (_event, settings = {}) => {
  const result = await installFabricProfile(settings.gameDir, '1.21.11');
  win?.webContents.send('aether:log', result.alreadyInstalled ? 'Fabric profile already installed.' : 'Fabric Loader ' + result.loaderVersion + ' installed.');
  return { ok: true, ...result };
});
app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
ipcMain.handle('aether:microsoft-login', async () => beginMicrosoftLogin());
ipcMain.handle('aether:launch', async (_event, settings) => {
  const accountType = settings.accountType === 'premium' ? 'premium' : 'local';
  let authorization;
  if (accountType === 'premium') {
    const session = await getPremiumSession();
    authorization = { access_token: session.access_token, client_token: session.client_token, uuid: session.uuid, name: session.name, user_properties: session.user_properties, meta: { type: 'msa', demo: false } };
  } else {
    const username = String(settings.username || '').trim();
    if (!/^[A-Za-z0-9_]{3,16}$/.test(username)) throw new Error('Enter a valid offline username (3–16 letters, numbers or underscores).');
    authorization = { access_token: '0', client_token: '0', uuid: '00000000-0000-0000-0000-000000000000', name: username, user_properties: '{}', meta: { type: 'mojang', demo: false } };
  }
  const launcher = new Client();
  launcher.on('debug', m => win?.webContents.send('aether:log', String(m)));
  launcher.on('data', m => win?.webContents.send('aether:log', String(m)));
  launcher.on('progress', (p, s) => win?.webContents.send('aether:progress', { progress: p, status: s }));
  const root = resolveGameDirectory(settings.gameDir);
  win?.webContents.send('aether:log', 'Checking Fabric profile for Minecraft 1.21.11...');
  const fabric = await installFabricProfile(root, '1.21.11');
  const javaPath = await ensureJavaRuntime(root);
  win?.webContents.send('aether:log', 'Starting Fabric Loader ' + fabric.loaderVersion + '...');
  await launcher.launch({ authorization, root, javaPath, version: { number: '1.21.11', type: 'release', custom: fabric.versionId }, memory: { max: String(settings.ram || 4) + 'G', min: '2G' } });
  return { ok: true, message: 'Minecraft launch process started.' };
});
