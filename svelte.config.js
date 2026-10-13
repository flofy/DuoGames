import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { dynamicCompileOptions } from './packages/coffre-fort/svelte-options.js';

// *.ce.svelte (paquet coffre-fort) est compilé en web component, le reste en composants Svelte classiques
export default {
  preprocess: vitePreprocess(),
  // svelte-check compile sans l'option customElement : l'avertissement correspondant est un faux positif ici
  compilerOptions: { warningFilter: (w) => w.code !== 'options_missing_custom_element' },
  vitePlugin: { dynamicCompileOptions }
};
