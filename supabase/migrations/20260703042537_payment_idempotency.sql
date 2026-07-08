-- Idempotence des paiements + incrément atomique de total_spent (lot 02)

-- 1. Clé d'idempotence sur les ventes : un même order_ref ne peut être inséré
--    qu'une fois (retry webhook, double appel verify, course webhook↔verify).
alter table public.sales
  add column if not exists order_ref text;

-- Index unique NON partiel : requis pour que `INSERT ... ON CONFLICT (order_ref)`
-- (upsert idempotent) fonctionne. Postgres autorise déjà plusieurs NULL dans un
-- index unique, donc les anciennes ventes sans order_ref ne créent pas de conflit.
create unique index if not exists sales_order_ref_key
  on public.sales (order_ref);

-- 2. Incrément atomique de total_spent (évite le read-then-write concurrent).
create or replace function public.increment_total_spent(p_user_id uuid, p_amount integer)
returns void
language sql
as $$
  update public.users
     set total_spent = coalesce(total_spent, 0) + p_amount
   where id = p_user_id;
$$;
