export const ACCOUNT_NUMBER_LENGTH = 16;

/** Strips spaces, dashes and any other non-digit characters. */
export function normalizeAccountNumber(input: string): string {
  return input.replace(/\D+/g, "");
}

export function isValidAccountNumber(input: string): boolean {
  return normalizeAccountNumber(input).length === ACCOUNT_NUMBER_LENGTH;
}

/** Groups digits into blocks of four for display: "1234 5678 9012 3456". */
export function formatAccountNumber(input: string): string {
  const digits = normalizeAccountNumber(input);
  const groups: string[] = [];
  for (let index = 0; index < digits.length; index += 4) {
    groups.push(digits.slice(index, index + 4));
  }
  return groups.join(" ");
}

/**
 * Generates a Mullvad-style account number: 16 random digits, no email or
 * password. Uses rejection sampling so every digit is uniform.
 */
export function generateAccountNumber(): string {
  const digits: string[] = [];
  const buffer = new Uint8Array(32);

  while (digits.length < ACCOUNT_NUMBER_LENGTH) {
    crypto.getRandomValues(buffer);
    for (const byte of buffer) {
      if (byte >= 250) continue;
      digits.push(String(byte % 10));
      if (digits.length === ACCOUNT_NUMBER_LENGTH) break;
    }
  }

  return digits.join("");
}
