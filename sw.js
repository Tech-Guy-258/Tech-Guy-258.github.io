
// Service Worker desactivado para evitar problemas de cache com MIME types
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
self.addEventListener('fetch', (event) => {
  // Não faz nada, deixa o navegador lidar com os pedidos normalmente
  return;
});
