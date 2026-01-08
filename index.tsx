
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { APP_VERSION } from './constants';

// Polyfill para process.env para evitar ReferenceError no browser
if (typeof window !== 'undefined' && !(window as any).process) {
  (window as any).process = { env: {} };
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Não foi possível encontrar o elemento root para montar a aplicação.");
}

const root = ReactDOM.createRoot(rootElement);

/**
 * Safely unregisters service workers with robust error handling.
 */
const safeUnregisterSW = async () => {
  try {
    if (!('serviceWorker' in navigator)) return;
    if (document.readyState === 'loading') return;

    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const reg of registrations) {
      await reg.unregister();
    }
  } catch (err) {
    console.debug("SW Cleanup skipped.");
  }
};

/**
 * Safely clears browser caches.
 */
const safeClearCaches = async () => {
  try {
    if (!('caches' in window)) return;
    const keys = await caches.keys();
    await Promise.all(keys.map(key => caches.delete(key)));
  } catch (err) {
    console.debug("Cache Cleanup skipped.");
  }
};

const initApp = async () => {
  const storedVersion = localStorage.getItem('app_version');
  
  if (storedVersion && storedVersion !== APP_VERSION) {
    console.log(`Nova versão ${APP_VERSION} detetada. A limpar ambiente...`);
    safeUnregisterSW();
    safeClearCaches();
    localStorage.setItem('app_version', APP_VERSION);
  } else if (!storedVersion) {
    localStorage.setItem('app_version', APP_VERSION);
  }

  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
