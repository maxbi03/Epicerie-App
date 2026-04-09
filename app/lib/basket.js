const KEY = 'user_basket';
const TTL_MS = 60 * 60 * 1000; // 1 heure

/**
 * Lit le panier. Retourne un tableau vide si expiré ou absent.
 * Le timer est glissant : chaque écriture le remet à +30 min.
 */
export function getBasket() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const { items, expiresAt } = JSON.parse(raw);
    if (Date.now() > expiresAt) {
      localStorage.removeItem(KEY);
      window.dispatchEvent(new Event('cart-updated'));
      return [];
    }
    return items ?? [];
  } catch {
    return [];
  }
}

/**
 * Sauvegarde le panier et remet le timer à +30 min.
 * Si le tableau est vide, supprime la clé proprement.
 */
export function saveBasket(items) {
  if (!items || items.length === 0) {
    localStorage.removeItem(KEY);
  } else {
    localStorage.setItem(KEY, JSON.stringify({
      items,
      expiresAt: Date.now() + TTL_MS,
    }));
  }
  window.dispatchEvent(new Event('cart-updated'));
}

/**
 * Vide le panier immédiatement (après paiement, déconnexion, etc.)
 */
export function clearBasket() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event('cart-updated'));
}

/**
 * Retourne le temps restant avant expiration en secondes, ou null si vide.
 */
export function getBasketTTLSeconds() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const { expiresAt } = JSON.parse(raw);
    const remaining = Math.floor((expiresAt - Date.now()) / 1000);
    return remaining > 0 ? remaining : null;
  } catch {
    return null;
  }
}
