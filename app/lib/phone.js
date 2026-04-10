/**
 * Utilitaires numéros de téléphone — utilisables côté client ET serveur
 */

/** Normalise un numéro suisse en format E.164 (+41XXXXXXXXX) */
export function normalizePhone(phone) {
  if (!phone || typeof phone !== 'string') return '';
  let p = phone.replace(/[\s\-\.\(\)]/g, '');
  if (p.startsWith('00')) p = '+' + p.slice(2);
  else if (p.startsWith('0') && !p.startsWith('0+')) p = '+41' + p.slice(1);
  return p;
}

/**
 * Valide un numéro E.164.
 * Retourne un message d'erreur ou null si valide.
 */
export function validatePhone(phone) {
  if (!phone || typeof phone !== 'string') return 'Numéro de téléphone requis.';
  const normalized = normalizePhone(phone);
  // E.164 : + suivi de 7 à 15 chiffres
  if (!/^\+[1-9]\d{6,14}$/.test(normalized)) {
    return 'Numéro de téléphone invalide. Exemple : +41791234567 ou 0791234567.';
  }
  return null;
}
