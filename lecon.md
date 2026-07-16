# lecon.md — Techniques, préférences et apprentissages du projet Épico

Ce fichier se met à jour au fil des conversations. Il capture ce qui a été appris, testé, et validé.

---

## Résumé de session — sécurisation, migration DB locale, nouvelles fonctionnalités

Vue d'ensemble du travail réalisé (détails techniques dans les sections dédiées ci-dessous). Tout est sur la branche `dev`, poussé sur le remote ; `main` reste intacte jusqu'à validation finale.

**Sécurité (lots 01→04, 08)**
- Autorisation centralisée via `proxy.js` (garde-fou JWT sur `/api/*` et `/admin*`) + fermeture de routes admin qui étaient ouvertes sans contrôle.
- Paiement : recalcul du prix côté serveur (jamais confiance au client), idempotence par `order_ref`, `total_spent` atomique.
- Porte IoT : retrait du secret de repli codé en dur (le durcissement broker/anti-rejeu est reporté volontairement, voir section dédiée).
- OTP stocké haché (jamais en clair) dans le cookie, rate limiting sur le login (verrou après 5 échecs).
- Nettoyage de code mort (fichiers Supabase inutilisés, dépendance PWA en double).

**Migration base de données — Supabase → Postgres local (lot 10, terminé A→E)**
- Passage complet de Supabase à un Postgres local (Docker), accédé via Drizzle ORM.
- Les ~39 fichiers / ~117 requêtes de l'app ont été réécrits de Supabase JS vers Drizzle.
- Storage (avatars) remplacé par du stockage fichier local.
- Sauvegardes (`backup-db.sh`/`restore-db.sh`) écrites et testées en conditions réelles (cycle complet backup → restauration → vérification).
- Bascule finale : l'app tourne à 100 % sur le Postgres local, plus aucune dépendance runtime à Supabase.

**Corrections issues du smoke-test manuel**
- Bug d'arrondi panier/paiement (écart d'1 centime entre affichage et montant facturé).
- Bug `total_spent` incrémenté en centimes au lieu de CHF (affichage ×100).
- Redirection admin peu fiable, édition nom/email dans le profil, cohérence du badge remise.

**Nouvelles fonctionnalités**
- Compteur d'entropie du mot de passe, lié à la barre de force existante.
- Champ pays obligatoire à l'inscription (191 pays), autocomplete d'adresse suisse retiré au profit d'un champ libre.
- Numéro de téléphone "compte illimité" pour les tests/démos (exception assumée, y compris en production).
- Images produits téléchargées et stockées en local (comme les avatars), avec upload direct en plus du collage d'URL, cache navigateur optimisé, et config Nginx préparée pour le déploiement.

**Validation zod (lot 06, terminé)**
- Toutes les routes API acceptant un body (~26) validées via zod, centralisées dans `app/lib/schemas.js`. Seule exception volontaire : `checkout/webhook` (payload tiers Mollie/Payrexx, déjà re-vérifié via leur API, pas via le body).

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

## Sécurité — autorisation des routes (lot 01)

- **Garde-fou central `proxy.js`** (racine) : en Next 16, `middleware.js` est déprécié → utiliser `proxy.js` exportant `export async function proxy(request)`. Runtime edge : vérifie seulement la présence/validité du JWT via `jose` (pas d'accès DB possible en edge).
  - `/api/*` hors liste blanche → 401 si pas de JWT valide. Liste blanche = login, register, logout, me, verify-phone/*, checkout/webhook, products, news, address-search, reports.
  - `/admin*` (pages) → redirige vers `/home` si pas de JWT. Le rôle admin reste vérifié dans le layout + les routes (défense en profondeur).
- **Le JWT ne contient QUE `{ userId, email }`** — jamais `role`. Ne JAMAIS se fier à `session.role` (toujours `undefined`). Le rôle se vérifie en DB :
  - Admin → `requireAdmin()` de `lib/adminUtils.js` (lookup `users.role`). C'est le seul mécanisme admin valide.
  - Producteur → `requireProducer()` de `lib/producerAuth.js` : source de vérité = existence d'une ligne `producers` liée au `user_id` (via `.maybeSingle()`). Ne dépend plus de `session.role`.
- Supprimé : le helper `isAdmin()` basé sur `NEXT_PUBLIC_ADMIN_EMAIL` (variable publique exposée au client — à ne jamais réintroduire pour de l'autorisation).
- `POST /api/users` (legacy, sans appelant front) : verrouillé — session requise, `id` forcé à `session.userId`, champs sensibles (`phone_verified`, `role`, `total_spent`, `email`) jamais acceptés depuis le body. La création de compte se fait via `verify-phone/confirm`, pas ici.
- Routes admin GET : sélectionner des colonnes explicites, jamais `select('*')` sur `users` (fuite de `password_hash`).

## Sécurité — paiement (lot 02)

- **Le client n'envoie que `[{ id, quantity }]`** au checkout. Prix, total et identité (`user_id`, `client_name`) sont recalculés/dérivés côté serveur (`app/lib/checkout.js` → `loadCartPricing`). Ne JAMAIS refaire confiance à un prix ou total venant du body.
- **Prix remisé fait foi** : prix facturé = `price × (1 - discount_percent/100)` si `discount_percent > 0`. Le front (panier + ProductModal) et le serveur appliquent la même formule → affichage == montant facturé. Avant, le panier facturait le prix brut (bug corrigé).
- **Idempotence par `order_ref`** : UUID généré au checkout, mis dans la metadata de la passerelle, colonne `sales.order_ref` UNIQUE. `finalizePaidOrder()` insère en `upsert(..., { onConflict: 'order_ref', ignoreDuplicates: true })` et ne décrémente stock / incrémente total_spent que si l'insert a réellement eu lieu. Protège contre retry webhook + double verify + course webhook↔verify, pour les deux passerelles.
- **`total_spent` atomique** via RPC `increment_total_spent(p_user_id, p_amount)` (fonction SQL) au lieu d'un read-then-write.
- **`BASE_URL` = `process.env.NEXT_PUBLIC_BASE_URL`** (jamais le header `origin`, manipulable) pour les URLs de redirection et de webhook.
- **Webhook = re-fetch, jamais le body** : Mollie re-fetch le paiement via l'API ; Payrexx re-fetch la transaction (`getPayrexxTransaction`) pour vérifier statut + montant. Un faux POST « confirmed » n'a plus d'effet.
- Logique commune aux deux passerelles factorisée dans `finalizePaidOrder` (montants toujours en centimes en entrée). Bascule Mollie↔Payrexx = uniquement la constante `PAYMENT_GATEWAY` dans `config.js`.
- **Migration** : `supabase/migrations/20260703042537_payment_idempotency.sql` (colonne + index unique + fonction RPC) à exécuter sur la base.
- ⚠️ **Piège** : l'index unique sur `order_ref` doit être **NON partiel**. Un index partiel (`where order_ref is not null`) fait échouer `upsert({...}, { onConflict: 'order_ref' })` avec `42P10` (« no unique constraint matching the ON CONFLICT specification ») → `verify` renvoie 500 → la page confirmation affiche « Paiement en cours » au lieu de « confirmé ». Postgres autorise déjà plusieurs NULL dans un index unique standard, le partiel est inutile.

## Inscription — unicité téléphone

- La table `users` a une contrainte unique sur `phone` (`users_new_phone_key`). L'inscription vérifie désormais l'unicité du téléphone dans `register` (avant l'envoi du SMS) ET dans `verify-phone/confirm` (filet avant l'insert) → renvoie un 409 clair au lieu d'un 500 générique.

## Sécurité — porte IoT (lot 03, partiel)

- Retrait du secret de repli codé en dur (`'secret-de-ouf'`) dans `door/unlock`. Si `DOOR_SECRET` manque, l'ouverture est refusée (500) au lieu d'utiliser un secret public.
- **Reporté volontairement** (attaque jugée trop improbable au stade actuel, à faire évoluer plus tard) : migration vers un broker MQTT privé + TLS, et le token HMAC anti-rejeu (nécessite de modifier le firmware ESP32). Tant qu'on reste sur le broker public `broker.hivemq.com`, le message `unlock:<DOOR_SECRET>` reste capturable/rejouable — risque accepté pour l'instant.

## Sécurité — OTP & login (lot 04)

- **Le code OTP n'est plus stocké en clair.** Le cookie `phone_otp` (JWT signé mais non chiffré, donc décodable en base64) contient désormais `codeHash = HMAC-SHA256(code, pepper)` au lieu de `code`. `app/lib/otp.js` → `hashOtp` / `verifyOtp` (comparaison temps constant). Le SMS envoie toujours le code en clair, seul le token stocke le hash. Pepper = `OTP_PEPPER` (optionnel) sinon `JWT_SECRET`.
  - Les 3 flux OTP de `verify-phone/send` (inscription, changement de numéro, vérif numéro existant) utilisent `codeHash`. `confirm` compare via `verifyOtp`.
- **Rate limiting login** (`api/auth/login`) : verrou après 5 échecs sur fenêtre glissante 15 min, verrou 15 min. Table `login_attempts` + RPCs atomiques `record_login_failure` / `clear_login_attempts` (SELECT FOR UPDATE). Message toujours générique (« Identifiants incorrects ») pour ne pas révéler l'existence de l'email.
- **Anti-énumération par timing** : on vérifie toujours un hash argon2 (réel ou factice mis en cache) même si l'email n'existe pas, pour que le temps de réponse soit constant.
- **Migration** : `supabase/migrations/20260703044847_login_rate_limit.sql`.

## Nettoyage (lot 08)

- Supprimé (code mort confirmé sans appelant) : `app/lib/supabaseClient.js`, `app/lib/userService.js` (les 3 exports jamais appelés — le profil appelle `/api/users/[id]` en direct), route `POST /api/users`, import fantôme `requireAuth` dans `reports`.
- `next-pwa` (v5, non maintenu) retiré de `package.json` : seul `@ducanh2912/next-pwa` (v10) est importé dans `next.config.mjs`.
- `payrexx.js` n'est PAS mort malgré l'absence d'import statique : chargé via `await import('.../payrexx.js')` (dynamique, conditionnel à `PAYMENT_GATEWAY`).

## Prep migration (scripts/)

- `scripts/baseline.sql` : comptage dynamique de toutes les tables + agrégats sensibles. À lancer avant/après la migration DB pour prouver l'intégrité. 100 % Postgres standard (Supabase et local).
- `scripts/smoke-test.md` : checklist des parcours manuels à valider avant de merger `dev`, et après la migration. `avatars` = bucket Storage (pas une table) → migration vérifiée via la section Profil.

## Corrections smoke-test (dev)

- **Redirect admin** : le proxy gère le cas non-connecté (`/admin` → 307 `/home`). Pour un connecté non-admin, le garde reste dans `admin/layout.js` (fetch `/api/auth/me` → rôle). `router.push('/home')` ne naviguait pas de façon fiable (page blanche) → remplacé par `window.location.replace('/home')` (redirection dure garantie) + spinner tant que non autorisé (jamais de `return null` blanc).
- **Nom + email éditables** dans le profil : panneau `panel === 'identity'` (comme le téléphone). Backend `PATCH /api/users/[id]` autorise `email` avec validation + unicité (409) + reset `email_verified` si changé. Rappel : après changement d'email, la reconnexion se fait avec le nouvel email (le JWT courant reste valide car basé sur `userId`, pas l'email).
- **Badge remise dans le panier** : `-X%` + prix barré + prix rouge, cohérent avec la liste produits. Le prix unitaire remisé (`unitPrice`) doit toujours matcher le recalcul serveur (lot 02).

## Migration DB Supabase → Postgres local (lot 10, en cours)

- **Client** : Drizzle. **Hébergement** : dev sur Mac (Docker), puis ancien laptop Windows 11 (Docker Desktop + WSL2), puis VPS Infomaniak (Docker). Même `docker-compose.yml` partout. La base reste **privée** (l'app lui parle en localhost) ; seule l'app doit être publique (webhooks Mollie).
- **Env** (`.env.local`) : `SUPABASE_DB_URL` = source (Supabase), `DATABASE_URL` = cible locale (`postgresql://epico:epico@localhost:5432/epico`).
- **Postgres local** : `docker compose up -d` → conteneur `epico-postgres`, volume `epico_pgdata` (données persistées). `postgres:16`.
- **Schéma cible** : `app/lib/db/schema.ts` (Drizzle). Dérivé de l'introspection (`drizzle/schema.ts`) avec : types corrigés dans `product_list` (`price_chf` numeric, `stock_shelf`/`stock_back` integer, `updated_at` timestamptz), colonnes CSV renommées (`Prix unit. [CHF]` → `prix_unit_chf`, `Prix d'achat [CHF]` → `prix_achat_chf`, etc. — **toutes gardées**), policies RLS Supabase retirées. Appliqué via `npx drizzle-kit push`.
- **Fonctions SQL** : `app/lib/db/functions.sql` (les 3 RPC), à appliquer après `push` sur chaque base.
- **Pièges rencontrés** :
  - Supabase exige SSL mais `sslmode=require` est traité en `verify-full` (bloque) → passer `ssl: { rejectUnauthorized: false }` en objet dans la config Drizzle (pas dans l'URL). La config détecte localhost pour désactiver le SSL en local.
  - Connexion **directe** Supabase (`db.<ref>.supabase.co:5432`) OK ici ; sinon utiliser le pooler.
  - `maxValue: 9223372036854775807` généré par l'introspection dépasse la précision JS → simplifier `sales.id` en `.generatedByDefaultAsIdentity()` sans options.
- **Données migrées ✅** : `scripts/migrate-data.mjs` (source → local, renommages + cast texte→numérique, re-jouable) + `scripts/verify-migration.mjs` (parité comptages + agrégats). Vérifié : 13 tables OK, price_chf converti sans perte.
- **Étape B (accès données) ✅ terminée** : les ~39 fichiers / ~117 requêtes sont converties de Supabase JS vers Drizzle (lots B1→B6 : lib partagées, auth, checkout/porte, routes user-facing, admin, producer). Patron stable : `db.select({...}).from(table).where(eq(...))`, `.returning()` pour insert/update, joins via `leftJoin` + reshape manuel en objet imbriqué (pas de config `relations` Drizzle), `db.execute(sql\`...\`)` pour appeler les RPC SQL.
- **Étape C (Storage avatars) ✅ terminée** : Supabase Storage remplacé par du stockage fichier local.
  - `app/lib/storage.js` : `saveAvatar`/`deleteAvatarByUrl`, fichiers dans `uploads/avatars/` (racine projet, **hors** `public/` — pas mélangé aux assets du build, `predev`/`prebuild` ne touchent que `public/502.html`). Dossier gitignoré (`/uploads/`).
  - `app/api/uploads/avatars/[filename]/route.js` : sert les fichiers avec anti path-traversal (rejette `/` et `..` dans le nom) et content-type dérivé de l'extension.
  - ⚠️ **Piège** : cette route doit être dans la whitelist du `proxy.js` (`/api/uploads/avatars`) sinon le garde-fou du lot 01 la bloque en 401 — les avatars sont des assets publics, comme les images produits.
  - `scripts/migrate-avatars.mjs` : télécharge les avatars encore sur Supabase (URL `http%`) et met à jour `avatar_url` en local. Vérifié en runtime (build + serveur réel) : upload/lecture/traversal/404 tous corrects.
- **Étape D (sauvegardes) ✅ terminée** :
  - `scripts/backup-db.sh [conteneur] [rétention_jours]` : `docker exec ... pg_dump -F c` + `docker cp` vers `backups/epico_<timestamp>.dump` (dossier gitignoré — contient `password_hash`, emails). Rétention par défaut 14 jours (supprime les dumps plus vieux). Ne dépend d'aucun `pg_dump` installé sur l'hôte (tout passe par le conteneur) → même script sur Mac/Windows(Docker Desktop)/VPS Linux.
  - `scripts/restore-db.sh <fichier.dump> [conteneur] [base]` : restauration destructive avec confirmation manuelle (`taper 'oui'`). Cible une base au choix (utile pour tester sans toucher la base de travail).
  - **Vérifié en conditions réelles** : backup réel → restauré dans une base jetable (`epico_restore_test`, créée puis supprimée) → comptages des 13 tables identiques à l'original, et les 3 fonctions RPC (`increment_total_spent`, `record_login_failure`, `clear_login_attempts`) survivent au cycle (essentiel : sans elles, paiement et login cassent après restauration).
  - ⚠️ **Rappel donné par le script à chaque backup** : les dumps restent sur la machine locale. Copier régulièrement `backups/` vers un emplacement externe (disque externe, cloud) — un seul laptop = un seul point de défaillance. Pas encore automatisé (cron/Task Scheduler) — à faire au moment du déploiement réel sur le laptop.
- **Reste à faire** : bascule + smoke-test complet (étape E).
- 🐛 À corriger séparément : `users.total_spent` en numeric(10,2) mais incrémenté en centimes → affichage ×100 (bug pré-existant).

## Force du mot de passe — entropie (app/lib/password.js)

- `getStrength`/`STRENGTH_COLORS`/`STRENGTH_LABELS` sont passés d'un score par comptage de règles (longueur/majuscule/chiffre/symbole) à un score basé sur l'entropie réelle. Deux approches naïves écartées et pourquoi :
  - `longueur × log2(pool)` seule : note "aaaaaaaaaa" presque aussi bien qu'un mot de passe aléatoire de même longueur (répétition non pénalisée) → aurait cassé la validation serveur existante (mot de passe répétitif accepté).
  - Entropie de Shannon pure (fréquence des caractères dans la chaîne) : plafonne à `log2(longueur)` et **sous-note** les mots de passe courts mais mélangeant les classes (ex. `Ab3fG7hK9!` ne notait que 33 bits au lieu de ~66).
  - **Formule retenue** : `getEntropyBits(pwd) = (nb caractères distincts) × log2(taille du pool utilisé)`. Pénalise la répétition (peu de caractères distincts) tout en récompensant la diversité des classes (pool plus grand). `getStrength` en dérive un score 0-4 par seuils (28/40/60 bits).
  - Compteur affiché ("Entropie : X bits") à côté de la barre 4 segments existante, dans `app/page.js` (inscription) et `app/profil/page.js` (changement de mot de passe) — même `getStrength` pilote toujours la barre, donc barre et compteur restent cohérents entre eux.
  - Piège JSX : `d'entropie` en texte brut déclenche `react/no-unescaped-entities` → reformulé en "Entropie : X bits" pour éviter l'apostrophe (même piège que `d'email` rencontré précédemment).

## Champ pays (inscription)

- `app/lib/countries.js` : `COUNTRIES` (191 pays, code ISO 3166-1 alpha-2 + nom FR), ordre = Suisse, France, Allemagne, Italie, puis alphabétique. `COUNTRY_CODES` (Set) pour validation serveur.
- `country` ajouté à `form` (défaut `'CH'`), `<select>` obligatoire dans la section adresse d'inscription (`app/page.js`), validé aussi bien côté client (`if (!form.country)`) que côté serveur (`register/route.js` : `COUNTRY_CODES.has(country)` → 400 sinon).
- L'adresse reste **Suisse uniquement** dans son fonctionnement — le champ pays est indépendant, ne modifie pas la logique d'adresse. Si un jour l'entrée d'adresse doit varier selon le pays choisi, il faudra en tenir compte.

## Adresse en inscription — champ libre (pas d'autocomplete)

- Autocomplete swisstopo retiré du formulaire d'inscription (`app/page.js`) : le champ "Adresse" est une saisie texte libre (`setField('address')`), plus de suggestions/dropdown. État mort supprimé : `addressQuery`, `addressSuggestions`, `showSuggestions`, `addressDebounce`, `addressFromTopo` (et les fonctions `handleAddressInput`/`selectAddress`) — bien penser à les retirer de **tous** les endroits qui réinitialisent le form (ex. `openModal()`), sinon `ReferenceError` au runtime (piège rencontré).
- Conséquence : `address_verified` reste toujours à `0` pour les nouvelles inscriptions (plus de vérification via sélection topo à ce stade). C'est un effet secondaire assumé de la suppression de l'autocomplete.
- `/api/address-search` (swisstopo) n'est **pas** supprimée : encore utilisée par `app/profil/page.js` pour l'édition d'adresse — ne pas y toucher sans demande explicite.

## Numéro de téléphone "compte illimité" (test/démo)

- `UNLIMITED_ACCOUNTS_PHONE` dans `app/lib/config.js` (`+41787215223`) : ce numéro peut être associé à **plusieurs comptes**, contrairement à la règle générale (un numéro = un compte). Décision assumée **y compris en production** (demandé explicitement, pas limité au dev).
- **DB** : contrainte unique remplacée par un index partiel dans `app/lib/db/schema.ts` — `uniqueIndex("users_phone_key_except_special").where(sql\`phone <> ...\`)`. Piège : interpoler la constante via `${UNLIMITED_ACCOUNTS_PHONE}` dans le template `sql` la traite comme un **paramètre lié** (`$1`), invalide dans un prédicat d'index (DDL) → erreur Postgres `42P02`. Il faut l'injecter en SQL brut : `sql.raw(\`'${UNLIMITED_ACCOUNTS_PHONE}'\`)`.
- **Code applicatif** : 3 endroits contournent le check d'unicité pour ce numéro (skip du `SELECT` existant si `phone === UNLIMITED_ACCOUNTS_PHONE`) : `register/route.js`, `verify-phone/confirm/route.js` (CAS 1, création de compte), `verify-phone/send/route.js` (sous-cas changement de numéro, y compris le message "déjà ton numéro actuel").
- Vérifié : au niveau DB (transaction de test avec rollback — le numéro spécial autorise les doublons, un numéro normal reste bloqué) et au niveau `register` (curl réel, deux inscriptions avec emails différents sur le même numéro spécial → toutes deux acceptées).
- ⚠️ Non testé de bout en bout : le cycle OTP complet (SMS réel) n'a pas été rejoué deux fois avec ce numéro — `register` ne fait qu'un pré-check (aucune ligne `users` créée à ce stade), la création réelle du compte se fait dans `verify-phone/confirm`. À valider par l'utilisateur en conditions réelles.

## Arrondi des prix remisés (bug d'écart panier ↔ facturé)

- **Bug** : le panier calculait le prix remisé en virgule flottante (`price × (1 - discount/100)`) et n'arrondissait qu'à l'affichage final, en sommant les lignes. Le serveur (`app/lib/checkout.js`) a toujours arrondi **par unité, en centimes**, avant de multiplier par la quantité. Sur certains prix/quantités, les deux méthodes divergent d'un centime (reproduit : 2.99 CHF, remise 33 %, qté 3 → panier affichait 6.01, serveur facturait 6.00).
- **Correctif** : `app/lib/pricing.js` — `effectivePriceCents(price, discountPercent)`, module partagé client/serveur (aucun import Node, comme `password.js`/`phone.js`). Utilisé désormais dans `app/lib/checkout.js` (serveur), `app/panier/page.js` et `app/components/ProductModal.jsx` (client) : toujours arrondir par unité en centimes AVANT de multiplier par la quantité/sommer, jamais sommer des CHF flottants puis arrondir une fois à la fin.
- Règle à retenir pour tout futur calcul de montant : arrondir au plus petit grain (le centime, par unité), jamais à la fin d'une somme.

## Bug total_spent ×100 (corrigé)

- **Bug** : `finalizePaidOrder` (checkout.js) appelait `increment_total_spent(userId, priceCents)` — passait des **centimes** à une fonction/colonne qui attend des **CHF**. Résultat : `total_spent` gonflé ×100 (18.75 CHF de ventes → 1875.00 affiché). Confirmé en base : `test@gmail.com` avait `total_spent=1875.00` pour `1875` centimes de ventes réelles.
- **Correctif** :
  - `app/lib/db/functions.sql` — `increment_total_spent(p_user_id uuid, p_amount numeric)` (était `integer`, ne pouvait même pas accepter un montant décimal en CHF). `drop function` de l'ancienne signature avant de recréer (Postgres traite un changement de type de paramètre comme une nouvelle fonction surchargée sinon).
  - `app/lib/checkout.js` — passe désormais `priceCents / 100` (CHF) à la fonction, pas les centimes bruts.
  - Donnée corrompue corrigée manuellement pour `test@gmail.com` (seul cas confirmé ×100) : `total_spent / 100`.
  - Vérifié en transaction (rollback) : `18.75 + increment_total_spent(3.75) = 22.50`, correct.
- ⚠️ **Distinct** : `mgbg-group@proton.me` et `max03.bi@pm.me` ont des ventes historiques (mai 2026, avant migration) mais `total_spent = 0.00` — pas le même bug (pas d'inflation ×100, jamais crédité du tout, probablement code Supabase pré-lot-02 ou reset admin). Laissé tel quel (données de dev, sans conséquence).

## Images produits — stockage local (comme les avatars)

- Généralisation de `app/lib/storage.js` en modèle "bucket" (`saveFile(bucket, filename, buffer)` / `deleteFileByUrl(bucket, url)`), utilisé par `avatars` (wrappers `saveAvatar`/`deleteAvatarByUrl` conservés pour compat) et par le nouveau bucket `products`.
- Route de service généralisée : `app/api/uploads/avatars/[filename]` → `app/api/uploads/[bucket]/[filename]` (allowlist `avatars`/`products`). Forme d'URL identique (`/api/uploads/{bucket}/{filename}`), donc **aucune migration nécessaire** pour les avatars déjà stockés — ils continuent de fonctionner tels quels.
- `proxy.js` : whitelist élargie de `/api/uploads/avatars` à `/api/uploads` (couvre les deux buckets, images publiques comme les produits eux-mêmes).
- `app/lib/productImages.js` : `downloadAndStoreProductImage(url)` (télécharge une URL externe, valide, stocke, retourne l'URL locale) et `storeUploadedProductImage(file)` (upload direct multipart). Nom de fichier = UUID aléatoire (pas l'id produit, car un nouveau produit n'a pas encore d'id au moment de l'upload).
  - ⚠️ **Piège rencontré** : certains serveurs distants renvoient un `Content-Type` mal formé (`image` au lieu de `image/jpeg`) → rejeté par une validation stricte du header alors que l'image est parfaitement valide. Fix : `sniffImageType(buffer)` détecte le vrai type via les **octets magiques** (JPEG `FFD8FF`, PNG `89504E47`, GIF `474946 38`, WebP `RIFF...WEBP`), utilisé en repli si le header est absent/non reconnu.
- **Auto-téléchargement à la sauvegarde** : `app/api/admin/products/route.js` (POST + PATCH) télécharge automatiquement toute URL externe collée dans `image_url` et la remplace par le chemin local avant d'écrire en DB. En PATCH, l'ancien fichier local est supprimé après la mise à jour réussie si l'image a changé. Si le téléchargement échoue (lien mort, type non supporté), la sauvegarde du produit est refusée avec un message clair (400) plutôt que d'enregistrer un lien cassé.
- **Upload direct** : nouvelle route `app/api/admin/products/image/route.js` (POST multipart, admin uniquement) + bouton "Fichier" dans `app/admin/produits/page.js` à côté du champ URL — les deux options coexistent (coller un lien externe = téléchargé auto, ou choisir un fichier local = uploadé direct).
- **Migration des 120 produits existants** : `scripts/migrate-product-images.mjs` (même patron self-contained que `migrate-avatars.mjs`, pas d'import cross `app/lib/` — Node standalone ne résout pas les imports sans extension comme le fait le bundler Next). Résultat : 55/60 images externes migrées avec succès, 5 échecs = liens déjà morts en 404 côté fournisseur (aligro.ch/cadar), non récupérables, laissés en l'état (aucune régression, ils ne s'affichaient déjà pas). Script re-jouable : ne retente que les `image_url like 'http%'` restantes.
- Vérifié en conditions réelles : route de service testée via le serveur de dev (200, bon content-type), URL à content-type malformé migrée avec succès grâce au sniffing par octets magiques.

## Cache des images uploadées + Nginx (déploiement)

- **Pourquoi pas `public/`** : les uploads (avatars, produits) restent volontairement **hors** de `public/` (arbre de build). En Docker (laptop/VPS), `uploads/` doit être un volume séparé qui survit aux redéploiements — le mélanger avec `public/` risquerait qu'un futur build/déploiement écrase les données utilisateur. La bonne façon d'accélérer le service de ces fichiers sans ce risque : Nginx en frontal qui sert `/uploads/` en statique, sans passer par Next.js/Node.
- **Cache HTTP différencié par bucket** (`app/api/uploads/[bucket]/[filename]/route.js`) — piège à ne pas reproduire : les **avatars** ont un nom de fichier **stable** (`userId.ext`, réécrit à chaque changement de photo) → cache court (`max-age=3600`), jamais `immutable` sinon une photo périmée resterait affichée indéfiniment après un changement. Les **images produits** ont un nom de fichier = **UUID aléatoire par upload, jamais réécrit** → cache long + `immutable` (`max-age=31536000`) sans risque. Vérifié en conditions réelles (curl sur les deux buckets, en-têtes différents confirmés).
- `deploy/nginx.conf` : config prête à l'emploi pour le déploiement (laptop/VPS) — sert `/uploads/avatars/` et `/uploads/products/` en statique (mêmes politiques de cache que ci-dessus), proxifie le reste vers Next.js, gère TLS. Placeholders à remplir au moment du déploiement réel (domaine, chemins de certificats, chemin absolu du projet).

## Validation zod (lot 06)

- **Fondation** : `app/lib/validation.js` (`parseBody(request, schema)` — parse le JSON, valide, retourne `{ data }` ou `{ error }` — un `NextResponse` 400 prêt à `return`) + `app/lib/schemas.js` (tous les schémas, organisés par domaine : auth, checkout/porte, utilisateur, listes/signalements, admin produits/producteurs/news/commandes/signalements/utilisateurs, producteur).
- **Réutilise les règles métier existantes** au lieu de les dupliquer : `validatePassword`/`validatePhone` via `.superRefine()`, `COUNTRY_CODES` via `z.enum([...COUNTRY_CODES], 'message')`. Zod valide la **forme** (présence, type) ; la logique métier (unicité en DB, recalculs, filtrage fin par ligne dans les tableaux d'articles) reste dans les routes, inchangée.
- ⚠️ **Piège central, à connaître pour tout futur schéma** : `.min(1, 'message')` (ou `.min(2)`, `.regex()`, etc.) ne couvre QUE le cas "champ présent mais invalide/vide". Si le champ est **complètement absent** du body, zod lève une erreur de type générique en anglais ("Invalid input: expected string, received undefined") **avant même** d'atteindre le `.min()`, ignorant le message custom. Pareil pour les tableaux (`z.array(...).min(1, msg)`) et les nombres (`z.coerce.number()`). Solution : passer le message aussi sur le **type de base** — `z.string({ error: message }).min(1, message)`. Les helpers `requiredString(message)`, `requiredArray(schema, message)` et `uuid(label)` dans `schemas.js` encapsulent ce pattern ; toujours les utiliser plutôt que `z.string().min(1, ...)` nu pour un champ obligatoire.
- ⚠️ **Piège coercion silencieuse** : `z.coerce.number()` transforme `null` en `0` (`Number(null) === 0`), pas une erreur. Pour un champ où `null` doit être explicitement rejeté (ex. `lat`/`lng` de la porte, où le code d'origine faisait `if (lat == null) return 'requis'`), utiliser `z.number()` **sans coerce** plutôt que `z.coerce.number()`.
- **Testé sans serveur** : Next (webpack) résout les imports sans extension (`from './storage'`), mais Node standalone (scripts de test rapides, migrations) ne le fait pas — nécessite `.js` explicite ou de tester les schémas isolément (dupliqués dans un script `_test.mjs` temporaire) plutôt que d'importer `app/lib/schemas.js` directement hors du build Next.
- **Couverture** : ~26 routes converties (auth, checkout, porte, utilisateur, listes/signalements, tout `admin/*`, tout `producer/*`). Seule exception volontaire : `checkout/webhook` — payload tiers (Mollie/Payrexx), déjà re-vérifié via l'API de la passerelle plutôt que via le contenu du body (voir lot 02), un schéma zod n'y ajouterait rien.
- Vérifié en conditions réelles (curl, session admin authentifiée) sur toutes les routes admin (products/stock, stocks, producers, news, bulk-orders, reports, users, producer-requests) : champ absent vs invalide donnent chacun le bon message français, et un cas valide (création news) passe correctement de bout en bout (donnée de test nettoyée après coup). Routes publiques/auth (register, login, reports) vérifiées de la même façon sans session. Producteur : vérifié uniquement pour le blocage 401 sans session (pas d'identifiants producteur disponibles).

## Divers

- Commentaires JS : uniquement quand le POURQUOI n'est pas évident dans le code
