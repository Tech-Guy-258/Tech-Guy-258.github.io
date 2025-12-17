
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { APP_VERSION } from './constants';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// --- AGGRESSIVE CACHE CLEANER ---
const initApp = async () => {
  try {
    const storedVersion = localStorage.getItem('app_version');
    
    // Se a versão mudou, limpar tudo
    if (storedVersion !== APP_VERSION) {
      console.log(`Detected new version ${APP_VERSION}. Cleaning cache...`);
      
      // UI Feedback antes de recarregar
      rootElement.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background-color:#f8fafc;">
          <div style="width:50px;height:50px;border:4px solid #e2e8f0;border-top:4px solid #059669;border-radius:50%;animation:spin 1s linear infinite;"></div>
          <h2 style="margin-top:20px;color:#1f2937;font-weight:bold;">A atualizar aplicação...</h2>
          <p style="margin-top:8px;color:#6b7280;font-size:14px;">Versão ${APP_VERSION}</p>
          <style>@keyframes spin {0% {transform: rotate(0deg);} 100% {transform: rotate(360deg);}}</style>
        </div>
      `;
      
      // 1. Unregister Service Workers (Protegido com try/catch)
      if ('serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            await registration.unregister();
          }
        } catch (e) {
          console.warn("Service Worker cleanup failed (ignoring):", e);
        }
      }

      // 2. Clear Caches (Protegido com try/catch)
      if ('caches' in window) {
        try {
          const keys = await caches.keys();
          await Promise.all(keys.map(key => caches.delete(key)));
        } catch (e) {
          console.warn("Cache storage cleanup failed (ignoring):", e);
        }
      }

      // 3. Clear Session to force new permissions load
      // ONLY if updating to 3.2.1+ to fix the missing menu bug
      if (!storedVersion || storedVersion < '3.2.1') {
         localStorage.removeItem('gestao360_session');
      }

      // 4. Update Version
      localStorage.setItem('app_version', APP_VERSION);

      // 5. Force Reload (Hard Reload)
      setTimeout(() => {
         window.location.reload();
      }, 1500); // Small delay to show spinner
      
      return; // Stop execution here to wait for reload
    }
  } catch (err) {
    // Fallback de segurança: Se algo falhar na verificação de versão, renderizar a app de qualquer forma
    console.error("Critical init error, proceeding to render app:", err);
  }

  // Normal Render
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

// Garantir que corre apenas quando o documento estiver pronto para evitar 'invalid state'
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
