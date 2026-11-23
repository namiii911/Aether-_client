const $ = id => document.getElementById(id);
const play = $('play');
const status = $('status');
const log = $('log');
const progress = $('progress');
const progressBar = $('progressBar');
const settingIds = ['username', 'version', 'ram', 'gameDir', 'loader'];

function add(message) {
  log.textContent = (log.textContent + '\n' + message).slice(-8000);
  log.scrollTop = log.scrollHeight;
}

function saveSettings() {
  const values = {};
  for (const id of settingIds) values[id] = $(id).value;
  try { localStorage.setItem('aether-launcher-settings', JSON.stringify(values)); } catch (_) {}
}

function restoreSettings() {
  try {
    const values = JSON.parse(localStorage.getItem('aether-launcher-settings') || '{}');
    for (const id of settingIds) {
      if (typeof values[id] === 'string' && $(id)) $(id).value = values[id];
    }
  } catch (_) {}
}

async function refreshJava() {
  const badge = $('javaStatus');
  badge.textContent = 'Checking Java…';
  try {
    const result = await window.aether.checkJava();
    badge.textContent = result.message;
    badge.dataset.ready = result.available && result.major >= 21 ? 'yes' : 'no';
    add(result.message);
  } catch (error) {
    badge.textContent = 'Could not check Java: ' + error.message;
    badge.dataset.ready = 'no';
  }
}

restoreSettings();
for (const id of settingIds) {
  $(id).addEventListener('change', saveSettings);
  $(id).addEventListener('input', saveSettings);
}

window.aether.onLog(add);
window.aether.onStatus(message => { status.textContent = message; });
window.aether.onProgress(value => {
  if (!value) return;
  if (value.status) status.textContent = value.status;
  const amount = Number(value.progress);
  if (Number.isFinite(amount)) {
    progress.hidden = false;
    progressBar.style.width = Math.max(0, Math.min(100, amount)) + '%';
  }
});
window.aether.onInstallState(running => {
  $('installFabric').disabled = Boolean(running);
  if (running) { progress.hidden = false; progressBar.style.width = '15%'; }
});
window.aether.onLaunchState(running => {
  play.disabled = Boolean(running);
  if (!running) progress.hidden = true;
});

$('checkJava').addEventListener('click', refreshJava);
$('installFabric').addEventListener('click', async () => {
  saveSettings();
  $('installFabric').disabled = true;
  status.textContent = 'Installing Fabric…';
  progress.hidden = false;
  progressBar.style.width = '5%';
  add('Installing Fabric for Minecraft ' + $('version').value + '…');
  try {
    const result = await window.aether.installFabric({ version: $('version').value, gameDir: $('gameDir').value });
    status.textContent = result.message;
    progressBar.style.width = '100%';
    add(result.message + ' Select Fabric in the profile menu to launch it.');
    $('loader').value = 'fabric';
    saveSettings();
  } catch (error) {
    status.textContent = 'Fabric installation failed';
    add('FABRIC ERROR: ' + error.message);
    alert(error.message);
  } finally { $('installFabric').disabled = false; }
});
$('chooseDir').addEventListener('click', async () => {
  try {
    const directory = await window.aether.chooseDirectory();
    if (directory) {
      $('gameDir').value = directory;
      saveSettings();
    }
  } catch (error) { add('Folder picker error: ' + error.message); }
});

play.addEventListener('click', async () => {
  saveSettings();
  play.disabled = true;
  progress.hidden = false;
  progressBar.style.width = '0%';
  status.textContent = 'Starting launcher…';
  add('Starting Minecraft ' + $('version').value + ' as ' + $('username').value);
  try {
    const result = await window.aether.launch({
      username: $('username').value,
      ram: $('ram').value,
      version: $('version').value,
      gameDir: $('gameDir').value
    });
    status.textContent = result.message;
    add(result.message);
  } catch (error) {
    status.textContent = 'Launch failed';
    add('ERROR: ' + error.message);
    alert(error.message);
    play.disabled = false;
    progress.hidden = true;
  }
});

document.querySelectorAll('[data-page]').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-page]').forEach(item => item.classList.toggle('active', item === button));
    document.querySelectorAll('.page').forEach(page => page.hidden = page.id !== button.dataset.page);
  });
});

refreshJava();
