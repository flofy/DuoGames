import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';
import { initPwa } from './lib/pwa.svelte.js';

initPwa();

export default mount(App, { target: document.getElementById('app') });
