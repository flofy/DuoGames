const root = () => document.documentElement;
export const fsSupported = () => !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
export const isFs = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
export async function toggleFs() {
  try {
    if (isFs()) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else {
      const r = root().requestFullscreen || root().webkitRequestFullscreen;
      await r.call(root());
    }
    return true;
  } catch { return false; }
}
