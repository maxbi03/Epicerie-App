-- ============================================================
-- Tables pour le portail producteurs locaux
-- À exécuter dans Supabase > SQL Editor
-- ============================================================

-- Producteurs (comptes accès portail)
create table if not exists producers (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  contact_name    text,
  email           text unique not null,
  password_hash   text not null,
  phone           text,
  address         text,
  description     text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

-- Livraisons déclarées par les producteurs
-- items format: [{ product_id, product_name, quantity }]
create table if not exists producer_deliveries (
  id           uuid primary key default gen_random_uuid(),
  producer_id  uuid not null references producers(id) on delete cascade,
  items        jsonb not null default '[]',
  notes        text,
  status       text not null default 'pending' check (status in ('pending','confirmed','cancelled')),
  created_at   timestamptz not null default now()
);

-- Factures émises par les producteurs
-- items format: [{ product_name, quantity, price_unit }]
create table if not exists producer_invoices (
  id             uuid primary key default gen_random_uuid(),
  producer_id    uuid not null references producers(id) on delete cascade,
  delivery_id    uuid references producer_deliveries(id) on delete set null,
  invoice_number text not null,
  items          jsonb not null default '[]',
  amount_chf     numeric(10,2) not null,
  status         text not null default 'draft' check (status in ('draft','sent','paid')),
  notes          text,
  sent_at        timestamptz,
  paid_at        timestamptz,
  created_at     timestamptz not null default now()
);

-- Index
create index if not exists idx_producer_deliveries_producer on producer_deliveries(producer_id);
create index if not exists idx_producer_invoices_producer on producer_invoices(producer_id);

-- RLS : toutes les tables sont accédées via service_role uniquement (côté API)
-- Désactiver RLS si vous n'avez pas de politiques définies
alter table producers          disable row level security;
alter table producer_deliveries disable row level security;
alter table producer_invoices   disable row level security;

-- Lien produits ↔ producteur :
-- Le champ `producer` (text) dans product_list doit correspondre à producers.name
-- Exemple : product_list.producer = 'Ferme des Alpes' ↔ producers.name = 'Ferme des Alpes'
