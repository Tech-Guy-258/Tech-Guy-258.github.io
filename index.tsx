
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { APP_VERSION } from './constants';

/**
 * LIMPEZA SEGURA: O navegador pode estar a servir uma versão corrompida em cache.
 * Adicionado try-catch para evitar o erro "The document is in an invalid state".
 */
const clearAllCaches = async () => {
  try {
    if ('serviceWorker' in navigator && window.isSecureContext) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        try {
          await registration.unregister();
        } catch (e) {
          console.debug("Falha ao desregistar SW:", e);
        }
      }
    }
  } catch (err) {
    console.debug("ServiceWorker registration access failed:", err);
  }

  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      for (const key of keys) {
        try {
          await caches.delete(key);
        } catch (e) {
          console.debug("Falha ao apagar cache:", e);
        }
      }
    }
  } catch (err) {
    console.debug("Cache API access failed:", err);
  }
};

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Elemento root não encontrado.");

const root = createRoot(rootElement);

const init = async () => {
  try {
    const lastVer = localStorage.getItem('app_version');
    if (lastVer !== APP_VERSION) {
      await clearAllCaches();
      localStorage.setItem('app_version', APP_VERSION);
    }
  } catch (e) {
    console.debug("Initialization cleanup skipped:", e);
  } finally {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }
};

init();
