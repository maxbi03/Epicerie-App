/**
 * Utilitaires mots de passe — utilisables côté client ET serveur (pas d'imports Node)
 */

const SYMBOL_POOL_SIZE = 32; // approximation du clavier standard (symboles imprimables)

/** Taille du jeu de caractères utilisé (minuscules/majuscules/chiffres/symboles). */
function poolSize(pwd) {
  let size = 0;
  if (/[a-z]/.test(pwd)) size += 26;
  if (/[A-Z]/.test(pwd)) size += 26;
  if (/[0-9]/.test(pwd)) size += 10;
  if (/[^A-Za-z0-9]/.test(pwd)) size += SYMBOL_POOL_SIZE;
  return size;
}

/**
 * Entropie estimée en bits : (nombre de caractères DISTINCTS) × log2(taille du
 * jeu de caractères). Ni une simple estimation "longueur × log2(pool)" (qui
 * noterait "aaaaaaaaaa" presque aussi bien qu'un mot de passe aléatoire de
 * même longueur), ni une entropie de Shannon pure sur la fréquence des
 * caractères (qui plafonne à log2(longueur) et sous-note à tort les mots de
 * passe courts mais variés, ex. mélange majuscule/chiffre/symbole) : cette
 * version pénalise la répétition tout en récompensant la diversité des classes.
 */
export function getEntropyBits(pwd) {
  if (!pwd) return 0;
  const size = poolSize(pwd);
  if (size === 0) return 0;
  const distinctChars = new Set(pwd).size;
  return Math.round(distinctChars * Math.log2(size));
}

/** Calcule un score de force de 0 à 4, basé sur l'entropie réelle du mot de passe */
export function getStrength(pwd) {
  if (!pwd) return 0;
  const bits = getEntropyBits(pwd);
  if (bits < 28) return 1;
  if (bits < 40) return 2;
  if (bits < 60) return 3;
  return 4;
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
