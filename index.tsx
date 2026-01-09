
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const initApp = () => {
  const container = document.getElementById('root');
  if (container) {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }
};

// Garantir que o DOM está pronto e o Babel terminou
if (document.readyState === 'complete') {
  initApp();
} else {
  window.addEventListener('load', initApp);
}
