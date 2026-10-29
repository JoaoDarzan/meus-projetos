/* Proteções do navegador. Roda antes de tudo.
   - O app não abre escondido dentro de outro site (clickjacking: um site falso põe o app por baixo e faz você clicar). */
(function () {
  if (window.top !== window.self) {
    try { window.top.location.replace(window.self.location.href); } catch (e) { /* bloqueado: apaga a tela */ }
    document.documentElement.innerHTML = '';
    throw new Error('o app não pode ser aberto dentro de outro site');
  }
  window.FOTO_JOAO = '../img/perfil-joao-darzan.jpg';
})();
