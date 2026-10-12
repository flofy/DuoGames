// PWA : enregistrement du service worker + état « mise à jour disponible »
import { Capacitor } from '@capacitor/core';
import { registerSW } from 'virtual:pwa-register';

export const pwa = $state({ needRefresh: false, offlineReady: false });

let updateSW = null;

export function initPwa() {
  // dans l'APK (Capacitor) les fichiers sont embarqués : pas de service worker
  if (Capacitor.isNativePlatform() || !('serviceWorker' in navigator)) return;
  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() { pwa.needRefresh = true; },
    onOfflineReady() { pwa.offlineReady = true; },
    // recherche une nouvelle version toutes les heures si l'appli reste ouverte
    onRegisteredSW(_url, reg) {
      if (reg) setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
    }
  });
}

export const applyUpdate = () => updateSW?.(true);
export function dismiss() {
  pwa.needRefresh = false;
  pwa.offlineReady = false;
}
