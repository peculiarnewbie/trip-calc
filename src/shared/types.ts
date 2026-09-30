import * as Schema from "effect/Schema";

export const SplitModeSchema = Schema.Literals(["even", "custom"]);
export type SplitMode = Schema.Schema.Type<typeof SplitModeSchema>;

export const TripRoleSchema = Schema.Literals(["edit", "view"]);
export type TripRole = Schema.Schema.Type<typeof TripRoleSchema>;

export const PaymentMethodSchema = Schema.Struct({
  method: Schema.String,
  destination: Schema.String,
});
export type PaymentMethod = Schema.Schema.Type<typeof PaymentMethodSchema>;

export const PersonSchema = Schema.Struct({
  id: Schema.String,
  tripId: Schema.String,
  name: Schema.String,
  /** Palette key from `shared/colors.ts`, or null to use the fallback. */
  color: Schema.NullOr(Schema.String),
  /** Named destinations where this person wants to receive transfers. */
  paymentMethods: Schema.Array(PaymentMethodSchema),
  createdAt: Schema.String,
});
export type Person = Schema.Schema.Type<typeof PersonSchema>;

export const ExpenseShareSchema = Schema.Struct({
  personId: Schema.String,
  amountCents: Schema.Int,
});
export type ExpenseShare = Schema.Schema.Type<typeof ExpenseShareSchema>;

export const ExpenseSchema = Schema.Struct({
  id: Schema.String,
  tripId: Schema.String,
  description: Schema.String,
  amountCents: Schema.Int,
  payerId: Schema.String,
  splitMode: SplitModeSchema,
  createdAt: Schema.String,
  shares: Schema.Array(ExpenseShareSchema),
});
export type Expense = Schema.Schema.Type<typeof ExpenseSchema>;

export const TripSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  currency: Schema.String,
  createdAt: Schema.String,
});
export type Trip = Schema.Schema.Type<typeof TripSchema>;

export const TripSummarySchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  currency: Schema.String,
  createdAt: Schema.String,
  peopleCount: Schema.Int,
  expenseCount: Schema.Int,
  totalCents: Schema.Int,
  /** Capability token used to open the trip with edit rights. */
  editToken: Schema.String,
});
export type TripSummary = Schema.Schema.Type<typeof TripSummarySchema>;

export const BalanceSchema = Schema.Struct({
  personId: Schema.String,
  paidCents: Schema.Int,
  owedCents: Schema.Int,
  netCents: Schema.Int,
});
export type Balance = Schema.Schema.Type<typeof BalanceSchema>;

export const TransferSchema = Schema.Struct({
  fromPersonId: Schema.String,
  toPersonId: Schema.String,
  amountCents: Schema.Int,
});
export type Transfer = Schema.Schema.Type<typeof TransferSchema>;

export const SettlementSchema = Schema.Struct({
  totalCents: Schema.Int,
  balances: Schema.Array(BalanceSchema),
  transfers: Schema.Array(TransferSchema),
});
export type Settlement = Schema.Schema.Type<typeof SettlementSchema>;

export const TripDetailSchema = Schema.Struct({
  trip: TripSchema,
  people: Schema.Array(PersonSchema),
  expenses: Schema.Array(ExpenseSchema),
  settlement: SettlementSchema,
  /** What the token used to open this trip is allowed to do. */
  role: TripRoleSchema,
  /** Only present for edit access, so owners can hand out a view-only link. */
  viewToken: Schema.optional(Schema.String),
});
export type TripDetail = Schema.Schema.Type<typeof TripDetailSchema>;

export const CreateAccountResponseSchema = Schema.Struct({
  number: Schema.String,
});
export type CreateAccountResponse = Schema.Schema.Type<typeof CreateAccountResponseSchema>;

export const CreateTripRequestSchema = Schema.Struct({
  name: Schema.String,
  currency: Schema.optional(Schema.String),
});
export type CreateTripRequest = Schema.Schema.Type<typeof CreateTripRequestSchema>;

export const CreateTripResponseSchema = Schema.Struct({
  trip: TripSchema,
  editToken: Schema.String,
  viewToken: Schema.String,
});
export type CreateTripResponse = Schema.Schema.Type<typeof CreateTripResponseSchema>;

export const UpdateTripRequestSchema = Schema.Struct({
  name: Schema.optional(Schema.String),
  currency: Schema.optional(Schema.String),
});
export type UpdateTripRequest = Schema.Schema.Type<typeof UpdateTripRequestSchema>;

export const CreatePersonRequestSchema = Schema.Struct({
  name: Schema.String,
  color: Schema.optional(Schema.String),
});
export type CreatePersonRequest = Schema.Schema.Type<typeof CreatePersonRequestSchema>;

export const UpdatePersonRequestSchema = Schema.Struct({
  color: Schema.optional(Schema.NullOr(Schema.String)),
  paymentMethods: Schema.optional(Schema.Array(PaymentMethodSchema)),
});
export type UpdatePersonRequest = Schema.Schema.Type<typeof UpdatePersonRequestSchema>;

export const ExpenseRequestSchema = Schema.Struct({
  description: Schema.String,
  amountCents: Schema.Int,
  payerId: Schema.String,
  splitMode: SplitModeSchema,
  participants: Schema.optional(Schema.Array(Schema.String)),
  customShares: Schema.optional(Schema.Array(ExpenseShareSchema)),
});
export type ExpenseRequest = Schema.Schema.Type<typeof ExpenseRequestSchema>;
