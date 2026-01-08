
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { APP_VERSION } from './constants';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Não foi possível encontrar o elemento root para montar a aplicação.");
}

const root = createRoot(rootElement);

/**
 * Safely unregisters service workers.
 */
const safeUnregisterSW = async () => {
  try {
    if (!('serviceWorker' in navigator)) return;
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
    await safeUnregisterSW();
    await safeClearCaches();
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

initApp();
