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
  // Prevent execution if document is not in a valid state
  if (document.readyState === 'loading') return;
  
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const reg of registrations) {
      await reg.unregister();
    }
  } catch (err) {
    console.warn("SW Cleanup deferred: Document might be in an invalid state.");
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
    console.warn("Cache Cleanup deferred.");
  }
};

const initApp = async () => {
  const storedVersion = localStorage.getItem('app_version');
  
  if (storedVersion && storedVersion !== APP_VERSION) {
    console.log(`Nova versão ${APP_VERSION} detetada. A preparar atualização...`);
    
    // Background cleanup
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