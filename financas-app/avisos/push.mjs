/* Manda avisos para o celular (Web Push), sem biblioteca de fora: só o crypto do Node.
   - a mensagem vai trancada com as chaves do aparelho (RFC 8291, "aes128gcm")
   - o pedido vai assinado com a chave do app (VAPID, RFC 8292)
   As chaves do app saem de um segredo só (AVISOS_SEGREDO), guardado no Netlify. */
import crypto from 'node:crypto';

export const b64u = buf => Buffer.from(buf).toString('base64url');
export const deB64u = s => Buffer.from(s, 'base64url');
const hmac = (chave, dados) => crypto.createHmac('sha256', chave).update(dados).digest();
const expandir = (prk, info, n) => hmac(prk, Buffer.concat([info, Buffer.from([1])])).subarray(0, n); /* HKDF-Expand de 1 bloco */
const ORDEM = BigInt('0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551'); /* n da curva P-256 */

/* chaves VAPID a partir do segredo (sempre as mesmas para o mesmo segredo) */
export function chavesDoSegredo(segredo) {
  const semente = BigInt('0x' + hmac(Buffer.from('darzan-financas vapid'), Buffer.from(segredo)).toString('hex'));
  const d = Buffer.from(((semente % (ORDEM - 1n)) + 1n).toString(16).padStart(64, '0'), 'hex');
  const ecdh = crypto.createECDH('prime256v1'); ecdh.setPrivateKey(d);
  const pub = ecdh.getPublicKey();
  return { publica: b64u(pub), privada: crypto.createPrivateKey({ key: { kty: 'EC', crv: 'P-256', d: b64u(d), x: b64u(pub.subarray(1, 33)), y: b64u(pub.subarray(33, 65)) }, format: 'jwk' }) };
}

/* tranca a mensagem para um aparelho (RFC 8291). sal e chave do servidor só são passados nos testes */
export function trancar(texto, p256dh, auth, { sal = crypto.randomBytes(16), servidor } = {}) {
  const uaPub = deB64u(p256dh), segredoAuth = deB64u(auth);
  const as = crypto.createECDH('prime256v1');
  if (servidor) as.setPrivateKey(deB64u(servidor)); else as.generateKeys();
  const asPub = as.getPublicKey(), ecdh = as.computeSecret(uaPub);
  const ikm = expandir(hmac(segredoAuth, ecdh), Buffer.concat([Buffer.from('WebPush: info\0'), uaPub, asPub]), 32);
  const prk = hmac(sal, ikm);
  const cek = expandir(prk, Buffer.from('Content-Encoding: aes128gcm\0'), 16), nonce = expandir(prk, Buffer.from('Content-Encoding: nonce\0'), 12);
  const c = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const corpo = Buffer.concat([c.update(Buffer.concat([Buffer.from(texto), Buffer.from([2])])), c.final(), c.getAuthTag()]);
  const rs = Buffer.alloc(4); rs.writeUInt32BE(4096);
  return Buffer.concat([sal, rs, Buffer.from([asPub.length]), asPub, corpo]);
}

/* o contrário, como o celular faz (usado nos testes) */
export function destrancar(corpo, uaPrivada, auth) {
  const sal = corpo.subarray(0, 16), n = corpo[20], asPub = corpo.subarray(21, 21 + n), cifra = corpo.subarray(21 + n);
  const ua = crypto.createECDH('prime256v1'); ua.setPrivateKey(deB64u(uaPrivada));
  const ecdh = ua.computeSecret(asPub);
  const ikm = expandir(hmac(deB64u(auth), ecdh), Buffer.concat([Buffer.from('WebPush: info\0'), ua.getPublicKey(), asPub]), 32);
  const prk = hmac(sal, ikm);
  const d = crypto.createDecipheriv('aes-128-gcm', expandir(prk, Buffer.from('Content-Encoding: aes128gcm\0'), 16), expandir(prk, Buffer.from('Content-Encoding: nonce\0'), 12));
  d.setAuthTag(cifra.subarray(cifra.length - 16));
  const txt = Buffer.concat([d.update(cifra.subarray(0, cifra.length - 16)), d.final()]);
  return txt.subarray(0, txt.lastIndexOf(2)).toString();
}

/* assinatura VAPID (JWT ES256) para o serviço de avisos do aparelho (Apple, Google...) */
export function vapid(endpoint, chaves, sujeito) {
  const cab = b64u(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const corpo = b64u(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: sujeito }));
  const ass = crypto.sign('sha256', Buffer.from(`${cab}.${corpo}`), { key: chaves.privada, dsaEncoding: 'ieee-p1363' });
  return `vapid t=${cab}.${corpo}.${b64u(ass)}, k=${chaves.publica}`;
}

/* manda um aviso; devolve o código da resposta (404/410 = aparelho não existe mais) */
export async function mandar(aparelho, aviso, chaves, sujeito) {
  const r = await fetch(aparelho.endpoint, {
    method: 'POST',
    headers: { Authorization: vapid(aparelho.endpoint, chaves, sujeito), 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: '86400', Urgency: 'normal' },
    body: trancar(JSON.stringify(aviso), aparelho.p256dh, aparelho.auth),
  });
  return r.status;
}
