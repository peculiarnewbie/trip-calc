import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/unstable/http";
import { isValidAccountNumber, normalizeAccountNumber } from "../shared/account";
import { isPersonColorKey } from "../shared/colors";
import { normalizeCurrency } from "../shared/money";
import {
  CreatePersonRequestSchema,
  CreateTripRequestSchema,
  ExpenseRequestSchema,
  UpdatePersonRequestSchema,
  UpdateTripRequestSchema,
} from "../shared/types";
import * as Store from "./db";
import type { Env } from "./env";
import { HttpError } from "./errors";
import { resolveExpenseInput } from "./expenses";

export const EnvService = Context.Service<Env>("Env");

const json = HttpServerResponse.jsonUnsafe;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "Request body must be valid JSON.");
  }
}

function decode<S extends Schema.ConstraintDecoder<unknown>>(schema: S, input: unknown) {
  try {
    return Schema.decodeUnknownSync(schema)(input);
  } catch (error) {
    throw new HttpError(400, errorMessage(error));
  }
}

function errorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return json({ error: error.message }, { status: error.status });
  }
  return json({ error: errorMessage(error) }, { status: 500 });
}

function handle(run: () => Promise<unknown>) {
  return Effect.tryPromise({ try: run, catch: (error) => error }).pipe(
    Effect.map((body) => json(body)),
    Effect.catch((error) => Effect.succeed(errorResponse(error))),
  );
}

async function requireAccount(db: D1Database, header: string | undefined) {
  const number = normalizeAccountNumber(header ?? "");
  if (!isValidAccountNumber(number)) {
    throw new HttpError(401, "A valid account number is required.");
  }
  const account = await Store.getAccountByNumber(db, number);
  if (!account) {
    throw new HttpError(401, "That account number was not found.");
  }
  return account;
}

async function requireEditTrip(db: D1Database, token: string) {
  const resolved = await Store.resolveTripToken(db, token);
  if (!resolved) throw new HttpError(404, "Trip not found.");
  if (resolved.role !== "edit") {
    throw new HttpError(403, "This link is view-only.");
  }
  return resolved.trip;
}

const CreateAccount = HttpRouter.route(
  "POST",
  "/api/accounts",
  Effect.gen(function* () {
    const env = yield* EnvService;
    return yield* handle(() => Store.createAccount(env.DB));
  }),
);

const ListTrips = HttpRouter.route(
  "GET",
  "/api/trips",
  Effect.gen(function* () {
    const env = yield* EnvService;
    const request = yield* HttpServerRequest.HttpServerRequest;
    const accountHeader = request.headers["x-account-number"];
    return yield* handle(async () => {
      const account = await requireAccount(env.DB, accountHeader);
      return Store.listTripsForAccount(env.DB, account.id);
    });
  }),
);

const CreateTrip = HttpRouter.route(
  "POST",
  "/api/trips",
  Effect.gen(function* () {
    const env = yield* EnvService;
    const request = yield* HttpServerRequest.HttpServerRequest;
    const accountHeader = request.headers["x-account-number"];
    const text = yield* request.text;
    return yield* handle(async () => {
      const account = await requireAccount(env.DB, accountHeader);
      const body = decode(CreateTripRequestSchema, parseJson(text));
      const name = body.name.trim();
      if (!name) throw new HttpError(400, "Trip name is required.");
      const created = await Store.createTrip(env.DB, account.id, {
        name,
        currency: normalizeCurrency(body.currency),
      });
      return { trip: created.trip, editToken: created.editToken, viewToken: created.viewToken };
    });
  }),
);

const GetTrip = HttpRouter.route(
  "GET",
  "/api/trips/:token",
  Effect.gen(function* () {
    const env = yield* EnvService;
    const { token } = yield* HttpRouter.params;
    return yield* handle(async () => {
      const detail = await Store.getTripDetail(env.DB, token ?? "");
      if (!detail) throw new HttpError(404, "Trip not found.");
      return detail;
    });
  }),
);

const UpdateTrip = HttpRouter.route(
  "PATCH",
  "/api/trips/:token",
  Effect.gen(function* () {
    const env = yield* EnvService;
    const { token } = yield* HttpRouter.params;
    const request = yield* HttpServerRequest.HttpServerRequest;
    const text = yield* request.text;
    return yield* handle(async () => {
      const trip = await requireEditTrip(env.DB, token ?? "");
      const body = decode(UpdateTripRequestSchema, parseJson(text));
      const name = body.name?.trim();
      if (name !== undefined && name === "") {
        throw new HttpError(400, "Trip name is required.");
      }
      const updated = await Store.updateTrip(env.DB, trip.id, {
        name,
        currency: body.currency ? normalizeCurrency(body.currency) : undefined,
      });
      if (!updated) throw new HttpError(404, "Trip not found.");
      return updated;
    });
  }),
);

const DeleteTrip = HttpRouter.route(
  "DELETE",
  "/api/trips/:token",
  Effect.gen(function* () {
    const env = yield* EnvService;
    const { token } = yield* HttpRouter.params;
    return yield* handle(async () => {
      const trip = await requireEditTrip(env.DB, token ?? "");
      await Store.deleteTrip(env.DB, trip.id);
      return { ok: true };
    });
  }),
);

const AddPerson = HttpRouter.route(
  "POST",
  "/api/trips/:token/people",
  Effect.gen(function* () {
    const env = yield* EnvService;
    const { token } = yield* HttpRouter.params;
    const request = yield* HttpServerRequest.HttpServerRequest;
    const text = yield* request.text;
    return yield* handle(async () => {
      const trip = await requireEditTrip(env.DB, token ?? "");
      const body = decode(CreatePersonRequestSchema, parseJson(text));
      const name = body.name.trim();
      if (!name) throw new HttpError(400, "Name is required.");
      if (body.color !== undefined && !isPersonColorKey(body.color)) {
        throw new HttpError(400, "Unknown color.");
      }
      return Store.addPerson(env.DB, trip.id, name, body.color);
    });
  }),
);

const UpdatePerson = HttpRouter.route(
  "PATCH",
  "/api/trips/:token/people/:personId",
  Effect.gen(function* () {
    const env = yield* EnvService;
    const { token, personId } = yield* HttpRouter.params;
    const request = yield* HttpServerRequest.HttpServerRequest;
    const text = yield* request.text;
    return yield* handle(async () => {
      const trip = await requireEditTrip(env.DB, token ?? "");
      const body = decode(UpdatePersonRequestSchema, parseJson(text));
      if (body.color === undefined && body.paymentInfo === undefined) {
        throw new HttpError(400, "Nothing to update.");
      }
      if (body.color !== undefined && body.color !== null && !isPersonColorKey(body.color)) {
        throw new HttpError(400, "Unknown color.");
      }
      let paymentInfo: string | null | undefined;
      if (body.paymentInfo !== undefined) {
        paymentInfo = body.paymentInfo?.trim() || null;
        if (paymentInfo && paymentInfo.length > 1000) {
          throw new HttpError(400, "Payment info is too long (1000 characters max).");
        }
      }
      const person = await Store.updatePerson(env.DB, trip.id, personId ?? "", {
        color: body.color,
        paymentInfo,
      });
      if (!person) throw new HttpError(404, "Person not found.");
      return person;
    });
  }),
);

const RemovePerson = HttpRouter.route(
  "DELETE",
  "/api/trips/:token/people/:personId",
  Effect.gen(function* () {
    const env = yield* EnvService;
    const { token, personId } = yield* HttpRouter.params;
    return yield* handle(async () => {
      const trip = await requireEditTrip(env.DB, token ?? "");
      const removed = await Store.deletePerson(env.DB, trip.id, personId ?? "");
      if (!removed) throw new HttpError(404, "Person not found.");
      return { ok: true };
    });
  }),
);

const CreateExpense = HttpRouter.route(
  "POST",
  "/api/trips/:token/expenses",
  Effect.gen(function* () {
    const env = yield* EnvService;
    const { token } = yield* HttpRouter.params;
    const request = yield* HttpServerRequest.HttpServerRequest;
    const text = yield* request.text;
    return yield* handle(async () => {
      const trip = await requireEditTrip(env.DB, token ?? "");
      const body = decode(ExpenseRequestSchema, parseJson(text));
      const people = await Store.listPeople(env.DB, trip.id);
      return Store.createExpense(env.DB, trip.id, resolveExpenseInput(body, people, trip.currency));
    });
  }),
);

const UpdateExpense = HttpRouter.route(
  "PATCH",
  "/api/trips/:token/expenses/:expenseId",
  Effect.gen(function* () {
    const env = yield* EnvService;
    const { token, expenseId } = yield* HttpRouter.params;
    const request = yield* HttpServerRequest.HttpServerRequest;
    const text = yield* request.text;
    return yield* handle(async () => {
      const trip = await requireEditTrip(env.DB, token ?? "");
      const body = decode(ExpenseRequestSchema, parseJson(text));
      const people = await Store.listPeople(env.DB, trip.id);
      const expense = await Store.updateExpense(
        env.DB,
        trip.id,
        expenseId ?? "",
        resolveExpenseInput(body, people, trip.currency),
      );
      if (!expense) throw new HttpError(404, "Expense not found.");
      return expense;
    });
  }),
);

const DeleteExpense = HttpRouter.route(
  "DELETE",
  "/api/trips/:token/expenses/:expenseId",
  Effect.gen(function* () {
    const env = yield* EnvService;
    const { token, expenseId } = yield* HttpRouter.params;
    return yield* handle(async () => {
      const trip = await requireEditTrip(env.DB, token ?? "");
      const deleted = await Store.deleteExpense(env.DB, trip.id, expenseId ?? "");
      if (!deleted) throw new HttpError(404, "Expense not found.");
      return { ok: true };
    });
  }),
);

export const ApiRoutes = HttpRouter.addAll([
  CreateAccount,
  ListTrips,
  CreateTrip,
  GetTrip,
  UpdateTrip,
  DeleteTrip,
  AddPerson,
  UpdatePerson,
  RemovePerson,
  CreateExpense,
  UpdateExpense,
  DeleteExpense,
]);
