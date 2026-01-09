
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

/**
 * Inicialização robusta para evitar erros de 'React is not defined' 
 * no Babel Standalone durante o carregamento assíncrono.
 */
const renderApp = () => {
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

// Executa assim que o script for processado pelo Babel
renderApp();
