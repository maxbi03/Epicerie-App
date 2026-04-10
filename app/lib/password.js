/**
 * Utilitaires mots de passe — utilisables côté client ET serveur (pas d'imports Node)
 */

/** Calcule un score de force de 0 à 4 */
export function getStrength(pwd) {
  let s = 0;
  if (pwd.length >= 10) s++;
  if (/[A-Z]/.test(pwd)) s++;
  if (/[0-9]/.test(pwd)) s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  return s;
}

export const STRENGTH_COLORS = ['', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'];
export const STRENGTH_LABELS = ['', 'Trop faible', 'Faible', 'Moyen', 'Fort'];

/**
 * Valide un mot de passe côté serveur.
 * Retourne un message d'erreur ou null si valide.
 */
export function validatePassword(pwd) {
  if (!pwd || typeof pwd !== 'string') return 'Mot de passe requis.';
  if (pwd.length < 10) return 'Mot de passe trop court (10 caractères minimum).';
  if (pwd.length > 128) return 'Mot de passe trop long (128 caractères maximum).';
  if (getStrength(pwd) < 2) return 'Mot de passe trop faible (ajoutez chiffres, majuscules ou symboles).';
  return null;
}
