
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { APP_VERSION } from './constants';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Não foi possível encontrar o elemento root para montar a aplicação.");
}

const root = ReactDOM.createRoot(rootElement);

/**
 * Safely unregisters service workers without blocking the UI thread or throwing state errors.
 */
const safeUnregisterSW = async () => {
  if (!('serviceWorker' in navigator)) return;
  try {
    // We wait for the service worker to be ready or just query registrations
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const reg of registrations) {
      await reg.unregister();
    }
  } catch (err) {
    // Ignore "invalid state" errors which happen during page transitions
    console.warn("SW Cleanup deferred or failed due to document state.");
  }
};

/**
 * Safely clears browser caches.
 */
const safeClearCaches = async () => {
  if (!('caches' in window)) return;
  try {
    const keys = await caches.keys();
    await Promise.all(keys.map(key => caches.delete(key)));
  } catch (err) {
    console.warn("Cache Cleanup deferred or failed.");
  }
};

const initApp = async () => {
  const storedVersion = localStorage.getItem('app_version');
  
  // If version mismatch, we try to clean up but don't let it crash the boot process
  if (storedVersion && storedVersion !== APP_VERSION) {
    console.log(`Nova versão ${APP_VERSION} detetada. A preparar atualização...`);
    
    // Perform cleanup in the background
    safeUnregisterSW();
    safeClearCaches();

    localStorage.setItem('app_version', APP_VERSION);
    
    // We only reload if we are not already on a fresh load to avoid loops
    // But for simplicity in this architecture, we update and proceed
  } else if (!storedVersion) {
    localStorage.setItem('app_version', APP_VERSION);
  }

  // Render the app regardless of cleanup success to ensure availability
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

// Ensure we start after the document is interactive
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
