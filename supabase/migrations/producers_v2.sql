-- ============================================================
-- Migration v2 : propositions producteurs + DLC/remise produits
-- À exécuter dans Supabase > SQL Editor
-- ============================================================

-- Propositions soumises par les producteurs
-- type: 'new_product' | 'price_change'
-- data: objet JSON avec les champs selon le type
create table if not exists producer_proposals (
  id          uuid primary key default gen_random_uuid(),
  producer_id uuid not null references producers(id) on delete cascade,
  type        text not null check (type in ('new_product','price_change')),
  product_id  text,
  data        jsonb not null default '{}',
  status      text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_note  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_producer_proposals_producer on producer_proposals(producer_id);
create index if not exists idx_producer_proposals_status   on producer_proposals(status);

alter table producer_proposals disable row level security;

-- Nouvelles colonnes sur product_list (DLC + remise)
-- Adapter le nom de la table si différent dans config.js
alter table product_list
  add column if not exists expiry_date      date,
  add column if not exists discount_percent numeric(5,2),
  add column if not exists discount_until   date;
