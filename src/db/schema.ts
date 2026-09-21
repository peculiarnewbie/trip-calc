import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const accounts = sqliteTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    number: text("number").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("accounts_number_idx").on(table.number)],
);

export const trips = sqliteTable(
  "trips",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").references(() => accounts.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    currency: text("currency").notNull().default("USD"),
    editToken: text("edit_token"),
    viewToken: text("view_token"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("trips_account_idx").on(table.accountId),
    index("trips_edit_token_idx").on(table.editToken),
    index("trips_view_token_idx").on(table.viewToken),
  ],
);

export const people = sqliteTable(
  "people",
  {
    id: text("id").primaryKey(),
    tripId: text("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color"),
    paymentInfo: text("payment_info"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("people_trip_idx").on(table.tripId)],
);

export const expenses = sqliteTable(
  "expenses",
  {
    id: text("id").primaryKey(),
    tripId: text("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    amountCents: integer("amount_cents").notNull(),
    payerId: text("payer_id").notNull(),
    splitMode: text("split_mode").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("expenses_trip_idx").on(table.tripId)],
);

export const expenseShares = sqliteTable(
  "expense_shares",
  {
    id: text("id").primaryKey(),
    expenseId: text("expense_id")
      .notNull()
      .references(() => expenses.id, { onDelete: "cascade" }),
    personId: text("person_id").notNull(),
    amountCents: integer("amount_cents").notNull(),
  },
  (table) => [index("expense_shares_expense_idx").on(table.expenseId)],
);

export type AccountRow = typeof accounts.$inferSelect;
export type NewAccountRow = typeof accounts.$inferInsert;
export type TripRow = typeof trips.$inferSelect;
export type NewTripRow = typeof trips.$inferInsert;
export type PersonRow = typeof people.$inferSelect;
export type NewPersonRow = typeof people.$inferInsert;
export type ExpenseRow = typeof expenses.$inferSelect;
export type NewExpenseRow = typeof expenses.$inferInsert;
export type ExpenseShareRow = typeof expenseShares.$inferSelect;
export type NewExpenseShareRow = typeof expenseShares.$inferInsert;
