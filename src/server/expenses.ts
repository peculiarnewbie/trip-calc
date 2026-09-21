import { formatCents } from "../shared/money";
import { splitEven } from "../shared/settlement";
import type { ExpenseRequest, ExpenseShare, Person, SplitMode } from "../shared/types";
import { HttpError } from "./errors";

export interface ResolvedExpense {
  description: string;
  amountCents: number;
  payerId: string;
  splitMode: SplitMode;
  shares: ExpenseShare[];
}

export function resolveExpenseInput(
  body: ExpenseRequest,
  people: readonly Person[],
  currency = "USD",
): ResolvedExpense {
  const description = body.description.trim();
  if (!description) {
    throw new HttpError(400, "Description is required.");
  }
  if (!Number.isSafeInteger(body.amountCents) || body.amountCents <= 0) {
    throw new HttpError(400, "Amount must be greater than zero.");
  }

  const personIds = new Set(people.map((person) => person.id));
  if (!personIds.has(body.payerId)) {
    throw new HttpError(400, "The payer must be someone on the trip.");
  }

  if (body.splitMode === "even") {
    const participants = [...new Set(body.participants ?? [])];
    if (participants.length === 0) {
      throw new HttpError(400, "Pick at least one person to split with.");
    }
    if (participants.some((id) => !personIds.has(id))) {
      throw new HttpError(400, "Everyone in the split must be on the trip.");
    }
    return {
      description,
      amountCents: body.amountCents,
      payerId: body.payerId,
      splitMode: "even",
      shares: splitEven(body.amountCents, participants),
    };
  }

  const customShares = body.customShares ?? [];
  if (customShares.length === 0) {
    throw new HttpError(400, "Add at least one share.");
  }

  const seen = new Set<string>();
  let total = 0;
  for (const share of customShares) {
    if (!personIds.has(share.personId)) {
      throw new HttpError(400, "Everyone in the split must be on the trip.");
    }
    if (seen.has(share.personId)) {
      throw new HttpError(400, "Each person can only appear once in a split.");
    }
    seen.add(share.personId);
    if (!Number.isSafeInteger(share.amountCents) || share.amountCents < 0) {
      throw new HttpError(400, "Shares must be zero or more.");
    }
    total += share.amountCents;
  }

  if (total !== body.amountCents) {
    throw new HttpError(
      400,
      `Shares add up to ${formatCents(total, currency)}, but the expense is ${formatCents(body.amountCents, currency)}.`,
    );
  }

  return {
    description,
    amountCents: body.amountCents,
    payerId: body.payerId,
    splitMode: "custom",
    shares: customShares.map((share) => ({
      personId: share.personId,
      amountCents: share.amountCents,
    })),
  };
}
