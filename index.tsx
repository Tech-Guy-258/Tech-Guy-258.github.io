
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Função de arranque limpa
const startApp = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error("Erro Crítico: Elemento #root não encontrado no DOM.");
    return;
  }

  try {
    const root = createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("Aplicação montada com sucesso.");
  } catch (error) {
    console.error("Erro ao renderizar a aplicação:", error);
  }
};

// Iniciar
startApp();
