/* Liga o app (fica num arquivo, e não escrito na página, para a política de segurança só aceitar scripts do próprio site) */
document.querySelectorAll('[data-i]').forEach(el => { el.outerHTML = A.u.svg(el.dataset.i); });
document.getElementById('lgOlho').innerHTML = A.u.svg('eye');
try { localStorage.removeItem('df-chave-claude'); } catch (e) { /* versões antigas guardavam a chave do Claude no aparelho */ }
A.iniciar();
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { });
