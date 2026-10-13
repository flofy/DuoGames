// Les fichiers *.ce.svelte sont compilés en custom elements (web components).
// Partagé par le repo racine (svelte.config.js) et par le paquet (demo / build lib).
export function dynamicCompileOptions({ filename }) {
  if (filename && filename.endsWith('.ce.svelte')) return { customElement: true };
}
