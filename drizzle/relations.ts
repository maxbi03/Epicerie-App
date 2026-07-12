import { relations } from "drizzle-orm/relations";
import { users, reports, producers, producerDeliveries, producerInvoices, savedLists, producerProposals } from "./schema";

export const reportsRelations = relations(reports, ({one}) => ({
	user: one(users, {
		fields: [reports.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	reports: many(reports),
	savedLists: many(savedLists),
	producers: many(producers),
}));

export const producerDeliveriesRelations = relations(producerDeliveries, ({one, many}) => ({
	producer: one(producers, {
		fields: [producerDeliveries.producerId],
		references: [producers.id]
	}),
	producerInvoices: many(producerInvoices),
}));

export const producersRelations = relations(producers, ({one, many}) => ({
	producerDeliveries: many(producerDeliveries),
	producerInvoices: many(producerInvoices),
	producerProposals: many(producerProposals),
	user: one(users, {
		fields: [producers.userId],
		references: [users.id]
	}),
}));

export const producerInvoicesRelations = relations(producerInvoices, ({one}) => ({
	producerDelivery: one(producerDeliveries, {
		fields: [producerInvoices.deliveryId],
		references: [producerDeliveries.id]
	}),
	producer: one(producers, {
		fields: [producerInvoices.producerId],
		references: [producers.id]
	}),
}));

export const savedListsRelations = relations(savedLists, ({one}) => ({
	user: one(users, {
		fields: [savedLists.userId],
		references: [users.id]
	}),
}));

export const producerProposalsRelations = relations(producerProposals, ({one}) => ({
	producer: one(producers, {
		fields: [producerProposals.producerId],
		references: [producers.id]
	}),
}));