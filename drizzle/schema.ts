import { pgTable, timestamp, uuid, boolean, text, index, unique, pgPolicy, smallint, numeric, uniqueIndex, bigint, jsonb, foreignKey, check, date, integer } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const traffic = pgTable("traffic", {
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	success: boolean().notNull(),
	userName: text("user_name"),
});

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text(),
	email: text().notNull(),
	phone: text(),
	address: text(),
	postalCode: text("postal_code"),
	city: text(),
	country: text().default('CH').notNull(),
	addressVerified: smallint("address_verified").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	phoneVerified: boolean("phone_verified").default(false).notNull(),
	passwordHash: text("password_hash"),
	avatarUrl: text("avatar_url"),
	totalSpent: numeric("total_spent", { precision: 10, scale:  2 }).default('0.00'),
	emailVerified: boolean("email_verified").default(false),
	role: text(),
}, (table) => [
	index("idx_users_city").using("btree", table.city.asc().nullsLast().op("text_ops")),
	index("idx_users_phone").using("btree", table.phone.asc().nullsLast().op("text_ops")),
	index("idx_users_postal_code").using("btree", table.postalCode.asc().nullsLast().op("text_ops")),
	unique("users_email_unique").on(table.email),
	unique("users_new_phone_key").on(table.phone),
	pgPolicy("Users can insert own profile", { as: "permissive", for: "insert", to: ["authenticated"], withCheck: sql`(( SELECT auth.uid() AS uid) = id)`  }),
	pgPolicy("Users can insert their own profile", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Users can read own profile", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("Users can read their own profile", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("Users can update own profile", { as: "permissive", for: "update", to: ["authenticated"] }),
	pgPolicy("Users can update their own profile", { as: "permissive", for: "update", to: ["public"] }),
]);

export const sales = pgTable("sales", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity({ name: "ventes_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	clientName: text("client_name"),
	userId: uuid("user_id"),
	receipt: text(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	price: bigint({ mode: "number" }).default(sql`'0'`),
	itemsJson: jsonb("items_json"),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
	orderRef: text("order_ref"),
}, (table) => [
	uniqueIndex("sales_order_ref_key").using("btree", table.orderRef.asc().nullsLast().op("text_ops")),
]);

export const news = pgTable("news", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).notNull(),
	category: text().notNull(),
	type: text(),
	title: text().notNull(),
	subtitle: text(),
	content: text(),
	image1: text(),
	image2: text(),
	isPublished: boolean("is_published").notNull(),
	link: text(),
	linkName: text("link_name"),
}, (table) => [
	unique("news_title_key").on(table.title),
]);

export const reports = pgTable("reports", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	type: text().notNull(),
	description: text(),
	status: text().default('pending').notNull(),
	resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "reports_user_id_fkey"
		}).onDelete("set null"),
]);

export const producerDeliveries = pgTable("producer_deliveries", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	producerId: uuid("producer_id").notNull(),
	items: jsonb().default([]).notNull(),
	notes: text(),
	status: text().default('pending').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.producerId],
			foreignColumns: [producers.id],
			name: "producer_deliveries_producer_id_fkey"
		}).onDelete("cascade"),
	check("producer_deliveries_status_check", sql`status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'cancelled'::text])`),
]);

export const producerInvoices = pgTable("producer_invoices", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	producerId: uuid("producer_id").notNull(),
	deliveryId: uuid("delivery_id"),
	invoiceNumber: text("invoice_number").notNull(),
	items: jsonb().default([]).notNull(),
	amountChf: numeric("amount_chf", { precision: 10, scale:  2 }).notNull(),
	status: text().default('draft').notNull(),
	notes: text(),
	sentAt: timestamp("sent_at", { withTimezone: true, mode: 'string' }),
	paidAt: timestamp("paid_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.deliveryId],
			foreignColumns: [producerDeliveries.id],
			name: "producer_invoices_delivery_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.producerId],
			foreignColumns: [producers.id],
			name: "producer_invoices_producer_id_fkey"
		}).onDelete("cascade"),
	check("producer_invoices_status_check", sql`status = ANY (ARRAY['draft'::text, 'sent'::text, 'paid'::text])`),
]);

export const savedLists = pgTable("saved_lists", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	name: text().notNull(),
	items: jsonb().default([]).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "saved_lists_user_id_fkey"
		}).onDelete("cascade"),
]);

export const bulkOrders = pgTable("bulk_orders", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	contactName: text("contact_name").notNull(),
	contactEmail: text("contact_email"),
	contactPhone: text("contact_phone"),
	eventDescription: text("event_description"),
	eventDate: date("event_date"),
	items: jsonb().default([]).notNull(),
	subtotal: integer().default(0).notNull(),
	discountRate: integer("discount_rate").default(0).notNull(),
	total: integer().default(0).notNull(),
	status: text().default('pending').notNull(),
	stripePaymentLink: text("stripe_payment_link"),
	adminNotes: text("admin_notes"),
	resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const producerProposals = pgTable("producer_proposals", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	producerId: uuid("producer_id").notNull(),
	type: text().notNull(),
	productId: text("product_id"),
	data: jsonb().default({}).notNull(),
	status: text().default('pending').notNull(),
	adminNote: text("admin_note"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_producer_proposals_producer").using("btree", table.producerId.asc().nullsLast().op("uuid_ops")),
	index("idx_producer_proposals_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.producerId],
			foreignColumns: [producers.id],
			name: "producer_proposals_producer_id_fkey"
		}).onDelete("cascade"),
	check("producer_proposals_status_check", sql`status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])`),
	check("producer_proposals_type_check", sql`type = ANY (ARRAY['new_product'::text, 'price_change'::text])`),
]);

export const loginAttempts = pgTable("login_attempts", {
	identifier: text().primaryKey().notNull(),
	failedCount: integer("failed_count").default(0).notNull(),
	firstFailedAt: timestamp("first_failed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	lockedUntil: timestamp("locked_until", { withTimezone: true, mode: 'string' }),
});

export const productList = pgTable("product_list", {
	name: text(),
	cadar: text(),
	quantity: text(),
	category: text(),
	producer: text(),
	barcode: text(),
	priceChf: text("price_chf"),
	imageUrl: text("image_url"),
	description: text(),
	stockShelf: text("stock_shelf"),
	stockBack: text("stock_back"),
	isActive: boolean("is_active").default(true),
	updatedAt: text("updated_at"),
	badge: text(),
	"prixUnit. [chf]": text("Prix unit. [CHF]"),
	nbreArticles: text("Nbre. articles"),
	lot: text("Lot"),
	"prixD'achat [chf]": text("Prix d'achat [CHF]"),
	id: uuid().defaultRandom().primaryKey().notNull(),
	expiryDate: date("expiry_date"),
	discountPercent: numeric("discount_percent", { precision: 5, scale:  2 }),
	discountUntil: date("discount_until"),
});

export const producers = pgTable("producers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	contactName: text("contact_name"),
	email: text().notNull(),
	passwordHash: text("password_hash").notNull(),
	phone: text(),
	address: text(),
	description: text(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	userId: uuid("user_id"),
}, (table) => [
	index("producers_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "producers_user_id_fkey"
		}).onDelete("set null"),
	unique("producers_email_key").on(table.email),
]);
