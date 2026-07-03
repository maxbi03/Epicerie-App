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

## Sécurité — porte IoT (lot 03, partiel)

- Retrait du secret de repli codé en dur (`'secret-de-ouf'`) dans `door/unlock`. Si `DOOR_SECRET` manque, l'ouverture est refusée (500) au lieu d'utiliser un secret public.
- **Reporté volontairement** (attaque jugée trop improbable au stade actuel, à faire évoluer plus tard) : migration vers un broker MQTT privé + TLS, et le token HMAC anti-rejeu (nécessite de modifier le firmware ESP32). Tant qu'on reste sur le broker public `broker.hivemq.com`, le message `unlock:<DOOR_SECRET>` reste capturable/rejouable — risque accepté pour l'instant.

## Sécurité — OTP & login (lot 04)

- **Le code OTP n'est plus stocké en clair.** Le cookie `phone_otp` (JWT signé mais non chiffré, donc décodable en base64) contient désormais `codeHash = HMAC-SHA256(code, pepper)` au lieu de `code`. `app/lib/otp.js` → `hashOtp` / `verifyOtp` (comparaison temps constant). Le SMS envoie toujours le code en clair, seul le token stocke le hash. Pepper = `OTP_PEPPER` (optionnel) sinon `JWT_SECRET`.
  - Les 3 flux OTP de `verify-phone/send` (inscription, changement de numéro, vérif numéro existant) utilisent `codeHash`. `confirm` compare via `verifyOtp`.
- **Rate limiting login** (`api/auth/login`) : verrou après 5 échecs sur fenêtre glissante 15 min, verrou 15 min. Table `login_attempts` + RPCs atomiques `record_login_failure` / `clear_login_attempts` (SELECT FOR UPDATE). Message toujours générique (« Identifiants incorrects ») pour ne pas révéler l'existence de l'email.
- **Anti-énumération par timing** : on vérifie toujours un hash argon2 (réel ou factice mis en cache) même si l'email n'existe pas, pour que le temps de réponse soit constant.
- **Migration** : `supabase/migrations/20260703044847_login_rate_limit.sql`.

## Divers

- Commentaires JS : uniquement quand le POURQUOI n'est pas évident dans le code
