import { createMemo, createSignal, Show } from "solid-js";
import { For } from "@solidjs/web";
import { formatCents } from "../../shared/money";
import type { Expense, Person, TripDetail } from "../../shared/types";
import { api } from "../api";
import { ExpenseDialog } from "./ExpenseDialog";
import { Icon } from "./Icon";
import { PersonName } from "./PersonName";

export function ExpensesPanel(props: {
  token: string;
  detail: TripDetail;
  readOnly: boolean;
  onChanged: () => void;
}) {
  const [creating, setCreating] = createSignal(false);
  const [editing, setEditing] = createSignal<Expense | null>(null);
  const [error, setError] = createSignal("");

  const byId = createMemo(() => new Map(props.detail.people.map((person) => [person.id, person])));
  const currency = () => props.detail.trip.currency;

  /** Highest amount first; ties fall back to the oldest expense. */
  const expenses = createMemo(() =>
    [...props.detail.expenses].sort(
      (a, b) => b.amountCents - a.amountCents || a.createdAt.localeCompare(b.createdAt),
    ),
  );

  const byName = (a: Person, b: Person) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" });

  function sharePeople(expense: Expense): Person[] {
    return expense.shares
      .map((share) => byId().get(share.personId))
      .filter((person): person is Person => Boolean(person))
      .sort(byName);
  }

  function shareRows(expense: Expense) {
    return [...expense.shares].sort((a, b) =>
      (byId().get(a.personId)?.name ?? "").localeCompare(
        byId().get(b.personId)?.name ?? "",
        undefined,
        {
          sensitivity: "base",
        },
      ),
    );
  }

  async function remove(expense: Expense) {
    if (!confirm(`Delete "${expense.description}"?`)) return;
    setError("");
    try {
      await api.deleteExpense(props.token, expense.id);
      props.onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  return (
    <div class="tc-panel">
      <div class="tc-panel-head">
        <span class="tc-toolbar-meta">
          {props.detail.expenses.length}{" "}
          {props.detail.expenses.length === 1 ? "expense" : "expenses"}
        </span>
        <span class="tc-spacer" />
        <Show when={!props.readOnly}>
          <button class="tc-btn tc-btn--primary" onClick={() => setCreating(true)}>
            <Icon name="plus" /> Add expense
          </button>
        </Show>
      </div>

      <Show when={error()}>
        <div class="tc-error">{error()}</div>
      </Show>

      <Show
        when={expenses().length > 0}
        fallback={
          <div class="tc-empty">
            <Icon name="receipt" size={28} />
            <p>
              {props.readOnly
                ? "No expenses have been logged for this trip yet."
                : "No expenses yet. Add the first one and Trip Calc handles the math."}
            </p>
            <Show when={!props.readOnly}>
              <button class="tc-btn tc-btn--primary" onClick={() => setCreating(true)}>
                <Icon name="plus" /> Add expense
              </button>
            </Show>
          </div>
        }
      >
        <div class="tc-expense-list">
          <For each={expenses()}>
            {(expense) => (
              <div class="tc-expense">
                <div class="tc-expense-main">
                  <div class="tc-expense-title">{expense.description}</div>
                  <div class="tc-expense-sub">
                    <PersonName person={byId().get(expense.payerId)} /> paid ·{" "}
                    <Show
                      when={expense.splitMode === "even"}
                      fallback={
                        <>
                          Custom ·{" "}
                          <For each={shareRows(expense)}>
                            {(share, index) => (
                              <>
                                {index() > 0 ? ", " : ""}
                                <PersonName person={byId().get(share.personId)} />{" "}
                                {formatCents(share.amountCents, currency())}
                              </>
                            )}
                          </For>
                        </>
                      }
                    >
                      Split evenly between{" "}
                      <For each={sharePeople(expense)}>
                        {(person, index) => (
                          <>
                            {index() > 0 ? ", " : ""}
                            <PersonName person={person} />
                          </>
                        )}
                      </For>
                    </Show>
                  </div>
                </div>
                <div class="tc-expense-amount">{formatCents(expense.amountCents, currency())}</div>
                <Show when={!props.readOnly}>
                  <div class="tc-expense-actions">
                    <button
                      class="tc-btn tc-btn--ghost tc-btn--icon"
                      title="Edit"
                      onClick={() => setEditing(expense)}
                    >
                      <Icon name="edit" />
                    </button>
                    <button
                      class="tc-btn tc-btn--danger tc-btn--icon"
                      title="Delete"
                      onClick={() => void remove(expense)}
                    >
                      <Icon name="trash" />
                    </button>
                  </div>
                </Show>
              </div>
            )}
          </For>
        </div>
      </Show>

      <Show when={creating()}>
        <ExpenseDialog
          token={props.token}
          people={props.detail.people}
          currency={currency()}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            props.onChanged();
          }}
        />
      </Show>

      <Show when={editing()}>
        {(expense) => (
          <ExpenseDialog
            token={props.token}
            people={props.detail.people}
            currency={currency()}
            expense={expense()}
            onClose={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              props.onChanged();
            }}
          />
        )}
      </Show>
    </div>
  );
}
