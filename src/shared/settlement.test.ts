import { describe, expect, it } from "vite-plus/test";
import type { Balance, Expense, Person } from "./types";
import {
  computeBalances,
  minimizeTransfers,
  minimizeTransfersGreedy,
  minimizeTransfersOptimal,
  settle,
  splitEven,
} from "./settlement";

function person(id: string): Person {
  return {
    id,
    tripId: "t1",
    name: id.toUpperCase(),
    color: null,
    paymentMethods: [],
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

function expense(
  id: string,
  payerId: string,
  amountCents: number,
  shares: Array<[string, number]>,
): Expense {
  return {
    id,
    tripId: "t1",
    description: id,
    amountCents,
    payerId,
    splitMode: "even",
    createdAt: "2026-01-01T00:00:00.000Z",
    shares: shares.map(([personId, amountCents]) => ({ personId, amountCents })),
  };
}

function balancesFrom(entries: Array<[string, number]>): Balance[] {
  return entries.map(([personId, netCents]) => ({
    personId,
    paidCents: Math.max(netCents, 0),
    owedCents: Math.max(-netCents, 0),
    netCents,
  }));
}

function applyTransfers(
  balances: readonly Balance[],
  transfers: ReadonlyArray<{ fromPersonId: string; toPersonId: string; amountCents: number }>,
) {
  const net = new Map(balances.map((balance) => [balance.personId, balance.netCents]));
  for (const transfer of transfers) {
    net.set(transfer.fromPersonId, (net.get(transfer.fromPersonId) ?? 0) + transfer.amountCents);
    net.set(transfer.toPersonId, (net.get(transfer.toPersonId) ?? 0) - transfer.amountCents);
  }
  return net;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomBalances(random: () => number, size: number, maxAmount: number): Balance[] {
  const entries: Array<[string, number]> = [];
  let sum = 0;
  for (let i = 0; i < size - 1; i += 1) {
    const value = Math.floor(random() * (maxAmount * 2 + 1)) - maxAmount;
    sum += value;
    entries.push([`p${i}`, value]);
  }
  entries.push([`p${size - 1}`, -sum]);
  return balancesFrom(entries);
}

/** Independent exact solver used to validate the optimized implementation. */
function bruteForceMinTransfers(balances: readonly Balance[]): number {
  const debtors = balances.filter((b) => b.netCents < 0).map((b) => -b.netCents);
  const remaining = balances.filter((b) => b.netCents > 0).map((b) => b.netCents);
  let best = Number.POSITIVE_INFINITY;

  function assign(debtorIndex: number, edges: number): void {
    if (edges >= best) return;
    let index = debtorIndex;
    while (index < debtors.length && debtors[index] === 0) index += 1;
    if (index >= debtors.length) {
      if (remaining.every((value) => value === 0)) best = Math.min(best, edges);
      return;
    }

    const targets = remaining.map((value, i) => (value > 0 ? i : -1)).filter((i) => i >= 0);
    const amount = debtors[index];

    function distribute(targetIndex: number, left: number, used: number): void {
      if (used + edges >= best) return;
      if (left === 0) {
        assign(index + 1, edges + used);
        return;
      }
      if (targetIndex >= targets.length) return;
      const target = targets[targetIndex];
      const maxTake = Math.min(left, remaining[target]);
      for (let take = maxTake; take >= 0; take -= 1) {
        remaining[target] -= take;
        distribute(targetIndex + 1, left - take, used + (take > 0 ? 1 : 0));
        remaining[target] += take;
      }
    }

    distribute(0, amount, 0);
  }

  assign(0, 0);
  return best;
}

describe("splitEven", () => {
  it("splits cleanly when divisible", () => {
    expect(splitEven(3000, ["a", "b", "c"])).toEqual([
      { personId: "a", amountCents: 1000 },
      { personId: "b", amountCents: 1000 },
      { personId: "c", amountCents: 1000 },
    ]);
  });

  it("distributes remainder cents so shares sum to the total", () => {
    const shares = splitEven(1000, ["a", "b", "c"]);
    expect(shares.map((share) => share.amountCents)).toEqual([334, 333, 333]);
    expect(shares.reduce((sum, share) => sum + share.amountCents, 0)).toBe(1000);
  });

  it("returns nothing for an empty participant list", () => {
    expect(splitEven(1000, [])).toEqual([]);
  });
});

describe("computeBalances", () => {
  it("nets what each person paid against what they owe", () => {
    const people = [person("a"), person("b"), person("c")];
    const expenses = [
      expense("dinner", "a", 3000, [
        ["a", 1000],
        ["b", 1000],
        ["c", 1000],
      ]),
    ];

    expect(computeBalances(people, expenses)).toEqual([
      { personId: "a", paidCents: 3000, owedCents: 1000, netCents: 2000 },
      { personId: "b", paidCents: 0, owedCents: 1000, netCents: -1000 },
      { personId: "c", paidCents: 0, owedCents: 1000, netCents: -1000 },
    ]);
  });
});

describe("minimizeTransfers", () => {
  it("settles a simple three-way split with two transfers", () => {
    const people = [person("a"), person("b"), person("c")];
    const expenses = [
      expense("dinner", "a", 3000, [
        ["a", 1000],
        ["b", 1000],
        ["c", 1000],
      ]),
    ];

    const { transfers } = settle(people, expenses);
    expect(transfers).toHaveLength(2);
    const net = applyTransfers(computeBalances(people, expenses), transfers);
    expect([...net.values()]).toEqual([0, 0, 0]);
  });

  it("matches the exact minimum found by brute force on random inputs", () => {
    const random = mulberry32(20260921);
    for (let iteration = 0; iteration < 120; iteration += 1) {
      const balances = randomBalances(random, 3 + Math.floor(random() * 4), 6);
      const exact = bruteForceMinTransfers(balances);
      const optimal = minimizeTransfersOptimal(balances);
      expect(optimal.length).toBe(exact);
      const net = applyTransfers(balances, optimal);
      expect([...net.values()].every((value) => value === 0)).toBe(true);
    }
  });

  it("is never worse than the greedy heuristic", () => {
    const random = mulberry32(7);
    for (let iteration = 0; iteration < 200; iteration += 1) {
      const balances = randomBalances(random, 4 + Math.floor(random() * 6), 40);
      const optimal = minimizeTransfersOptimal(balances);
      const greedy = minimizeTransfersGreedy(balances);
      expect(optimal.length).toBeLessThanOrEqual(greedy.length);
      expect([...applyTransfers(balances, optimal).values()]).toEqual([
        ...applyTransfers(balances, greedy).values(),
      ]);
    }
  });

  it("uses at most n-1 transfers for large groups", () => {
    const balances = randomBalances(mulberry32(99), 40, 100);
    const transfers = minimizeTransfers(balances);
    expect(transfers.length).toBeLessThanOrEqual(39);
    expect([...applyTransfers(balances, transfers).values()].every((value) => value === 0)).toBe(
      true,
    );
  });

  it("returns no transfers when everyone is square", () => {
    expect(
      minimizeTransfers(
        balancesFrom([
          ["a", 0],
          ["b", 0],
        ]),
      ),
    ).toEqual([]);
  });

  it("prefers direct transfers when they are already minimal", () => {
    const transfers = minimizeTransfers(
      balancesFrom([
        ["alice", 9666],
        ["bob", -2333],
        ["cara", -7333],
      ]),
    );
    expect(transfers).toHaveLength(2);
    expect(transfers.every((transfer) => transfer.toPersonId === "alice")).toBe(true);
  });
});

describe("settle", () => {
  it("reports the trip total and clears every balance", () => {
    const people = [person("a"), person("b")];
    const expenses = [
      expense("hotel", "a", 20000, [
        ["a", 10000],
        ["b", 10000],
      ]),
      expense("taxi", "b", 4000, [
        ["a", 2000],
        ["b", 2000],
      ]),
    ];

    const settlement = settle(people, expenses);
    expect(settlement.totalCents).toBe(24000);
    expect(settlement.balances.find((balance) => balance.personId === "a")?.netCents).toBe(8000);
    expect(settlement.transfers).toEqual([
      { fromPersonId: "b", toPersonId: "a", amountCents: 8000 },
    ]);
  });
});
