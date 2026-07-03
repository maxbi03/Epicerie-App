# Modèle recommandé : Opus 4.8 (claude-opus-4-8)
Migration structurelle à haut risque : elle touche l'accès aux données de ~39 fichiers / 117 requêtes, plus le stockage de fichiers. Perte de données possible si mal fait. Raisonnement d'architecture + rigueur sur la parité de comportement requis.

---

## Contexte

App Next.js 16 / React 19. Aujourd'hui la base de données est **Supabase (hébergé)**, utilisé **uniquement comme base de données PostgreSQL + stockage de fichiers** — PAS Supabase Auth (auth maison JWT), PAS Realtime, PAS Edge Functions côté app.

Objectif de l'utilisateur : **migrer la base de données en local, stockée directement sur le serveur qui héberge l'app** (plus de dépendance au Supabase hébergé).

Surface réelle mesurée dans le code (à connaître avant de commencer) :
- **~39 fichiers** importent `getSupabaseAdmin()` (`app/lib/supabaseServer.js`, service role) ou `supabaseClient.js` (anon, probablement inutilisé — à confirmer).
- **~117 appels `.from(...)`** avec le query builder PostgREST. Méthodes utilisées : `.select` (84), `.eq` (83), `.single` (38), `.update` (21), `.order` (19), `.insert` (15), `.delete` (7), `.maybeSingle` (5), `.gt/.gte/.lt/.lte` , `.neq`, `.match`, `.in`, `.ilike`, `.upsert`, et `.rpc(...)` (fonctions SQL, notamment celles ajoutées par le lot 02 : `increment_total_spent`).
- **Supabase Storage** est utilisé pour les avatars : `supabase.storage.from('avatars')` (`.upload`, `.remove`, `.getPublicUrl`) dans `app/api/users/avatar/route.js` et `app/api/users/[id]/route.js`. **À migrer aussi** — c'est facile à oublier.

Lis `CLAUDE.md`. Réponds en français, pas de commentaires superflus, mets à jour `lecon.md` ET `CLAUDE.md` (la section Architecture > Supabase et les variables d'env changent).

---

## Décision d'architecture (à valider avec l'utilisateur avant de coder)

La base actuelle est PostgreSQL. Garder **PostgreSQL en local** est le choix par défaut : le schéma, les types, les fonctions SQL/RPC et les migrations existantes (`supabase/migrations/`) se transposent sans réécriture SQL. Deux chemins possibles pour le *runtime* :

### Chemin A — PostgreSQL local + couche d'accès aux données (RECOMMANDÉ)
Postgres tourne sur le serveur (natif ou conteneur Docker), l'app s'y connecte via un client Node (`pg` ou `postgres`), idéalement derrière **Drizzle ORM** (léger, typé, SQL-first, excellent avec Next.js). On retire complètement `@supabase/supabase-js`.
- **Avantage** : suppression totale du vendor lock-in, runtime léger, typage.
- **Coût** : réécrire les ~117 requêtes du query builder Supabase vers Drizzle/SQL. C'est le gros du travail.

### Chemin B — Supabase auto-hébergé (Docker) sur le serveur
Supabase est open source et s'auto-héberge (stack Docker : Postgres + PostgREST + Storage + Kong…). On garde `@supabase/supabase-js` **inchangé**, on ne change que `NEXT_PUBLIC_SUPABASE_URL` / clés vers l'instance locale.
- **Avantage** : quasi zéro changement de code (y compris Storage), migration la plus rapide.
- **Coût** : infra plus lourde à opérer (plusieurs conteneurs) pour une app qui n'utilise que la DB + le storage ; on garde une dépendance à la stack Supabase.

**Recommandation par défaut : Chemin A** si l'objectif est de sortir vraiment de Supabase et d'alléger le serveur. **Chemin B** si la priorité est la rapidité/le moindre risque immédiat. Demander à l'utilisateur avant de trancher ; ce prompt détaille le Chemin A (le plus impliquant).

---

## Travail demandé (Chemin A)

### 1. Base de données locale
- Fournir un `docker-compose.yml` avec un service `postgres` (volume nommé persistant pour que les données vivent sur le serveur, pas dans le conteneur). Alternative native documentée pour ceux qui ne veulent pas Docker.
- Variables d'env : `DATABASE_URL` (ex. `postgres://user:pass@localhost:5432/epico`). Retirer `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` une fois la migration terminée.

### 2. Export / import des données existantes
- Procédure pour exporter le schéma **et** les données depuis le Supabase actuel (`pg_dump` via la connection string Postgres de Supabase, ou l'outil `supabase db dump`).
- Importer dans le Postgres local. Vérifier que les extensions utilisées (ex. `pgcrypto`/`uuid-ossp` pour `gen_random_uuid`/`randomUUID`) sont activées.
- Rejouer les migrations SQL du dossier `supabase/migrations/` (dont celles des lots 02 et 04) sur la base locale.
- **Checklist d'intégrité** : compter les lignes par table avant/après, vérifier quelques enregistrements sensibles (un `users`, une `sales`).

### 3. Couche d'accès aux données
- Introduire **Drizzle** : définir le schéma (`app/lib/db/schema.js`) à partir des tables existantes (`users`, `product_list`, `sales`, `news`, `bulk_orders`, `traffic`, `reports`, `producers`, tables producteurs, listes sauvegardées — faire l'inventaire exhaustif via grep `.from('`). Drizzle peut introspecter la base (`drizzle-kit introspect`) pour générer le schéma automatiquement — utiliser ça comme point de départ.
- Créer un module `app/lib/db/index.js` exposant le client (pool `pg`), en **singleton** comme l'actuel `getSupabaseAdmin` (attention au hot-reload Next en dev : réutiliser l'instance via `globalThis`).
- **Réécrire les requêtes**, fichier par fichier. Établir une table de correspondance et l'appliquer mécaniquement :
  - `.from(t).select('*').eq('id', x).single()` → `db.select().from(t).where(eq(t.id, x))` + prise du premier élément ; distinguer `single()` (erreur si 0) de `maybeSingle()` (null si 0).
  - `.insert(obj).select().single()` → `db.insert(t).values(obj).returning()`.
  - `.update(obj).eq(...)`, `.upsert(...)` (`onConflictDoUpdate`), `.delete().eq(...)`, `.order()`, `.gte()/.lte()/.gt()/.lt()`, `.in()`, `.ilike()`, `.match()` → équivalents Drizzle.
  - `.rpc('increment_total_spent', {...})` → soit une requête SQL `update ... set total_spent = total_spent + $1` via `db.execute(sql\`...\`)`, soit garder la fonction SQL et l'appeler en `sql` brut. Préserver l'atomicité voulue par le lot 02.
- Conserver **exactement** la sémantique existante des erreurs : beaucoup de routes font `const { data, error } = await ...` puis `if (error) return 500`. Le nouveau code doit gérer les erreurs de façon équivalente (try/catch) sans changer les codes HTTP renvoyés.

### 4. Stockage des fichiers (avatars)
`supabase.storage.from('avatars')` doit être remplacé. Deux options :
- **(simple)** Stockage sur le système de fichiers du serveur : un dossier `uploads/avatars/` **hors** du bundle, servi via une route Next (`app/api/uploads/...` ou un reverse-proxy nginx). Gérer upload (avec `sharp`, déjà présent, pour redimensionner), suppression de l'ancien fichier, et génération de l'URL publique. Attention : sur un déploiement serverless le FS est éphémère — ici c'est un serveur dédié, donc OK, mais le documenter.
- **(compatible S3)** MinIO auto-hébergé si on veut une API type objet. Plus lourd ; ne le proposer que si l'utilisateur prévoit du multi-serveur.
Migrer les avatars existants depuis Supabase Storage vers le nouveau stockage, et mettre à jour les URLs stockées en DB.

### 5. Sécurité / RLS
Rappel : sans Supabase + PostgREST exposé publiquement, la surface d'attaque « clé anon » du lot 05 (RLS) **disparaît** — l'app parle à Postgres via une connection string serveur uniquement, jamais exposée au client. Coordonner avec le lot 05 : si la migration DB locale est faite, le durcissement RLS devient sans objet (mais garder `enable row level security` par prudence ne coûte rien). Documenter ce changement de modèle de menace.

### 6. Sauvegardes (NOUVELLE responsabilité — critique)
Avec Supabase hébergé, les backups étaient gérés par le fournisseur. **En local, c'est à vous.** Fournir :
- un script de dump périodique (`pg_dump` → fichier daté), lançable par cron,
- la procédure de restauration testée,
- une note dans `CLAUDE.md` sur la rétention et le stockage off-site des backups (un serveur unique = point de défaillance unique).

---

## Critères de validation
- L'app tourne entièrement sur la base Postgres locale, `@supabase/supabase-js` retiré des dépendances (`package.json`) et plus aucun import Supabase (`grep -rn supabase app/` vide, hors historique migrations).
- Parité comportementale : chaque route renvoie les mêmes réponses/codes HTTP qu'avant (tester les flux clés : login, register+OTP, checkout+webhook, unlock, upload avatar, pages admin).
- Compte de lignes identique avant/après migration sur toutes les tables.
- Upload et suppression d'avatar fonctionnent avec le nouveau stockage.
- Un backup peut être créé puis restauré sur une base vierge avec succès.
- `npm run build` et `npm run lint` passent.

## Attention
- **Faire ce lot APRÈS les lots 02 et 04** (qui ajoutent des migrations SQL et des fonctions RPC), sinon il faudra les re-porter. Idéalement : geler les autres chantiers pendant la migration.
- Migrer **une table / un domaine de routes à la fois**, en vérifiant au fur et à mesure, plutôt qu'un big-bang sur 117 requêtes.
- Ne pas perdre les données : travailler sur une **copie** exportée, garder le Supabase hébergé actif en lecture jusqu'à validation complète, ne le couper qu'à la fin.
- Le `gen_random_uuid()` / défauts de colonnes / contraintes / index doivent être reproduits fidèlement (l'introspection Drizzle aide, mais vérifier les défauts et les FKs à la main).
- Ne pas oublier le pooling de connexions (un `pg.Pool`, pas une connexion par requête) et la réutilisation du singleton en dev (hot-reload).
