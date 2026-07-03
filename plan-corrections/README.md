# Plan de corrections — Épico

Chaque fichier de ce dossier est un **prompt autonome** à coller dans une nouvelle session Claude Code (un agent par fichier). L'ordre est celui des priorités : commence par 01, puis 02, etc. Les lots 01 à 04 sont bloquants (argent / accès physique / fuite de données) et doivent partir en premier.

Le modèle recommandé est indiqué en tête de chaque fichier. Règle générale :
- **Opus 4.8** → sécurité, paiement, IoT, tout ce qui touche à l'argent ou à l'accès physique.
- **Sonnet 5** → implémentation standard, refactor, validation.
- **Haiku 4.5** → nettoyage mécanique, suppression de code mort.

## Ordre d'exécution

| # | Fichier | Sujet | Gravité | Modèle |
|---|---------|-------|---------|--------|
| 01 | `01-routes-admin-et-middleware.md` | Auth manquante sur routes admin + middleware central | 🔴 Critique | Opus 4.8 |
| 02 | `02-securite-paiement.md` | Total serveur, dédup, atomicité, baseUrl, webhook | 🔴 Critique | Opus 4.8 |
| 03 | `03-porte-iot-mqtt.md` | Broker privé TLS + token anti-replay + firmware | 🔴 Critique | Opus 4.8 |
| 04 | `04-otp-et-login.md` | OTP hors du cookie + rate limiting login | 🔴 Critique | Opus 4.8 |
| 05 | `05-rls-supabase.md` | Activer RLS sur toutes les tables | 🟠 Élevée | Sonnet 5 |
| 06 | `06-validation-zod.md` | Validation d'entrée systématique (zod) | 🟠 Élevée | Sonnet 5 |
| 07 | `07-refactor-pages.md` | Découpage des pages monolithiques | 🟡 Moyenne | Sonnet 5 |
| 08 | `08-nettoyage-stack.md` | Doublon PWA, code mort, logs sensibles | 🟡 Basse | Haiku 4.5 |
| 09 | `09-tests.md` | Tests d'intégration checkout + auth | 🟡 Moyenne | Sonnet 5 |
| 10 | `10-migration-db-locale.md` | Migration DB Supabase → PostgreSQL local sur le serveur | 🟠 Structurel | Opus 4.8 |

## Dépendances entre lots

- **10 (migration DB locale)** doit passer **après 02 et 04** (qui ajoutent des migrations SQL + fonctions RPC), sinon il faut les re-porter. Idéalement, geler les autres chantiers pendant la migration.
- **10 rend 05 (RLS) largement caduc** : sans Supabase/PostgREST exposé publiquement, la surface d'attaque « clé anon » disparaît. Si tu prévois la migration à court terme, tu peux faire 10 avant 05 (ou fusionner la réflexion sécurité des deux).
- **08** (suppression de `supabaseClient.js`) est de toute façon absorbé par **10** (qui retire tout Supabase).

## Règles communes à tous les lots

- Respecter `CLAUDE.md` : réponses en français, pas de commentaires inutiles, mettre à jour `lecon.md`.
- Ne rien casser des flux existants : tester `npm run build` et `npm run lint` avant de conclure.
- Ne pas committer sans que l'utilisateur le demande.
- Un lot = une branche git dédiée si possible.
