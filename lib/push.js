const crypto = require('node:crypto');
const ALLOWED_HOSTS = /^(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|updates-autopush\.stage\.mozaws\.net|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)$/;
function validSubscription(s) {
  try {
    const u = new URL(s.endpoint);
    return u.protocol === 'https:' && !u.username && !u.password && !u.port && ALLOWED_HOSTS.test(u.hostname) && s.endpoint.length < 2048 && /^[A-Za-z0-9_-]{87}$/.test(s.keys.p256dh) && /^[A-Za-z0-9_-]{22}$/.test(s.keys.auth);
  } catch (_) { return false; }
}
function vapidKeys(secret) {
  if (!secret || secret.length < 48) throw Error('Push not configured');
  const key = crypto.createHash('sha256').update('bookclub-vapid-v1:' + secret).digest();
  const ecdh = crypto.createECDH('prime256v1'); ecdh.setPrivateKey(key);
  return {privateKey:key.toString('base64url'),publicKey:ecdh.getPublicKey().toString('base64url')};
}
function authorized(value, secret) {
  const a=Buffer.from(String(value||'')), b=Buffer.from('Bearer '+secret);
  return !!secret && a.length===b.length && crypto.timingSafeEqual(a,b);
}
module.exports={validSubscription,vapidKeys,authorized};
