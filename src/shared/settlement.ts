import type { Balance, Expense, ExpenseShare, Person, Settlement, Transfer } from "./types";

/**
 * Splits an amount as evenly as possible, distributing the remainder cents one
 * by one so the shares always sum exactly to `amountCents`.
 */
export function splitEven(amountCents: number, participantIds: readonly string[]): ExpenseShare[] {
  const count = participantIds.length;
  if (count === 0) return [];

  const base = Math.floor(amountCents / count);
  let remainder = amountCents - base * count;

  return participantIds.map((personId) => {
    const extra = remainder > 0 ? 1 : 0;
    if (extra === 1) remainder -= 1;
    return { personId, amountCents: base + extra };
  });
}

/** Net position per person: paid minus owed. Positive means they are owed money. */
export function computeBalances(
  people: readonly Person[],
  expenses: readonly Expense[],
): Balance[] {
  const paid = new Map<string, number>();
  const owed = new Map<string, number>();

  for (const person of people) {
    paid.set(person.id, 0);
    owed.set(person.id, 0);
  }

  for (const expense of expenses) {
    paid.set(expense.payerId, (paid.get(expense.payerId) ?? 0) + expense.amountCents);
    for (const share of expense.shares) {
      owed.set(share.personId, (owed.get(share.personId) ?? 0) + share.amountCents);
    }
  }

  return people.map((person) => {
    const paidCents = paid.get(person.id) ?? 0;
    const owedCents = owed.get(person.id) ?? 0;
    return { personId: person.id, paidCents, owedCents, netCents: paidCents - owedCents };
  });
}

interface Entry {
  id: string;
  amount: number;
}

const OPTIMAL_LIMIT = 12;

/**
 * Produces a minimal list of transfers that clears every balance.
 *
 * For up to {@link OPTIMAL_LIMIT} non-zero participants we solve it exactly with
 * a memoized search (each transaction fully settles one participant against
 * another); beyond that we fall back to the classic largest-debtor /
 * largest-creditor greedy, which still yields at most n-1 transfers.
 */
export function minimizeTransfers(balances: readonly Balance[]): Transfer[] {
  const entries = balances
    .filter((balance) => balance.netCents !== 0)
    .map((balance) => ({ id: balance.personId, amount: balance.netCents }));

  if (entries.length < 2) return [];
  if (entries.length > OPTIMAL_LIMIT) return greedy(entries);

  // Prefer the greedy matching on ties: it never routes money through a third
  // person, so "Bob pays Alice, Cara pays Alice" reads better than an equally
  // short chain. Fall back to the exact solver when it saves a transfer.
  const optimal = search(entries);
  const direct = greedy(entries);
  return direct.length <= optimal.length ? direct : optimal;
}

export function minimizeTransfersOptimal(balances: readonly Balance[]): Transfer[] {
  const entries = balances
    .filter((balance) => balance.netCents !== 0)
    .map((balance) => ({ id: balance.personId, amount: balance.netCents }));
  return search(entries);
}

export function minimizeTransfersGreedy(balances: readonly Balance[]): Transfer[] {
  const entries = balances
    .filter((balance) => balance.netCents !== 0)
    .map((balance) => ({ id: balance.personId, amount: balance.netCents }));
  return greedy(entries);
}

function search(entries: Entry[]): Transfer[] {
  const amounts = entries.map((entry) => entry.amount);
  const ids = entries.map((entry) => entry.id);
  const memo = new Map<string, Transfer[]>();

  function visit(start: number): Transfer[] {
    let index = start;
    while (index < amounts.length && amounts[index] === 0) index += 1;
    if (index >= amounts.length) return [];

    const key = `${index}|${amounts.slice(index).join(",")}`;
    const cached = memo.get(key);
    if (cached) return cached;

    const pivot = amounts[index];
    let best: Transfer[] | null = null;

    for (let i = index + 1; i < amounts.length; i += 1) {
      const other = amounts[i];
      if (other === 0 || other * pivot >= 0) continue;

      const transfer: Transfer = {
        fromPersonId: pivot < 0 ? ids[index] : ids[i],
        toPersonId: pivot < 0 ? ids[i] : ids[index],
        amountCents: Math.abs(pivot),
      };

      amounts[i] = other + pivot;
      const rest = visit(index + 1);
      amounts[i] = other;

      const candidate = [transfer, ...rest];
      if (candidate.length === 1) {
        best = candidate;
        break;
      }
      if (best === null || candidate.length < best.length) best = candidate;
    }

    const result = best ?? [];
    memo.set(key, result);
    return result;
  }

  return visit(0);
}

function greedy(entries: readonly Entry[]): Transfer[] {
  const debtors = entries
    .filter((entry) => entry.amount < 0)
    .map((entry) => ({ id: entry.id, amount: -entry.amount }))
    .sort((a, b) => b.amount - a.amount);
  const creditors = entries
    .filter((entry) => entry.amount > 0)
    .map((entry) => ({ id: entry.id, amount: entry.amount }))
    .sort((a, b) => b.amount - a.amount);

  const transfers: Transfer[] = [];
  let debtor = 0;
  let creditor = 0;

  while (debtor < debtors.length && creditor < creditors.length) {
    const amount = Math.min(debtors[debtor].amount, creditors[creditor].amount);
    if (amount > 0) {
      transfers.push({
        fromPersonId: debtors[debtor].id,
        toPersonId: creditors[creditor].id,
        amountCents: amount,
      });
    }
    debtors[debtor].amount -= amount;
    creditors[creditor].amount -= amount;
    if (debtors[debtor].amount === 0) debtor += 1;
    if (creditors[creditor].amount === 0) creditor += 1;
  }

  return transfers;
}

export function settle(people: readonly Person[], expenses: readonly Expense[]): Settlement {
  const balances = computeBalances(people, expenses);
  const transfers = minimizeTransfers(balances);
  const totalCents = expenses.reduce((sum, expense) => sum + expense.amountCents, 0);
  return { totalCents, balances, transfers };
}
