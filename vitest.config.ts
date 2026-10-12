import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['src/**/*.{test,spec}.js'],
    exclude: ['node_modules'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/lib'],
      all: false,
    },
  },
});
