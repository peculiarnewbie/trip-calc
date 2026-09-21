import type {
  CreateAccountResponse,
  CreatePersonRequest,
  CreateTripRequest,
  CreateTripResponse,
  Expense,
  ExpenseRequest,
  Person,
  Trip,
  TripDetail,
  TripSummary,
  UpdatePersonRequest,
  UpdateTripRequest,
} from "../shared/types";

const enc = encodeURIComponent;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  const text = await response.text();

  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return data as T;
}

function jsonInit(method: string, body: unknown, extra?: Record<string, string>): RequestInit {
  return {
    method,
    headers: { "content-type": "application/json", ...extra },
    body: JSON.stringify(body),
  };
}

function accountInit(accountNumber: string): Record<string, string> {
  return { "x-account-number": accountNumber };
}

export const api = {
  createAccount: () => request<CreateAccountResponse>("/api/accounts", { method: "POST" }),

  trips: (accountNumber: string) =>
    request<TripSummary[]>("/api/trips", { headers: accountInit(accountNumber) }),

  createTrip: (accountNumber: string, body: CreateTripRequest) =>
    request<CreateTripResponse>("/api/trips", jsonInit("POST", body, accountInit(accountNumber))),

  trip: (token: string) => request<TripDetail>(`/api/trips/${enc(token)}`),

  updateTrip: (token: string, body: UpdateTripRequest) =>
    request<Trip>(`/api/trips/${enc(token)}`, jsonInit("PATCH", body)),

  deleteTrip: (token: string) =>
    request<{ ok: boolean }>(`/api/trips/${enc(token)}`, { method: "DELETE" }),

  addPerson: (token: string, body: CreatePersonRequest) =>
    request<Person>(`/api/trips/${enc(token)}/people`, jsonInit("POST", body)),

  updatePerson: (token: string, personId: string, body: UpdatePersonRequest) =>
    request<Person>(`/api/trips/${enc(token)}/people/${enc(personId)}`, jsonInit("PATCH", body)),

  removePerson: (token: string, personId: string) =>
    request<{ ok: boolean }>(`/api/trips/${enc(token)}/people/${enc(personId)}`, {
      method: "DELETE",
    }),

  createExpense: (token: string, body: ExpenseRequest) =>
    request<Expense>(`/api/trips/${enc(token)}/expenses`, jsonInit("POST", body)),

  updateExpense: (token: string, expenseId: string, body: ExpenseRequest) =>
    request<Expense>(
      `/api/trips/${enc(token)}/expenses/${enc(expenseId)}`,
      jsonInit("PATCH", body),
    ),

  deleteExpense: (token: string, expenseId: string) =>
    request<{ ok: boolean }>(`/api/trips/${enc(token)}/expenses/${enc(expenseId)}`, {
      method: "DELETE",
    }),
};
