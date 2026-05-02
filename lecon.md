# lecon.md — Techniques, préférences et apprentissages du projet Épico

Ce fichier se met à jour au fil des conversations. Il capture ce qui a été appris, testé, et validé.

---

## Préférences UI / Style

### BottomNav
- Style actuel : fond blanc fixe `bg-white dark:bg-gray-900`, bordure top fine, `max-w-md mx-auto` pour rester aligné
- Tab actif : `bg-primary-light text-primary`
- Masquée sur `/` et `/admin*`
- Liquid Glass (backdrop-blur + bordure conic-gradient iridescente) testé puis abandonné au profit du fond blanc

### Centrage du titre Header
- `absolute left-1/2 -translate-x-1/2` sur le `<h1>`, `relative` sur le `<header>`
- Pas de `justify-center` sur le flex parent — les éléments gauche/droite n'ont pas toujours la même largeur

### Boutons rectangle adaptatifs
- `px-3 h-9 flex items-center gap-1.5` au lieu de `size-9` pour s'adapter au contenu

### ProductModal
- Modal centré flottant : `fixed inset-0 flex items-center justify-center px-4`
- Pas de bottom sheet — évite de chevaucher la BottomNav
- Bouton Ajouter : `flex items-baseline gap-1.5 whitespace-nowrap`, prix en `text-xs opacity-70`

### Layout racine
- Structure : `body (flex-col h-dvh)` → `Header (shrink-0)` → `main (flex-1 overflow-hidden)` → `BottomNav (shrink-0)`
- La BottomNav est dans le flux normal (pas `fixed`) — `main` prend exactement l'espace restant, rien ne passe sous la nav
- Quand BottomNav retourne `null` (sur `/` et `/admin*`), `main` occupe tout l'espace automatiquement
- Pas de `pb-*` à ajouter sur les pages, le layout s'en charge

---

## GPS / Géolocalisation

- `enableHighAccuracy: false` = réseau (WiFi/cell) → 1-3s. Suffisant pour un rayon de 400m
- `enableHighAccuracy: true` = GPS hardware → 15-60s en intérieur, à éviter
- Pattern optimal :
  ```js
  navigator.geolocation.getCurrentPosition(cb, ()=>{}, { enableHighAccuracy: false, maximumAge: Infinity });
  navigator.geolocation.watchPosition(cb, ()=>{}, { enableHighAccuracy: false, maximumAge: 15000 });
  ```
- Si position null au clic → `getCurrentPosition` ponctuel avec `maximumAge: 60000, timeout: 8000`

---

## React / Patterns

- Auto-reset d'état après délai, cibler l'état exact :
  ```js
  useEffect(() => {
    if (status === 'error') {
      const t = setTimeout(() => setStatus('idle'), 5000);
      return () => clearTimeout(t);
    }
  }, [status]);
  ```

---

## Tailwind v4

- Les tokens de `tokens.css` sont utilisables comme classes : `bg-primary`, `text-primary`, `bg-card-bg`, `text-text-muted`, etc.
- `size-*` = shorthand `w-* h-*`
- Valeurs arbitraires : `rounded-[22px]`, `p-[1.5px]`, `shadow-[...]`, `bg-[conic-gradient(...)]`
- Unité `ch` = largeur du caractère "0" dans la fonte courante

---

## Portail producteur

- Auth séparée via `producer_token` cookie (30j), géré dans `app/lib/producerAuth.js`
- Dynamic import argon2 obligatoire (webpack ne supporte pas les modules natifs) : `const argon2 = (await import('argon2')).default ?? (await import('argon2'))`
- Lien produits ↔ producteur par correspondance texte : `product_list.producer === producers.name` (exact)
- Tables sans RLS (accès via service_role uniquement) : `producers`, `producer_deliveries`, `producer_invoices`, `producer_proposals`
- `/producteur*` exclu de `BottomNav` (même traitement que `/admin*`)

## Cross-composant sans Redux

- Pattern `window.dispatchEvent(new CustomEvent('nom'))` pour notifier layout d'une action dans une page enfant
- Ex : badge signalements rechargé via `reports-updated` event depuis `signalements/page.js`
- Badge pending fournisseurs : chargé indépendamment de l'onglet actif (sinon 0 quand on est sur l'onglet Factures)

## Admin produits — DLC / Remise

- `expiry_date` (date), `discount_percent` (numeric 0-100), `discount_until` (date) ajoutés sur `product_list`
- `daysUntil(dateStr)` = différence en jours entiers depuis aujourd'hui, `null` si pas de date
- Badge DLC s'affiche si `daysUntil <= 7`, badge "-X%" si `discount_percent > 0`
- Bouton imprimer (Printer icon) visible seulement quand produit a un discount ou DLC urgent
- Impression : `window.open()` + HTML inline stylé (pas `innerHTML` + Tailwind, pas de CSS dans la popup)

## Divers

- Commentaires JS : uniquement quand le POURQUOI n'est pas évident dans le code
