import { describe, expect, it } from "vite-plus/test";
import {
  centsToInput,
  currencyDigits,
  formatCents,
  normalizeCurrency,
  parseAmountToCents,
} from "./money";

describe("parseAmountToCents", () => {
  it("parses plain decimals", () => {
    expect(parseAmountToCents("12.50")).toBe(1250);
    expect(parseAmountToCents("0.05")).toBe(5);
    expect(parseAmountToCents("100")).toBe(10000);
  });

  it("ignores currency symbols and spaces", () => {
    expect(parseAmountToCents("$ 1,234.56")).toBe(123456);
  });

  it("handles comma decimal separators", () => {
    expect(parseAmountToCents("12,50")).toBe(1250);
    expect(parseAmountToCents("1.234,56")).toBe(123456);
  });

  it("treats zero-decimal currencies as whole units", () => {
    expect(parseAmountToCents("840", "JPY")).toBe(840);
    expect(parseAmountToCents("1500", "KRW")).toBe(1500);
    expect(parseAmountToCents("840.6", "JPY")).toBe(841);
    expect(parseAmountToCents("50000", "IDR")).toBe(50000);
  });

  it("rejects unusable input", () => {
    expect(parseAmountToCents("")).toBeNull();
    expect(parseAmountToCents("abc")).toBeNull();
  });
});

describe("centsToInput", () => {
  it("renders the currency's decimal places", () => {
    expect(centsToInput(5)).toBe("0.05");
    expect(centsToInput(1250)).toBe("12.50");
    expect(centsToInput(840, "JPY")).toBe("840");
  });
});

describe("currencyDigits", () => {
  it("knows which currencies have no minor unit", () => {
    expect(currencyDigits("USD")).toBe(2);
    expect(currencyDigits("jpy")).toBe(0);
    expect(currencyDigits("VND")).toBe(0);
    expect(currencyDigits("idr")).toBe(0);
  });
});

describe("normalizeCurrency", () => {
  it("uppercases three letter codes", () => {
    expect(normalizeCurrency("eur")).toBe("EUR");
  });

  it("falls back for junk", () => {
    expect(normalizeCurrency("dollars")).toBe("USD");
    expect(normalizeCurrency(undefined, "GBP")).toBe("GBP");
  });
});

describe("formatCents", () => {
  it("formats with the requested currency", () => {
    expect(formatCents(123456, "USD")).toContain("1,234.56");
  });

  it("does not invent decimals for yen", () => {
    expect(formatCents(840, "JPY")).not.toContain(".");
    expect(formatCents(840, "JPY")).toContain("840");
  });
});
