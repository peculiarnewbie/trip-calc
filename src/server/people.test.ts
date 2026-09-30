import { describe, expect, it } from "vite-plus/test";
import * as Schema from "effect/Schema";
import { UpdatePersonRequestSchema } from "../shared/types";
import { resolvePaymentMethods } from "./people";

describe("payment methods", () => {
  it("trims labels and destinations without losing leading zeroes or account spacing", () => {
    expect(
      resolvePaymentMethods([
        { method: " GoPay ", destination: " 081234567890 " },
        { method: "Bank Jago", destination: "1024 1234 5678" },
      ]),
    ).toEqual([
      { method: "GoPay", destination: "081234567890" },
      { method: "Bank Jago", destination: "1024 1234 5678" },
    ]);
  });

  it("allows clearing all methods", () => {
    expect(resolvePaymentMethods([])).toEqual([]);
    expect(Schema.decodeUnknownSync(UpdatePersonRequestSchema)({ paymentMethods: [] })).toEqual({
      paymentMethods: [],
    });
  });

  it("requires both a label and destination for every method", () => {
    expect(() => resolvePaymentMethods([{ method: " ", destination: "081234567890" }])).toThrow(
      "Each payment method needs a name and destination.",
    );
    expect(() => resolvePaymentMethods([{ method: "GoPay", destination: " " }])).toThrow(
      "Each payment method needs a name and destination.",
    );
  });

  it("bounds the number and size of payment methods", () => {
    const entry = { method: "GoPay", destination: "081234567890" };
    expect(resolvePaymentMethods(Array.from({ length: 20 }, () => entry))).toHaveLength(20);
    expect(() => resolvePaymentMethods(Array.from({ length: 21 }, () => entry))).toThrow(
      "up to 20 payment methods",
    );
    expect(() => resolvePaymentMethods([{ ...entry, method: "a".repeat(101) }])).toThrow(
      "up to 100 characters",
    );
    expect(() => resolvePaymentMethods([{ ...entry, destination: "a".repeat(1001) }])).toThrow(
      "destinations up to 1000",
    );
  });

  it("rejects malformed payment method payloads", () => {
    const decode = Schema.decodeUnknownSync(UpdatePersonRequestSchema);
    expect(() => decode({ paymentMethods: null })).toThrow();
    expect(() => decode({ paymentMethods: [{ method: "GoPay", destination: 8123 }] })).toThrow();
    expect(() => decode({ paymentMethods: [{ method: "GoPay" }] })).toThrow();
  });
});
