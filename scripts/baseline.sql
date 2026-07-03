-- Baseline d'intégrité avant/après la migration DB (lot 10).
-- À exécuter AVANT la migration (sur Supabase) et APRÈS (sur Postgres local),
-- puis comparer les deux sorties : elles doivent être identiques.
-- 100 % standard Postgres → tourne à l'identique sur les deux bases.

-- ── A. Nombre de lignes par table (comptage dynamique de toutes les tables) ──
-- Pas de liste codée en dur : reflète le schéma réel des deux côtés.
select
  table_name,
  (xpath(
    '/row/c/text()',
    query_to_xml(format('select count(*) as c from %I.%I', table_schema, table_name), false, true, '')
  ))[1]::text::bigint as row_count
from information_schema.tables
where table_schema = 'public'
  and table_type = 'BASE TABLE'
order by table_name;

-- ── B. Agrégats sensibles (argent / accès) — détecte une perte silencieuse ──
select 'users'          as metric, count(*)::bigint as value from public.users
union all
select 'users_total_spent_sum', coalesce(sum(total_spent), 0)::bigint from public.users
union all
select 'sales_count',            count(*)::bigint from public.sales
union all
select 'sales_price_sum',        coalesce(sum(price), 0)::bigint from public.sales
union all
select 'traffic_count',          count(*)::bigint from public.traffic
union all
select 'producers_count',        count(*)::bigint from public.producers;
