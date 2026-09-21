import { createMemo, createSignal, refresh } from "solid-js";
import { api } from "./api";

const ACCOUNT_KEY = "trip-calc:account";

function readStoredAccount(): string {
  try {
    return localStorage.getItem(ACCOUNT_KEY) ?? "";
  } catch {
    return "";
  }
}

function persistAccount(number: string): void {
  try {
    if (number) localStorage.setItem(ACCOUNT_KEY, number);
    else localStorage.removeItem(ACCOUNT_KEY);
  } catch {
    // Storage can be unavailable (private mode); the session still works.
  }
}

export const [accountNumber, setAccountNumber] = createSignal(readStoredAccount());

let provisioning: Promise<string> | null = null;

/**
 * A new browser profile gets an account silently — no sign-up screen. The
 * number is what they save if they want their trips on another device.
 */
async function ensureAccount(): Promise<string> {
  const existing = accountNumber();
  if (existing) return existing;

  if (!provisioning) {
    provisioning = api
      .createAccount()
      .then((account) => {
        persistAccount(account.number);
        setAccountNumber(account.number);
        return account.number;
      })
      .finally(() => {
        provisioning = null;
      });
  }
  return provisioning;
}

/** Async memo: resolves to the account number, provisioning one if needed. */
export const account = createMemo(() => ensureAccount());

/** Trips owned by this account. Async memo — read inside a `<Loading>`. */
export const trips = createMemo(() => {
  const number = account();
  return number ? api.trips(number) : [];
});

function tokenFromPath(): string {
  if (typeof window === "undefined") return "";
  const match = /^\/t\/([^/?#]+)/.exec(window.location.pathname);
  return match ? decodeURIComponent(match[1]) : "";
}

/** Set from the router so state stays in sync with `/t/:token`. */
export const [urlToken, setUrlToken] = createSignal(tokenFromPath());

export const currentToken = createMemo(() => {
  const fromUrl = urlToken();
  if (fromUrl) return fromUrl;
  return trips()[0]?.editToken ?? "";
});

export const tripDetail = createMemo(() => {
  const token = currentToken();
  if (!token) return null;
  return api.trip(token);
});

export function useAccount(number: string): void {
  persistAccount(number);
  setAccountNumber(number);
}

export function forgetAccount(): void {
  persistAccount("");
  setAccountNumber("");
}

export function refreshTrips(): Promise<unknown> {
  return refresh(trips);
}

export function refreshTrip(): Promise<unknown> {
  return refresh(tripDetail);
}

export function refreshAll(): void {
  void refreshTrips();
  void refreshTrip();
}
