import { generateAccountNumber } from "../shared/account";
import { PERSON_COLOR_ASSIGNMENT } from "../shared/colors";
import { settle } from "../shared/settlement";
import type {
  Expense,
  ExpenseShare,
  Person,
  PaymentMethod,
  SplitMode,
  Trip,
  TripDetail,
  TripRole,
  TripSummary,
} from "../shared/types";
import { HttpError } from "./errors";
import type { ResolvedExpense } from "./expenses";

interface AccountRow {
  id: string;
  number: string;
  created_at: string;
}

interface TripRow {
  id: string;
  account_id: string | null;
  name: string;
  currency: string;
  edit_token: string | null;
  view_token: string | null;
  created_at: string;
}

interface TripSummaryRow extends TripRow {
  people_count: number;
  expense_count: number;
  total_cents: number;
}

interface PersonRow {
  id: string;
  trip_id: string;
  name: string;
  color: string | null;
  payment_methods: string;
  created_at: string;
}

interface ExpenseRow {
  id: string;
  trip_id: string;
  description: string;
  amount_cents: number;
  payer_id: string;
  split_mode: string;
  created_at: string;
}

interface ExpenseShareRow {
  expense_id: string;
  person_id: string;
  amount_cents: number;
}

export interface ResolvedTrip {
  trip: Trip;
  role: TripRole;
  viewToken: string | null;
}

export interface CreatedTrip {
  trip: Trip;
  editToken: string;
  viewToken: string;
}

function newToken(): string {
  return crypto.randomUUID().replaceAll("-", "");
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Error && /unique/i.test(error.message);
}

function toTrip(row: TripRow): Trip {
  return { id: row.id, name: row.name, currency: row.currency, createdAt: row.created_at };
}

function toTripSummary(row: TripSummaryRow): TripSummary {
  return {
    ...toTrip(row),
    peopleCount: row.people_count,
    expenseCount: row.expense_count,
    totalCents: row.total_cents,
    editToken: row.edit_token ?? "",
  };
}

function toPerson(row: PersonRow): Person {
  return {
    id: row.id,
    tripId: row.trip_id,
    name: row.name,
    color: row.color ?? null,
    paymentMethods: JSON.parse(row.payment_methods),
    createdAt: row.created_at,
  };
}

function toExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    tripId: row.trip_id,
    description: row.description,
    amountCents: row.amount_cents,
    payerId: row.payer_id,
    splitMode: (row.split_mode === "custom" ? "custom" : "even") as SplitMode,
    createdAt: row.created_at,
    shares: [],
  };
}

/* ---------- Accounts ---------- */

export async function createAccount(db: D1Database): Promise<{ id: string; number: string }> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const id = crypto.randomUUID();
    const number = generateAccountNumber();
    try {
      await db
        .prepare("INSERT INTO accounts (id, number, created_at) VALUES (?, ?, ?)")
        .bind(id, number, new Date().toISOString())
        .run();
      return { id, number };
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  }
  throw new HttpError(500, "Could not allocate an account number. Please try again.");
}

export async function getAccountByNumber(
  db: D1Database,
  number: string,
): Promise<{ id: string; number: string } | null> {
  const row = await db
    .prepare("SELECT id, number, created_at FROM accounts WHERE number = ?")
    .bind(number)
    .first<AccountRow>();
  return row ? { id: row.id, number: row.number } : null;
}

/* ---------- Trips ---------- */

export async function listTripsForAccount(
  db: D1Database,
  accountId: string,
): Promise<TripSummary[]> {
  const { results } = await db
    .prepare(
      `SELECT
        t.id, t.account_id, t.name, t.currency, t.edit_token, t.view_token, t.created_at,
        (SELECT COUNT(*) FROM people p WHERE p.trip_id = t.id) AS people_count,
        (SELECT COUNT(*) FROM expenses e WHERE e.trip_id = t.id) AS expense_count,
        (SELECT COALESCE(SUM(e.amount_cents), 0) FROM expenses e WHERE e.trip_id = t.id) AS total_cents
      FROM trips t
      WHERE t.account_id = ?
      ORDER BY t.created_at DESC`,
    )
    .bind(accountId)
    .all<TripSummaryRow>();
  return (results ?? []).map(toTripSummary);
}

export async function createTrip(
  db: D1Database,
  accountId: string,
  input: { name: string; currency: string },
): Promise<CreatedTrip> {
  const id = crypto.randomUUID();
  const editToken = newToken();
  const viewToken = newToken();
  const createdAt = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO trips (id, account_id, name, currency, edit_token, view_token, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, accountId, input.name, input.currency, editToken, viewToken, createdAt)
    .run();

  return {
    trip: { id, name: input.name, currency: input.currency, createdAt },
    editToken,
    viewToken,
  };
}

export async function getTrip(db: D1Database, tripId: string): Promise<Trip | null> {
  const row = await db
    .prepare(
      "SELECT id, account_id, name, currency, edit_token, view_token, created_at FROM trips WHERE id = ?",
    )
    .bind(tripId)
    .first<TripRow>();
  return row ? toTrip(row) : null;
}

export async function resolveTripToken(
  db: D1Database,
  token: string,
): Promise<ResolvedTrip | null> {
  if (!token) return null;
  const row = await db
    .prepare(
      `SELECT id, account_id, name, currency, edit_token, view_token, created_at
       FROM trips WHERE edit_token = ? OR view_token = ?`,
    )
    .bind(token, token)
    .first<TripRow>();
  if (!row) return null;

  const role: TripRole = row.edit_token === token ? "edit" : "view";
  return { trip: toTrip(row), role, viewToken: role === "edit" ? row.view_token : null };
}

export async function updateTrip(
  db: D1Database,
  tripId: string,
  patch: { name?: string; currency?: string },
): Promise<Trip | null> {
  const existing = await getTrip(db, tripId);
  if (!existing) return null;
  const name = patch.name ?? existing.name;
  const currency = patch.currency ?? existing.currency;
  await db
    .prepare("UPDATE trips SET name = ?, currency = ? WHERE id = ?")
    .bind(name, currency, tripId)
    .run();
  return { ...existing, name, currency };
}

export async function deleteTrip(db: D1Database, tripId: string): Promise<boolean> {
  const existing = await getTrip(db, tripId);
  if (!existing) return false;
  await db.batch([
    db
      .prepare(
        "DELETE FROM expense_shares WHERE expense_id IN (SELECT id FROM expenses WHERE trip_id = ?)",
      )
      .bind(tripId),
    db.prepare("DELETE FROM expenses WHERE trip_id = ?").bind(tripId),
    db.prepare("DELETE FROM people WHERE trip_id = ?").bind(tripId),
    db.prepare("DELETE FROM trips WHERE id = ?").bind(tripId),
  ]);
  return true;
}

/* ---------- People ---------- */

export async function listPeople(db: D1Database, tripId: string): Promise<Person[]> {
  const { results } = await db
    .prepare(
      "SELECT id, trip_id, name, color, payment_methods, created_at FROM people WHERE trip_id = ? ORDER BY created_at ASC, name ASC",
    )
    .bind(tripId)
    .all<PersonRow>();
  return (results ?? []).map(toPerson);
}

/** First palette color not already used on the trip, else cycles. */
async function nextPersonColor(db: D1Database, tripId: string): Promise<string> {
  const { results } = await db
    .prepare("SELECT color FROM people WHERE trip_id = ?")
    .bind(tripId)
    .all<{ color: string | null }>();
  const used = new Set(
    (results ?? []).map((row) => row.color).filter((value): value is string => Boolean(value)),
  );
  for (const key of PERSON_COLOR_ASSIGNMENT) {
    if (!used.has(key)) return key;
  }
  return PERSON_COLOR_ASSIGNMENT[(results?.length ?? 0) % PERSON_COLOR_ASSIGNMENT.length];
}

export async function addPerson(
  db: D1Database,
  tripId: string,
  name: string,
  color?: string | null,
): Promise<Person> {
  const person: Person = {
    id: crypto.randomUUID(),
    tripId,
    name,
    color: color ?? (await nextPersonColor(db, tripId)),
    paymentMethods: [],
    createdAt: new Date().toISOString(),
  };
  await db
    .prepare(
      "INSERT INTO people (id, trip_id, name, color, payment_methods, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(
      person.id,
      person.tripId,
      person.name,
      person.color,
      JSON.stringify(person.paymentMethods),
      person.createdAt,
    )
    .run();
  return person;
}

export async function updatePerson(
  db: D1Database,
  tripId: string,
  personId: string,
  patch: { color?: string | null; paymentMethods?: readonly PaymentMethod[] },
): Promise<Person | null> {
  const row = await db
    .prepare(
      "SELECT id, trip_id, name, color, payment_methods, created_at FROM people WHERE id = ? AND trip_id = ?",
    )
    .bind(personId, tripId)
    .first<PersonRow>();
  if (!row) return null;

  const person = toPerson(row);
  const color = patch.color !== undefined ? patch.color : person.color;
  const paymentMethods = patch.paymentMethods ?? person.paymentMethods;

  await db
    .prepare("UPDATE people SET color = ?, payment_methods = ? WHERE id = ?")
    .bind(color, JSON.stringify(paymentMethods), personId)
    .run();
  return { ...person, color, paymentMethods };
}

export async function deletePerson(
  db: D1Database,
  tripId: string,
  personId: string,
): Promise<boolean> {
  const person = await db
    .prepare("SELECT id FROM people WHERE id = ? AND trip_id = ?")
    .bind(personId, tripId)
    .first<{ id: string }>();
  if (!person) return false;

  const usage = await db
    .prepare(
      `SELECT
        (SELECT COUNT(*) FROM expenses WHERE payer_id = ?) AS paid_count,
        (SELECT COUNT(*) FROM expense_shares s
          JOIN expenses e ON e.id = s.expense_id
          WHERE s.person_id = ? AND e.trip_id = ?) AS share_count`,
    )
    .bind(personId, personId, tripId)
    .first<{ paid_count: number; share_count: number }>();

  if ((usage?.paid_count ?? 0) > 0 || (usage?.share_count ?? 0) > 0) {
    throw new HttpError(
      409,
      "This person is part of existing expenses. Edit or remove those first.",
    );
  }

  await db.prepare("DELETE FROM people WHERE id = ?").bind(personId).run();
  return true;
}

/* ---------- Expenses ---------- */

export async function listExpenses(db: D1Database, tripId: string): Promise<Expense[]> {
  const [{ results: expenseRows }, { results: shareRows }] = await Promise.all([
    db
      .prepare(
        `SELECT id, trip_id, description, amount_cents, payer_id, split_mode, created_at
         FROM expenses WHERE trip_id = ? ORDER BY created_at ASC, rowid ASC`,
      )
      .bind(tripId)
      .all<ExpenseRow>(),
    db
      .prepare(
        `SELECT s.expense_id, s.person_id, s.amount_cents
         FROM expense_shares s
         JOIN expenses e ON e.id = s.expense_id
         WHERE e.trip_id = ?
         ORDER BY s.rowid ASC`,
      )
      .bind(tripId)
      .all<ExpenseShareRow>(),
  ]);

  const sharesByExpense = new Map<string, ExpenseShare[]>();
  for (const share of shareRows ?? []) {
    const list = sharesByExpense.get(share.expense_id) ?? [];
    list.push({ personId: share.person_id, amountCents: share.amount_cents });
    sharesByExpense.set(share.expense_id, list);
  }

  return (expenseRows ?? []).map((row) => ({
    ...toExpense(row),
    shares: sharesByExpense.get(row.id) ?? [],
  }));
}

export async function createExpense(
  db: D1Database,
  tripId: string,
  input: ResolvedExpense,
): Promise<Expense> {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  await db.batch([
    db
      .prepare(
        `INSERT INTO expenses (id, trip_id, description, amount_cents, payer_id, split_mode, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        tripId,
        input.description,
        input.amountCents,
        input.payerId,
        input.splitMode,
        createdAt,
      ),
    ...input.shares.map((share) =>
      db
        .prepare(
          "INSERT INTO expense_shares (id, expense_id, person_id, amount_cents) VALUES (?, ?, ?, ?)",
        )
        .bind(crypto.randomUUID(), id, share.personId, share.amountCents),
    ),
  ]);

  return {
    id,
    tripId,
    description: input.description,
    amountCents: input.amountCents,
    payerId: input.payerId,
    splitMode: input.splitMode,
    createdAt,
    shares: input.shares,
  };
}

export async function updateExpense(
  db: D1Database,
  tripId: string,
  expenseId: string,
  input: ResolvedExpense,
): Promise<Expense | null> {
  const existing = await db
    .prepare("SELECT id, created_at FROM expenses WHERE id = ? AND trip_id = ?")
    .bind(expenseId, tripId)
    .first<{ id: string; created_at: string }>();
  if (!existing) return null;

  await db.batch([
    db
      .prepare(
        "UPDATE expenses SET description = ?, amount_cents = ?, payer_id = ?, split_mode = ? WHERE id = ?",
      )
      .bind(input.description, input.amountCents, input.payerId, input.splitMode, expenseId),
    db.prepare("DELETE FROM expense_shares WHERE expense_id = ?").bind(expenseId),
    ...input.shares.map((share) =>
      db
        .prepare(
          "INSERT INTO expense_shares (id, expense_id, person_id, amount_cents) VALUES (?, ?, ?, ?)",
        )
        .bind(crypto.randomUUID(), expenseId, share.personId, share.amountCents),
    ),
  ]);

  return {
    id: expenseId,
    tripId,
    description: input.description,
    amountCents: input.amountCents,
    payerId: input.payerId,
    splitMode: input.splitMode,
    createdAt: existing.created_at,
    shares: input.shares,
  };
}

export async function deleteExpense(
  db: D1Database,
  tripId: string,
  expenseId: string,
): Promise<boolean> {
  const existing = await db
    .prepare("SELECT id FROM expenses WHERE id = ? AND trip_id = ?")
    .bind(expenseId, tripId)
    .first<{ id: string }>();
  if (!existing) return false;

  await db.batch([
    db.prepare("DELETE FROM expense_shares WHERE expense_id = ?").bind(expenseId),
    db.prepare("DELETE FROM expenses WHERE id = ?").bind(expenseId),
  ]);
  return true;
}

/* ---------- Aggregates ---------- */

export async function getTripDetail(db: D1Database, token: string): Promise<TripDetail | null> {
  const resolved = await resolveTripToken(db, token);
  if (!resolved) return null;

  const [people, expenses] = await Promise.all([
    listPeople(db, resolved.trip.id),
    listExpenses(db, resolved.trip.id),
  ]);

  return {
    trip: resolved.trip,
    people,
    expenses,
    settlement: settle(people, expenses),
    role: resolved.role,
    ...(resolved.viewToken ? { viewToken: resolved.viewToken } : {}),
  };
}
