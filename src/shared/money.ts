export const CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CNY",
  "AUD",
  "CAD",
  "CHF",
  "HKD",
  "SGD",
  "INR",
  "IDR",
  "MYR",
  "THB",
  "KRW",
  "NZD",
  "SEK",
  "NOK",
  "DKK",
  "PHP",
  "VND",
  "TWD",
] as const;

export type Currency = (typeof CURRENCIES)[number];

/**
 * Currencies we store and display as whole units (no decimals). Besides the
 * ISO 4217 zero-decimal currencies this includes IDR, which has a minor unit on
 * paper but is used as whole rupiah in practice.
 */
const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "IDR",
  "ISK",
  "JPY",
  "KMF",
  "KRW",
  "PYG",
  "RWF",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
]);

export function isSupportedCurrency(value: string): boolean {
  return (CURRENCIES as readonly string[]).includes(value.toUpperCase());
}

export function normalizeCurrency(value: string | undefined, fallback = "USD"): string {
  const candidate = (value ?? "").trim().toUpperCase();
  if (candidate.length === 3 && /^[A-Z]{3}$/.test(candidate)) return candidate;
  return fallback;
}

/** Number of decimal places used to store and display a currency. */
export function currencyDigits(currency = "USD"): number {
  return ZERO_DECIMAL_CURRENCIES.has(normalizeCurrency(currency)) ? 0 : 2;
}

function scale(currency: string): number {
  return 10 ** currencyDigits(currency);
}

export function formatCents(cents: number, currency = "USD"): string {
  const code = normalizeCurrency(currency);
  const digits = currencyDigits(code);
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(cents / scale(code));
  } catch {
    return `${(cents / scale(code)).toFixed(digits)} ${code}`;
  }
}

/**
 * Parses a user-typed amount into integer minor units for `currency`. Accepts
 * plain numbers as well as common grouping styles ("1,234.56", "1.234,56",
 * "$12.50", "12,50"). Returns null when the input is not a usable amount.
 */
export function parseAmountToCents(input: string, currency = "USD"): number | null {
  const cleaned = input.trim().replace(/[^\d.,]/g, "");
  if (!cleaned || !/\d/.test(cleaned)) return null;

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  let normalized = cleaned;

  if (lastComma !== -1 && lastDot !== -1) {
    const decimalSeparator = lastComma > lastDot ? "," : ".";
    const groupingSeparator = decimalSeparator === "," ? "." : ",";
    normalized = cleaned.split(groupingSeparator).join("").replace(decimalSeparator, ".");
  } else if (lastComma !== -1) {
    const decimals = cleaned.length - lastComma - 1;
    normalized =
      decimals === 3 && cleaned.length > 4
        ? cleaned.split(",").join("")
        : cleaned.replace(",", ".");
  }

  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;

  const minorUnits = Math.round(value * scale(currency));
  if (!Number.isSafeInteger(minorUnits)) return null;
  return minorUnits;
}

export function centsToInput(cents: number, currency = "USD"): string {
  return (cents / scale(currency)).toFixed(currencyDigits(currency));
}
