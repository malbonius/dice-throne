const offlineStatus = document.getElementById('offline-status');
const installButton = document.getElementById('install-app');
let installPrompt;
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
  installButton.hidden = false;
});
installButton.addEventListener('click', async () => {
  if (!installPrompt) return;
  try { await installPrompt.prompt(); }
  finally {
    installPrompt = undefined;
    installButton.hidden = true;
  }
});
window.addEventListener('appinstalled', () => {
  installPrompt = undefined;
  installButton.hidden = true;
});
async function prepareOffline() {
  if (!('serviceWorker' in navigator)) {
    offlineStatus.textContent = 'Open via HTTPS or localhost to prepare offline play.';
    return;
  }
  try {
    await navigator.serviceWorker.register('./service-worker.js');
    await navigator.serviceWorker.ready;
    offlineStatus.textContent = 'Ready for offline play';
  } catch {
    offlineStatus.textContent = 'Offline setup failed. Reload while the setup server is running.';
  }
}
prepareOffline();
