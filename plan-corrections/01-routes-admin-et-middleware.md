# Modèle recommandé : Opus 4.8 (claude-opus-4-8)
Tâche de sécurité critique touchant l'autorisation de toutes les routes. Nécessite du raisonnement sur les cas limites et une revue rigoureuse.

---

## Contexte

App Next.js 16 (App Router) / React 19 / Supabase (DB uniquement, pas Supabase Auth). L'auth repose sur un JWT maison (jose, HS256) dans un cookie `auth_token`. Helpers dans `app/lib/auth.js` (`getSession`), `app/lib/adminUtils.js` (`requireAdmin`), `app/lib/producerAuth.js` (`requireProducer`).

Lis `CLAUDE.md` en entier avant de commencer. Réponds en français, pas de commentaires superflus, mets à jour `lecon.md` à la fin.

## Problème à corriger

Plusieurs routes API exposent ou modifient des données sensibles **sans aucun contrôle d'authentification**. La protection actuelle du dossier admin (`app/admin/layout.js`) est côté client uniquement : elle cache l'UI mais n'empêche pas les appels directs aux routes API.

Failles confirmées :

1. **`app/api/admin/users/route.js`** — `GET` fait `select('*')` sur la table `users` (inclut `password_hash`, `phone`, `address`) **sans auth**. `GET /api/admin/users` dumpe toute la base clients.
2. **`app/api/admin/traffic/route.js`** — `GET` sans auth, expose l'historique des accès à la porte.
3. **`app/api/admin/sales/route.js`** — `GET` sans auth, expose toutes les ventes.
4. **`app/api/users/route.js`** — `POST` fait un `upsert` sur `users` avec un `id` fourni par le client, y compris `phone_verified: true`, **sans auth**. N'importe qui peut créer/écraser un compte vérifié et donc ouvrir la porte du magasin.
5. **Incohérence** : `app/api/admin/users/route.js` définit un helper local `isAdmin()` qui compare l'email de session à `NEXT_PUBLIC_ADMIN_EMAIL` — une variable **publique** exposée au bundle client. Le reste du code utilise `requireAdmin()` (basé sur `role` en DB), qui est la bonne approche.

## Travail demandé

### 1. Créer un `middleware.js` à la racine du projet
Middleware Next.js qui, pour toute requête `/api/*` (sauf la liste blanche ci-dessous) et toute route `/admin*`, vérifie la présence et la validité du JWT. Note : `jose` fonctionne dans le runtime edge du middleware ; `getSupabaseAdmin` (service role) **ne** fonctionne **pas** en edge, donc le middleware ne fait que la vérif JWT + expiration. Le contrôle fin du rôle reste dans les routes (voir point 2).

Liste blanche (routes publiques, pas de JWT requis) :
- `POST /api/auth/login`, `POST /api/auth/register`, `POST /api/auth/logout`
- `/api/auth/verify-phone/*` (gère lui-même les cookies pending/session)
- `POST /api/checkout/webhook` (appelé par Mollie/Payrexx, pas par un user)
- `GET /api/products` (catalogue public)
- `GET /api/news` si consulté par les visiteurs — vérifier l'usage dans `app/news/page.js` avant de trancher.

Pour `/admin*` (pages) : si pas de JWT valide, rediriger vers `/home`. Le contrôle du rôle `admin` reste géré en plus dans le layout ET dans les routes API (défense en profondeur).

### 2. Ajouter le contrôle d'autorisation dans chaque route non protégée
- Dans **toutes** les routes `app/api/admin/*` (GET inclus), appeler `requireAdmin()` en première ligne et renvoyer 403 si `!authorized`. Vérifie chaque fichier du dossier, pas seulement ceux listés.
- Supprimer le helper `isAdmin()` de `app/api/admin/users/route.js` et le remplacer par `requireAdmin()`. Supprimer toute dépendance à `NEXT_PUBLIC_ADMIN_EMAIL` (grep dans tout le repo, y compris le front).
- Dans `app/api/users/route.js` (`POST`) : exiger une session valide via `getSession()`, forcer `id = session.userId` (ignorer tout `id` du body), et **ne jamais** accepter `phone_verified`, `role`, `total_spent` ou tout champ sensible depuis le body. Ces champs ne doivent être modifiables que par les flux serveur dédiés (verify-phone, webhook).
- Vérifier que toutes les routes `app/api/producer/*` appellent bien `requireProducer()`.

### 3. Audit complet
Liste toutes les routes sous `app/api/` et, pour chacune, indique le contrôle d'accès attendu (public / user connecté / producer / admin) et vérifie qu'il est présent. Produis un tableau récapitulatif en fin de tâche.

## Critères de validation
- `GET /api/admin/users` sans cookie → 401 ou 403 (jamais 200 avec des données).
- `POST /api/users` avec un `id` arbitraire et `phone_verified: true` → refusé ou champ ignoré.
- `npm run build` et `npm run lint` passent.
- Les flux légitimes (login, admin connecté, producteur) fonctionnent toujours.

## Attention
- Ne pas casser la liste blanche : un webhook bloqué = paiements non enregistrés.
- Le middleware edge ne peut pas lire la DB : n'y mets aucun appel Supabase.
