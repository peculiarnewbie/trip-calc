import { describe, expect, it } from "vite-plus/test";
import {
  ACCOUNT_NUMBER_LENGTH,
  formatAccountNumber,
  generateAccountNumber,
  isValidAccountNumber,
  normalizeAccountNumber,
} from "./account";

describe("normalizeAccountNumber", () => {
  it("strips formatting and letters", () => {
    expect(normalizeAccountNumber("1234 5678-9012 3456")).toBe("1234567890123456");
    expect(normalizeAccountNumber("abc1234def5678")).toBe("12345678");
  });
});

describe("isValidAccountNumber", () => {
  it("accepts exactly 16 digits in any formatting", () => {
    expect(isValidAccountNumber("1234 5678 9012 3456")).toBe(true);
    expect(isValidAccountNumber("1234567890123456")).toBe(true);
  });

  it("rejects the wrong length", () => {
    expect(isValidAccountNumber("1234")).toBe(false);
    expect(isValidAccountNumber("12345678901234567")).toBe(false);
    expect(isValidAccountNumber("")).toBe(false);
  });
});

describe("formatAccountNumber", () => {
  it("groups digits in fours", () => {
    expect(formatAccountNumber("1234567890123456")).toBe("1234 5678 9012 3456");
  });

  it("round-trips with normalize", () => {
    expect(normalizeAccountNumber(formatAccountNumber("9876543210987654"))).toBe(
      "9876543210987654",
    );
  });
});

describe("generateAccountNumber", () => {
  it("produces 16 digits that pass validation", () => {
    const number = generateAccountNumber();
    expect(number).toHaveLength(ACCOUNT_NUMBER_LENGTH);
    expect(isValidAccountNumber(number)).toBe(true);
  });

  it("is effectively unique across calls", () => {
    const seen = new Set<string>();
    for (let index = 0; index < 200; index += 1) seen.add(generateAccountNumber());
    expect(seen.size).toBe(200);
  });
});
