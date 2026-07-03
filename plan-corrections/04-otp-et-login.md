# Modèle recommandé : Opus 4.8 (claude-opus-4-8)
Sécurité de l'authentification (OTP, brute-force). Cas limites nombreux (inscription, changement de numéro, renvoi). Raisonnement soigné requis.

---

## Contexte

Auth JWT maison (jose, HS256) dans cookie `auth_token`. Vérification téléphone par OTP SMS (via ASPSMS). Fichiers :
- `app/lib/auth.js` — `signToken`, `signOtpToken` (10 min), `signPendingRegToken` (30 min), `verifyToken`, `getSession`.
- `app/api/auth/verify-phone/send/route.js` — génère l'OTP, l'envoie par SMS, le stocke dans un cookie `phone_otp` (JWT signé).
- `app/api/auth/verify-phone/confirm/route.js` — compare le code saisi.
- `app/api/auth/login/route.js` — login email/mot de passe (argon2).

Lis `CLAUDE.md`. Réponds en français, pas de commentaires superflus, mets à jour `lecon.md`.

## Problèmes à corriger

### 1. 🔴 Le code OTP est lisible dans le cookie
Dans `verify-phone/send/route.js`, le code à 6 chiffres est mis en clair dans le payload du JWT `phone_otp` : `signOtpToken({ ..., code, ... })`. Un JWT est **signé mais pas chiffré** — le payload est du base64 décodable. L'utilisateur (ou quiconque lit le cookie) peut décoder le code sans recevoir le SMS, ce qui vide de sens la vérification téléphone (et donc l'accès à la porte).

**Correctif :** ne jamais stocker le code en clair. Deux options, choisis la plus simple robuste :
- **(préféré)** Stocker en cookie/token uniquement un **hash** du code (ex. SHA-256 de `code + pepper serveur`), et comparer le hash à la confirmation. Adapter `confirm/route.js`.
- Ou stocker l'OTP côté serveur (table `otp_codes` : `identifier`, `code_hash`, `expires_at`, `attempts`) et ne garder qu'un identifiant opaque dans le cookie. Fournir le SQL si cette option.

Garder la limite de tentatives (`attempts`) et l'expiration 10 min.

### 2. 🔴 Aucun rate limiting sur le login
`login/route.js` accepte des tentatives illimitées → brute-force du mot de passe. Le cooldown existe pour l'OTP mais pas pour le login.

**Correctif :** limiter les tentatives par (email + IP). Comme il n'y a pas de Redis, implémenter un compteur simple en DB : table `login_attempts` (`key`, `count`, `window_start`) ou colonnes `failed_login_count` / `locked_until` sur `users`. Après N échecs (ex. 5) sur une fenêtre glissante, renvoyer 429 avec un délai. Réinitialiser au login réussi. Ne pas révéler si l'email existe (garder le message générique « Identifiants incorrects »). Fournir le SQL de migration.

### 3. 🟠 Renforcer la vérif des tentatives OTP
Vérifier que `confirm/route.js` incrémente `attempts` et bloque après N essais (ex. 5), et que le cooldown de renvoi (60 s, déjà présent) ne peut pas être contourné en supprimant le cookie. Envisager de borner aussi le nombre total de SMS envoyés par numéro/jour (coût réel + anti-abus).

## Critères de validation
- Décoder le cookie `phone_otp` en base64 ne révèle plus le code.
- 6+ tentatives de login échouées sur un email → 429.
- Les flux légitimes (inscription 2 étapes, changement de numéro, login) fonctionnent.
- `npm run build` et `npm run lint` passent.
- SQL de migration fourni dans `supabase/migrations/` daté.

## Attention
- Trois flux distincts utilisent l'OTP dans `send/route.js` : inscription (cookie `pending_registration`), changement de numéro (`newPhone` dans le body), vérif du numéro existant. Le correctif du code hashé doit couvrir les trois.
- Ne pas casser le cooldown 60 s ni l'expiration 10 min existants.
