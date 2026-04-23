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

## Divers

- Commentaires JS : uniquement quand le POURQUOI n'est pas évident dans le code
