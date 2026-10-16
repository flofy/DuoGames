// PWA : installation, enregistrement du service worker et mises à jour
import { Capacitor } from '@capacitor/core';
import { registerSW } from 'virtual:pwa-register';

export const pwa = $state({
  needRefresh: false,
  offlineReady: false,
  installAvailable: false
});

let updateSW = null;
let installPrompt = null;

export function initPwa() {
  // En dev local, on désactive le service worker pour éviter qu'il cache l'ancienne version.
  if (import.meta.DEV) return;

  // Dans l'APK (Capacitor), les fichiers sont embarqués : pas de service worker ni de prompt PWA.
  if (Capacitor.isNativePlatform() || !('serviceWorker' in navigator)) return;

  // Conserver l'événement au niveau du module pour qu'aucun composant ne le consomme
  // avant que le menu soit ouvert.
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installPrompt = event;
    pwa.installAvailable = true;
  });

  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    pwa.installAvailable = false;
  });

  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() { pwa.needRefresh = true; },
    onOfflineReady() { pwa.offlineReady = true; },
    // Recherche une nouvelle version toutes les heures si l'appli reste ouverte.
    onRegisteredSW(_url, reg) {
      if (reg) setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
    }
  });
}

export async function installPwa() {
  if (!installPrompt) {
    pwa.installAvailable = false;
    return;
  }

  const promptEvent = installPrompt;
  // Le navigateur n'autorise généralement le prompt qu'une seule fois.
  installPrompt = null;
  pwa.installAvailable = false;
  await promptEvent.prompt();
  await promptEvent.userChoice;
}

export const applyUpdate = () => updateSW?.(true);
export function dismiss() {
  pwa.needRefresh = false;
  pwa.offlineReady = false;
}
