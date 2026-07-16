# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Communication

- Réponses courtes et directes, pas de récapitulatif en fin de message
- Pas de commentaires dans le code sauf si le POURQUOI n'est pas évident
- Proposer avant d'implémenter uniquement si la demande est ambiguë
- Si une information dans CLAUDE.md ou lecon.md semble obsolète ou incertaine, demander confirmation à l'utilisateur avant d'agir dessus
- Langue : français
- **Au début de chaque tâche, recommander le modèle le plus adapté** avec une courte justification. Repère : Opus / Fable pour la sécurité, le paiement, l'IoT et l'architecture complexe ; Sonnet pour l'implémentation standard, le refactor et la conversion mécanique ; Haiku pour le nettoyage à faible risque (suppression de code mort, edits triviaux).

## Mémoire du projet

**Mettre à jour `lecon.md` après chaque échange** qui introduit une nouvelle technique, une préférence validée, ou un choix de design. Ne pas attendre que l'utilisateur le demande. Enlever ce qui n'est plus à jour. Si pas certain d'un choix, demander clarification à l'utilisateur. 

---

## Projet

Application mobile-first (PWA) pour **Épico** — une épicerie autonome sans personnel à Jongny, Suisse. Les clients s'inscrivent, scannent leurs produits en rayon, paient via mobile, et ouvrent la porte avec leur téléphone.

**Stack :** Next.js 16 · React 19 · PostgreSQL local (Docker) + Drizzle ORM · Tailwind CSS v4 · Mollie (paiement) · MQTT (porte IoT)

---

## Commandes

```bash
npm run dev      # Développement HTTPS local (certificats dans /certificates/)
npm run build    # Build production
npm run lint     # ESLint
```

Le flag `--experimental-https` est inclus dans `dev` : l'app tourne sur `https://localhost:3000`. Nécessaire pour la géolocalisation et la caméra (contexte sécurisé).

**Avant `npm run dev`**, la base Postgres locale doit tourner : `docker compose up -d` (voir section Base de données).

### Variables d'environnement requises (`.env.local`)

```
DATABASE_URL=          # postgresql://epico:epico@localhost:5432/epico (Postgres local, Docker)
JWT_SECRET=
OTP_PEPPER=             # optionnel, sinon JWT_SECRET est réutilisé comme pepper (voir app/lib/otp.js)
MOLLIE_API_KEY=
NEXT_PUBLIC_BASE_URL=
DOOR_SECRET=           # Doit correspondre à UNLOCK_SECRET dans Epico-door/src/config.h — pas de fallback, requis
MQTT_BROKER=           # Ex: mqtt://broker.hivemq.com:1883 (broker public, durcissement reporté — voir lecon.md)
MQTT_TOPIC=            # Ex: epico/door/command
MQTT_STATUS_TOPIC=     # Ex: epico/door/status
ASPSMS_USERKEY=
ASPSMS_PASSWORD=
ASPSMS_ORIGINATOR=      # optionnel, défaut "Epicerie"
```

`SUPABASE_DB_URL` (source, plus utilisée qu'exceptionnellement) subsiste dans `.env.local` uniquement pour rejouer un script de migration ponctuel si besoin (`scripts/migrate-*.mjs`) — l'app elle-même ne s'en sert plus.

---

## Architecture

### Authentification

L'app utilise **un JWT maison** (jose, HS256, 7 jours) stocké dans un cookie `auth_token`. Le JWT ne contient QUE `{ userId, email }` — jamais de rôle (`session.role` est toujours `undefined`, ne jamais s'y fier). Le rôle admin se vérifie via `requireAdmin()` (lookup DB), le rôle producteur via `requireProducer()` (existence d'une ligne `producers` liée).

- `app/lib/auth.js` — `signToken`, `verifyToken`, `getSession` (server-side via cookie)
- `app/api/auth/` — login, register, logout, me, verify-phone
- Inscription en 2 étapes : infos → vérification OTP SMS → création compte + cookie JWT
- Mode visiteur : `sessionStorage.getItem('app_mode') === 'visitor'` — panier visible, paiement et porte bloqués
- **`proxy.js`** (racine, garde-fou central) : toute route `/api/*` hors liste blanche exige un JWT valide (401 sinon) ; `/admin*` redirige vers `/home` sans JWT valide. Le contrôle du rôle reste dans les routes/layout (défense en profondeur). En Next 16, `middleware.js` est déprécié au profit de `proxy.js` (`export async function proxy(request)`).
- Login protégé par rate limiting (verrou 15 min après 5 échecs, table `login_attempts`) ; OTP stocké haché (jamais en clair) dans le cookie.

### Validation des entrées

Toutes les routes API acceptant un body (sauf `checkout/webhook`, payload tiers) valident via **zod**, schémas centralisés dans `app/lib/schemas.js`, appelés via le helper `parseBody(request, schema)` de `app/lib/validation.js`. Piège à connaître avant d'ajouter un nouveau schéma : voir `lecon.md` section "Validation zod" (message custom qui disparaît si le champ est complètement absent, coercition silencieuse `null → 0`).

### Panier

Le panier est stocké dans `localStorage` ('user_basket') avec TTL de 1 heure glissante.

- `app/lib/basket.js` — `getBasket`, `saveBasket`, `clearBasket`
- Le panier stocke **un item par entrée** (pas une quantité) : 3 yaourts = 3 entrées identiques
- L'affichage les regroupe avec `reduce` pour calculer les quantités
- L'événement DOM `'cart-updated'` notifie `BottomNav` de mettre à jour le badge

### Produits

- Chargés via `GET /api/products` → table Postgres `product_list` (nom configurable dans `config.js`)
- Mis en cache dans `localStorage` ('products_cache')
- Scanner EAN-13 : matching code-barres dans le cache local → `ProductModal`

### Porte IoT

Flux : `HomePage` → GPS haversine check → `POST /api/door/unlock` → publish MQTT → ESP32 (PlatformIO/Arduino) active le relais → confirmation MQTT retournée.

- Conditions côté serveur : session JWT valide + `phone_verified = true` + distance ≤ `DOOR_UNLOCK_RADIUS_M` (400m)
- Firmware : `Epico-door/` — projet PlatformIO, config dans `config.h`
- GPS côté client : `enableHighAccuracy: false` + `maximumAge: Infinity` pour position réseau rapide (WiFi/cell)

### Paiement

- Passerelle configurable dans `config.js` : `PAYMENT_GATEWAY = 'mollie'` ou `'payrexx'`
- `POST /api/checkout` crée le paiement et retourne une `checkoutUrl`
- `POST /api/checkout/webhook` reçoit la confirmation → décrémente le stock via `updateStockAfterPayment()` → incrémente `total_spent` dans `users`
- En local (localhost), le webhook n'est pas enregistré chez Mollie (lignes conditionnelles dans la route)

### Base de données

PostgreSQL local (conteneur Docker `epico-postgres`, volume `epico_pgdata` persistant), accédé via **Drizzle ORM**. Plus aucune dépendance runtime à Supabase (migration complète, voir `lecon.md`).

- `docker-compose.yml` — service Postgres, à lancer avant `npm run dev` (`docker compose up -d`)
- `app/lib/db/index.js` — client Drizzle (pool `pg` singleton)
- `app/lib/db/schema.ts` — schéma (source de vérité), propriétés en snake_case pour que Drizzle renvoie la même forme que l'ancien SDK Supabase
- `app/lib/db/functions.sql` — fonctions RPC (`increment_total_spent`, `record_login_failure`, `clear_login_attempts`), à réappliquer sur toute nouvelle base (`docker exec -i epico-postgres psql -U epico -d epico < app/lib/db/functions.sql`)
- Migrations de schéma : `npx drizzle-kit push` (pas de dossier `drizzle/migrations` généré, on pousse directement le schéma)
- Sauvegardes : `scripts/backup-db.sh` / `scripts/restore-db.sh` (testées, voir `lecon.md`)
- Stockage fichiers (avatars, images produits) : `app/lib/storage.js`, système de fichiers local dans `uploads/` (**hors** `public/`, volume Docker séparé au déploiement) — jamais Supabase Storage

### Configuration centralisée

`app/lib/config.js` regroupe les constantes critiques : noms des tables, coordonnées du magasin, rayon GPS, passerelle de paiement.

### Déploiement (laptop / VPS)

- `deploy/nginx.conf` — config prête à l'emploi (reverse-proxy + TLS + service statique de `/uploads/`), **pas encore branchée**. Le jour où on la met en place :
  - Remplir les placeholders (domaine, chemins de certificats, chemin absolu du projet).
  - Vérifier que les politiques de cache Nginx pour `/uploads/avatars/` (court, 1h) et `/uploads/products/` (long, immutable) restent cohérentes avec celles définies dans `app/api/uploads/[bucket]/[filename]/route.js` — si l'une change, penser à répercuter sur l'autre.
  - `uploads/` doit être monté comme un **volume Docker séparé** du code de l'app (survit aux redéploiements) — ne jamais le mettre dans `public/`.

---

## UI / Design

### Tokens CSS

Définis dans `app/styles/tokens.css`, consommés dans Tailwind v4 via `@theme inline`.

- Couleur principale : `--primary: #669933` (light) / `#88bb44` (dark)
- Classes Tailwind disponibles : `bg-primary`, `text-primary`, `bg-primary-light`, `text-text-primary`, `text-text-muted`, `bg-card-bg`, `bg-app-bg`, etc.

### Navigation

- Layout : `body (flex justify-center)` → `div (w-full max-w-md flex flex-col h-dvh)` → `Header (shrink-0)` → `main (flex-1 overflow-hidden)` → `BottomNav (shrink-0)`
- Le `max-w-md` est centralisé dans le layout — les pages n'ont pas à le répéter
- `BottomNav` est dans le flux normal (pas `fixed`) — `main` prend exactement l'espace entre les deux, rien ne passe sous la nav
- `BottomNav` retourne `null` sur `/` et `/admin*` — `main` occupe alors tout l'espace automatiquement
- `Header` — titre centré absolument (`absolute left-1/2 -translate-x-1/2`), bouton admin conditionnel à droite
- Pas de `pb-*` à ajouter sur les pages

### Composants clés

- `ProductModal` — modal flottant centré (`items-center justify-center`), z-index 60, max-h 80vh
- `BottomNav` — masqué sur `/` et `/admin*`

---

## Firmware IoT (`Epico-door/`)

Projet PlatformIO séparé (ESP32). Ne pas modifier sans comprendre le circuit physique.

- `TEST_MODE true` → active la LED D2 au lieu du relais (mode développement)
- Le secret partagé `UNLOCK_SECRET` dans `config.h` doit correspondre à `DOOR_SECRET` dans `.env.local`
- Topics MQTT : `epico/door/command` (commandes) et `epico/door/status` (confirmations)
