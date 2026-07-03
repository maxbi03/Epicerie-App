# Modèle recommandé : Sonnet 5 (claude-sonnet-5)
Refactor mécanique guidé (extraction de composants/hooks), volume élevé mais faible risque. Sonnet est le bon compromis coût/qualité.

---

## Contexte

App Next.js 16 / React 19, « vibecodée ». Plusieurs pages sont devenues monolithiques et difficiles à faire évoluer :
- `app/profil/page.js` — 775 lignes
- `app/admin/news/page.js` — 645 lignes
- `app/admin/commandes-groupees/page.js` — 603 lignes
- `app/page.js` — 571 lignes
- `app/admin/produits/page.js` — 528 lignes
- `app/scanner/page.js` — 500 lignes

Lis `CLAUDE.md` (contient les conventions de layout : `max-w-md` centralisé dans le layout, `BottomNav` dans le flux, tokens CSS, etc. — les respecter). Réponds en français, mets à jour `lecon.md`.

## Objectif

Découper ces pages en composants et hooks réutilisables, **sans changer le comportement ni le rendu visuel**. Refactor pur.

## Travail demandé

Traiter **une page à la fois**, dans l'ordre de taille décroissante. Pour chaque page :

1. **Extraire les sous-composants UI** dans `app/components/` (ou un sous-dossier par domaine, ex. `app/components/profil/`) : sections de formulaire, modales, cartes, listes. Chaque composant < ~150 lignes idéalement.
2. **Extraire la logique de données dans des hooks** `app/hooks/` : `useProfile()`, `useNews()`, `useProducts()`, `useBulkOrders()`, etc. — centraliser les `fetch`, l'état de chargement, la gestion d'erreur. Repérer les patterns de fetch dupliqués entre pages et les mutualiser.
3. **Garder la page comme composant d'orchestration** mince : layout + composition des sous-composants.
4. Respecter les conventions de `CLAUDE.md` (pas de `max-w-md` ni `pb-*` répétés, tokens CSS `bg-primary`/`text-text-muted`/etc.).

## Méthode (important)
- Un commit / une PR par page refactorée, pas un big bang.
- Après chaque page : vérifier visuellement (lancer `npm run dev`, comparer avant/après) que rien n'a bougé.
- Ne pas introduire de nouvelle lib d'état (pas de Redux/Zustand) sauf accord explicite de l'utilisateur — rester en hooks React + `localStorage` comme l'existant (`app/lib/basket.js` est la référence de pattern).

## Critères de validation
- Aucune régression visuelle ni fonctionnelle.
- Chaque page principale passe sous ~200 lignes.
- Pas de duplication de logique de fetch entre pages (mutualisée en hooks).
- `npm run build` et `npm run lint` passent.

## Attention
- C'est du refactor, pas une réécriture : si un comportement est bizarre mais volontaire, le conserver (ou le signaler à l'utilisateur, ne pas le « corriger » silencieusement).
- Ne pas toucher à la logique de sécurité / paiement pendant ce lot (couverts par 01-04).
