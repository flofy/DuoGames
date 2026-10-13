import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// `vite` / `vite build` : page de démo autonome. `vite build --mode lib` : module ES unique (three.js et Svelte inclus)
// utilisable dans n'importe quelle page : <script type="module" src="coffre-fort.js"> puis <coffre-fort-3d>.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [svelte()],
  build:
    mode === 'lib'
      ? { lib: { entry: 'src/index.js', formats: ['es'], fileName: 'coffre-fort' }, outDir: 'dist-lib', emptyOutDir: true }
      : { outDir: 'dist', emptyOutDir: true }
}));
