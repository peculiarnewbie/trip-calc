import type { PaymentMethod } from "../shared/types";
import { HttpError } from "./errors";

export function resolvePaymentMethods(methods: readonly PaymentMethod[]): PaymentMethod[] {
  if (methods.length > 20) {
    throw new HttpError(400, "You can add up to 20 payment methods per person.");
  }
  return methods.map((entry) => {
    const method = entry.method.trim();
    const destination = entry.destination.trim();
    if (!method || !destination) {
      throw new HttpError(400, "Each payment method needs a name and destination.");
    }
    if (method.length > 100 || destination.length > 1000) {
      throw new HttpError(
        400,
        "Payment method names can be up to 100 characters and destinations up to 1000.",
      );
    }
    return { method, destination };
  });
}
