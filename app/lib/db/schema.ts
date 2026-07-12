// Schéma cible (Postgres local). Dérivé de l'introspection Supabase, avec :
//  - types numériques corrigés dans product_list (price_chf, stock_shelf, stock_back, updated_at)
//  - colonnes CSV renommées proprement (données conservées)
//  - policies RLS Supabase retirées (référençaient auth.uid(), inutiles en local)
// Propriétés JS en snake_case = Drizzle renvoie la même forme que Supabase (fidélité front).
import {
  pgTable, timestamp, uuid, boolean, text, index, unique, smallint,
  numeric, uniqueIndex, bigint, jsonb, foreignKey, check, date, integer,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const traffic = pgTable("traffic", {
  created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().primaryKey().notNull(),
  user_id: uuid().notNull(),
  success: boolean().notNull(),
  user_name: text(),
});

export const users = pgTable("users", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  name: text(),
  email: text().notNull(),
  phone: text(),
  address: text(),
  postal_code: text(),
  city: text(),
  country: text().default('CH').notNull(),
  address_verified: smallint().default(0).notNull(),
  created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  phone_verified: boolean().default(false).notNull(),
  password_hash: text(),
  avatar_url: text(),
  total_spent: numeric({ precision: 10, scale: 2, mode: 'number' }).default(0),
  email_verified: boolean().default(false),
  role: text(),
}, (t) => [
  index("idx_users_city").using("btree", t.city.asc().nullsLast().op("text_ops")),
  index("idx_users_phone").using("btree", t.phone.asc().nullsLast().op("text_ops")),
  index("idx_users_postal_code").using("btree", t.postal_code.asc().nullsLast().op("text_ops")),
  unique("users_email_unique").on(t.email),
  unique("users_new_phone_key").on(t.phone),
]);

export const sales = pgTable("sales", {
  id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  client_name: text(),
  user_id: uuid(),
  receipt: text(),
  price: bigint({ mode: "number" }).default(sql`'0'`),
  items_json: jsonb(),
  expires_at: timestamp({ withTimezone: true, mode: 'string' }),
  order_ref: text(),
}, (t) => [
  uniqueIndex("sales_order_ref_key").using("btree", t.order_ref.asc().nullsLast().op("text_ops")),
]);

export const news = pgTable("news", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  created_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
  category: text().notNull(),
  type: text(),
  title: text().notNull(),
  subtitle: text(),
  content: text(),
  image1: text(),
  image2: text(),
  is_published: boolean().notNull(),
  link: text(),
  link_name: text(),
}, (t) => [
  unique("news_title_key").on(t.title),
]);

export const reports = pgTable("reports", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  user_id: uuid(),
  type: text().notNull(),
  description: text(),
  status: text().default('pending').notNull(),
  resolved_at: timestamp({ withTimezone: true, mode: 'string' }),
  created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (t) => [
  foreignKey({ columns: [t.user_id], foreignColumns: [users.id], name: "reports_user_id_fkey" }).onDelete("set null"),
]);

export const producer_deliveries = pgTable("producer_deliveries", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  producer_id: uuid().notNull(),
  items: jsonb().default([]).notNull(),
  notes: text(),
  status: text().default('pending').notNull(),
  created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (t) => [
  foreignKey({ columns: [t.producer_id], foreignColumns: [producers.id], name: "producer_deliveries_producer_id_fkey" }).onDelete("cascade"),
  check("producer_deliveries_status_check", sql`status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'cancelled'::text])`),
]);

export const producer_invoices = pgTable("producer_invoices", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  producer_id: uuid().notNull(),
  delivery_id: uuid(),
  invoice_number: text().notNull(),
  items: jsonb().default([]).notNull(),
  amount_chf: numeric({ precision: 10, scale: 2, mode: 'number' }).notNull(),
  status: text().default('draft').notNull(),
  notes: text(),
  sent_at: timestamp({ withTimezone: true, mode: 'string' }),
  paid_at: timestamp({ withTimezone: true, mode: 'string' }),
  created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (t) => [
  foreignKey({ columns: [t.delivery_id], foreignColumns: [producer_deliveries.id], name: "producer_invoices_delivery_id_fkey" }).onDelete("set null"),
  foreignKey({ columns: [t.producer_id], foreignColumns: [producers.id], name: "producer_invoices_producer_id_fkey" }).onDelete("cascade"),
  check("producer_invoices_status_check", sql`status = ANY (ARRAY['draft'::text, 'sent'::text, 'paid'::text])`),
]);

export const saved_lists = pgTable("saved_lists", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  user_id: uuid().notNull(),
  name: text().notNull(),
  items: jsonb().default([]).notNull(),
  created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (t) => [
  foreignKey({ columns: [t.user_id], foreignColumns: [users.id], name: "saved_lists_user_id_fkey" }).onDelete("cascade"),
]);

export const bulk_orders = pgTable("bulk_orders", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  contact_name: text().notNull(),
  contact_email: text(),
  contact_phone: text(),
  event_description: text(),
  event_date: date(),
  items: jsonb().default([]).notNull(),
  subtotal: integer().default(0).notNull(),
  discount_rate: integer().default(0).notNull(),
  total: integer().default(0).notNull(),
  status: text().default('pending').notNull(),
  stripe_payment_link: text(),
  admin_notes: text(),
  resolved_at: timestamp({ withTimezone: true, mode: 'string' }),
  created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const producer_proposals = pgTable("producer_proposals", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  producer_id: uuid().notNull(),
  type: text().notNull(),
  product_id: text(),
  data: jsonb().default({}).notNull(),
  status: text().default('pending').notNull(),
  admin_note: text(),
  created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updated_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (t) => [
  index("idx_producer_proposals_producer").using("btree", t.producer_id.asc().nullsLast().op("uuid_ops")),
  index("idx_producer_proposals_status").using("btree", t.status.asc().nullsLast().op("text_ops")),
  foreignKey({ columns: [t.producer_id], foreignColumns: [producers.id], name: "producer_proposals_producer_id_fkey" }).onDelete("cascade"),
  check("producer_proposals_status_check", sql`status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])`),
  check("producer_proposals_type_check", sql`type = ANY (ARRAY['new_product'::text, 'price_change'::text])`),
]);

export const login_attempts = pgTable("login_attempts", {
  identifier: text().primaryKey().notNull(),
  failed_count: integer().default(0).notNull(),
  first_failed_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  locked_until: timestamp({ withTimezone: true, mode: 'string' }),
});

export const product_list = pgTable("product_list", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  name: text(),
  cadar: text(),
  quantity: text(),
  category: text(),
  producer: text(),
  barcode: text(),
  price_chf: numeric({ precision: 10, scale: 2, mode: 'number' }),  // text → numeric
  image_url: text(),
  description: text(),
  stock_shelf: integer(),                                   // text → integer
  stock_back: integer(),                                    // text → integer
  is_active: boolean().default(true),
  updated_at: timestamp({ withTimezone: true, mode: 'string' }), // text → timestamptz
  badge: text(),
  prix_unit_chf: text(),      // ex-"Prix unit. [CHF]"
  nbre_articles: text(),      // ex-"Nbre. articles"
  lot: text(),                // ex-"Lot"
  prix_achat_chf: text(),     // ex-"Prix d'achat [CHF]"
  expiry_date: date(),
  discount_percent: numeric({ precision: 5, scale: 2, mode: 'number' }),
  discount_until: date(),
});

export const producers = pgTable("producers", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  name: text().notNull(),
  contact_name: text(),
  email: text().notNull(),
  password_hash: text().notNull(),
  phone: text(),
  address: text(),
  description: text(),
  is_active: boolean().default(true).notNull(),
  created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  user_id: uuid(),
}, (t) => [
  index("producers_user_id_idx").using("btree", t.user_id.asc().nullsLast().op("uuid_ops")),
  foreignKey({ columns: [t.user_id], foreignColumns: [users.id], name: "producers_user_id_fkey" }).onDelete("set null"),
  unique("producers_email_key").on(t.email),
]);
