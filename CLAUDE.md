# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Communication

- Réponses courtes et directes, pas de récapitulatif en fin de message
- Pas de commentaires dans le code sauf si le POURQUOI n'est pas évident
- Proposer avant d'implémenter uniquement si la demande est ambiguë
- Si une information dans CLAUDE.md ou lecon.md semble obsolète ou incertaine, demander confirmation à l'utilisateur avant d'agir dessus
- Langue : français

## Mémoire du projet

**Mettre à jour `lecon.md` après chaque échange** qui introduit une nouvelle technique, une préférence validée, ou un choix de design. Ne pas attendre que l'utilisateur le demande. Enlever ce qui n'est plus à jour. Si pas certain d'un choix, demander clarification à l'utilisateur. 

---

## Projet

Application mobile-first (PWA) pour **Épico** — une épicerie autonome sans personnel à Jongny, Suisse. Les clients s'inscrivent, scannent leurs produits en rayon, paient via mobile, et ouvrent la porte avec leur téléphone.

**Stack :** Next.js 16 · React 19 · Supabase (auth + DB) · Tailwind CSS v4 · Mollie (paiement) · MQTT (porte IoT)

---

## Commandes

```bash
npm run dev      # Développement HTTPS local (certificats dans /certificates/)
npm run build    # Build production
npm run lint     # ESLint
```

Le flag `--experimental-https` est inclus dans `dev` : l'app tourne sur `https://localhost:3000`. Nécessaire pour la géolocalisation et la caméra (contexte sécurisé).

### Variables d'environnement requises (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
JWT_SECRET=
MOLLIE_API_KEY=
NEXT_PUBLIC_BASE_URL=
DOOR_SECRET=           # Doit correspondre à UNLOCK_SECRET dans Epico-door/src/config.h
MQTT_BROKER=           # Ex: mqtt://broker.hivemq.com:1883
MQTT_TOPIC=            # Ex: epico/door/command
MQTT_STATUS_TOPIC=     # Ex: epico/door/status
```

---

## Architecture

### Authentification

L'app utilise **un JWT maison** (jose, HS256, 7 jours) stocké dans un cookie `auth_token`, **pas** Supabase Auth. Supabase est utilisé uniquement comme base de données.

- `app/lib/auth.js` — `signToken`, `verifyToken`, `getSession` (server-side via cookie)
- `app/api/auth/` — login, register, logout, me, verify-phone
- Inscription en 2 étapes : infos → vérification OTP SMS → création compte + cookie JWT
- Mode visiteur : `sessionStorage.getItem('app_mode') === 'visitor'` — panier visible, paiement et porte bloqués

### Panier

Le panier est stocké dans `localStorage` ('user_basket') avec TTL de 1 heure glissante.

- `app/lib/basket.js` — `getBasket`, `saveBasket`, `clearBasket`
- Le panier stocke **un item par entrée** (pas une quantité) : 3 yaourts = 3 entrées identiques
- L'affichage les regroupe avec `reduce` pour calculer les quantités
- L'événement DOM `'cart-updated'` notifie `BottomNav` de mettre à jour le badge

### Produits

- Chargés via `GET /api/products` → table Supabase `product_list` (nom configurable dans `config.js`)
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

### Supabase

- **Client** : `app/lib/supabaseClient.js` — instance publique (anon key) pour usage navigateur
- **Serveur** : `app/lib/supabaseServer.js` — `getSupabaseAdmin()` avec service role key, singleton, pour toutes les routes API

### Configuration centralisée

`app/lib/config.js` regroupe les constantes critiques : noms des tables, coordonnées du magasin, rayon GPS, passerelle de paiement.

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
