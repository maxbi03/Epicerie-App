/**
 * Calcul du prix effectif — utilisable côté client ET serveur (pas d'imports Node).
 * Toujours arrondir PAR UNITÉ en centimes avant de multiplier par la quantité :
 * sommer des CHF en virgule flottante (prix × qty pour chaque ligne, additionnés)
 * peut diverger d'un centime du total réellement facturé par le serveur.
 */
export function effectivePriceCents(price, discountPercent) {
  const base = Number(price ?? 0);
  const disc = Number(discountPercent ?? 0);
  const unit = disc > 0 ? base * (1 - disc / 100) : base;
  return Math.round(unit * 100);
}
