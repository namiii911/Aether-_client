const $ = id => document.getElementById(id);
const play = $('play');
const status = $('status');
const log = $('log');
const progress = $('progress');
const progressBar = $('progressBar');

function add(message) {
  log.textContent = (log.textContent + '\n' + message).slice(-8000);
  log.scrollTop = log.scrollHeight;
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
window.aether.onLaunchState(running => {
  play.disabled = Boolean(running);
  if (!running) progress.hidden = true;
});

$('chooseDir').addEventListener('click', async () => {
  try {
    const directory = await window.aether.chooseDirectory();
    if (directory) $('gameDir').value = directory;
  } catch (error) { add('Folder picker error: ' + error.message); }
});

play.addEventListener('click', async () => {
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
