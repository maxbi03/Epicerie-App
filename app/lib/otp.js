import { createHmac, timingSafeEqual } from 'crypto';

// Pepper serveur : le hash de l'OTP n'est pas réversible sans ce secret, même
// si le payload du cookie (JWT signé mais non chiffré) est décodé en base64.
const PEPPER = process.env.OTP_PEPPER || process.env.JWT_SECRET || '';

/** Hash non réversible d'un code OTP (HMAC-SHA256, hex). */
export function hashOtp(code) {
  return createHmac('sha256', PEPPER).update(String(code).trim()).digest('hex');
}

/** Comparaison en temps constant entre un code soumis et un hash stocké. */
export function verifyOtp(code, storedHash) {
  if (!storedHash) return false;
  const a = Buffer.from(hashOtp(code), 'hex');
  const b = Buffer.from(String(storedHash), 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
