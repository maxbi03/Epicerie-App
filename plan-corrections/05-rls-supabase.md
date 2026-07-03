# Modèle recommandé : Sonnet 5 (claude-sonnet-5)
Travail SQL/config Supabase méthodique, peu ambigu mais à faire exhaustivement. Sonnet suffit.

---

## Contexte

App Next.js / Supabase utilisé **comme base de données uniquement** (pas Supabase Auth). Deux clients :
- `app/lib/supabaseServer.js` — `getSupabaseAdmin()` avec **service role key** (bypasse RLS), utilisé par toutes les routes API serveur.
- `app/lib/supabaseClient.js` — client **anon key**, public. La clé anon est exposée au navigateur par nature.

Lis `CLAUDE.md`. Réponds en français, mets à jour `lecon.md`.

## Problème

Si RLS (Row Level Security) n'est **pas** activé sur les tables, n'importe qui possédant l'URL Supabase + la clé anon (toutes deux publiques, `NEXT_PUBLIC_*`) peut lire/écrire directement les tables depuis le navigateur, en contournant complètement les routes API et leur logique d'autorisation.

Comme l'app n'utilise pas Supabase Auth, le modèle correct est : **RLS activé + politiques par défaut « deny all » sur toutes les tables**, l'accès légitime passant exclusivement par le service role (côté serveur, qui bypasse RLS). La clé anon ne doit rien pouvoir faire.

## Travail demandé

### 1. Inventaire des tables
Lister toutes les tables utilisées : grep `.from('...')` dans `app/` pour les identifier. Au minimum d'après le code : `users`, `product_list` (config `PRODUCTS_TABLE`), `sales`, `news`, `bulk_orders`, `traffic`, `reports`, `producers`, plus les tables liées aux producteurs (products/sales/invoices/proposals/deliveries) et listes sauvegardées. Vérifie l'exhaustivité dans le code et via `supabase` CLI si disponible.

### 2. Vérifier l'état RLS actuel
Fournir la requête SQL pour lister les tables avec `rowsecurity = false` :
```sql
select tablename, rowsecurity from pg_tables where schemaname = 'public';
```

### 3. Activer RLS + deny-all
Pour chaque table applicative :
```sql
alter table public.<table> enable row level security;
-- aucune policy permissive pour anon → tout est refusé pour la clé anon
```
Décision explicite : est-ce qu'une table doit être lisible en anon (ex. `product_list`, `news` si le front les lit directement via `supabaseClient`) ? Vérifie si `supabaseClient` est réellement importé quelque part (`grep -rn supabaseClient app/`). D'après l'audit initial il semble **inutilisé** — si c'est confirmé, aucune table n'a besoin de policy anon, et on peut même supprimer `supabaseClient.js`. Sinon, créer des policies `for select using (true)` uniquement sur les tables réellement lues en public.

### 4. Migration versionnée
Mettre tout le SQL dans `supabase/migrations/<timestamp>_enable_rls.sql`, exécutable idempotemment.

## Critères de validation
- `select rowsecurity from pg_tables where schemaname='public'` → `true` partout.
- Un `fetch` direct de la table `users` avec la clé anon depuis le navigateur → 0 ligne / refus.
- Les routes API (service role) continuent de fonctionner normalement (elles bypassent RLS).
- `npm run build` passe.

## Attention
- Ne PAS créer de policies permissives « pour que ça marche » : le service role bypasse déjà RLS, les routes n'ont besoin d'aucune policy. Toute policy anon permissive rouvre le trou.
- Vérifier qu'aucun code front ne dépend d'un accès anon direct avant de tout verrouiller.
