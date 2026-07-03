# Modèle recommandé : Sonnet 5 (claude-sonnet-5)
Refactor systématique et répétitif, faible ambiguïté. Sonnet est idéal (rapide + fiable sur du pattern répété).

---

## Contexte

App Next.js 16. Chaque route API valide ses entrées à la main, de façon incohérente : certaines vérifient les types, d'autres non (ex. `app/api/checkout/route.js` fait confiance au body sans schéma). Exemple de validation manuelle existante : `app/api/auth/register/route.js` (email/password/phone).

Lis `CLAUDE.md`. Réponds en français, pas de commentaires superflus, mets à jour `lecon.md`.

## Objectif

Introduire `zod` pour une validation d'entrée systématique, typée et cohérente sur toutes les routes API qui lisent un body ou des query params.

## Travail demandé

### 1. Installer zod
`npm install zod`

### 2. Centraliser les schémas
Créer `app/lib/schemas.js` (ou un dossier `app/lib/schemas/`) regroupant les schémas par domaine : auth, checkout, users, reports, admin, producer, door, etc.

### 3. Helper de parsing
Créer un petit helper, ex. `parseBody(request, schema)` qui :
- lit `await request.json()` (avec `.catch(() => ({}))`),
- valide via `schema.safeParse`,
- si échec, renvoie une réponse 400 avec les messages d'erreur formatés (en français, lisibles),
- si succès, renvoie les données typées.

### 4. Appliquer route par route
Remplacer les validations manuelles par le schéma correspondant. Prioriser dans l'ordre :
1. `checkout` (déjà durci dans le lot 02 — coordonne : le body ne contient que `[{ id, quantity }]`).
2. `auth/*` (register, login, verify-phone).
3. `users`, `reports`, `saved-lists`.
4. `admin/*`, `producer/*`.
5. `door/unlock` (lat/lng numériques bornés).

Garder les règles métier existantes (longueur nom ≥ 2, format email, `validatePhone`, `validatePassword`) — les porter dans les schémas zod ou les appeler en `.refine()`.

### 5. Cohérence des erreurs
Toutes les erreurs de validation doivent renvoyer un format homogène `{ error: "..." }` avec status 400, comme le reste du code.

## Critères de validation
- Un body malformé (mauvais type, champ manquant) renvoie 400 avec un message clair, pas une 500.
- Les flux légitimes passent sans changement de comportement observable.
- `npm run build` et `npm run lint` passent.

## Attention
- Ne pas dupliquer la logique de sécurité des lots 01-04 : si ce lot est fait après, s'aligner sur leurs signatures (ex. checkout n'accepte plus de prix client).
- Ne pas sur-valider au point de casser des champs optionnels réellement optionnels (adresse, ville…).
