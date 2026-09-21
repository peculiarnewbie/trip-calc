import { createMemo, createSignal } from "solid-js";
import { For, Show } from "@solidjs/web";
import { centsToInput, formatCents, parseAmountToCents } from "../../shared/money";
import { splitEven } from "../../shared/settlement";
import type { Expense, ExpenseRequest, Person, SplitMode } from "../../shared/types";
import { api } from "../api";
import { Modal } from "./Modal";
import { PersonName } from "./PersonName";

export function ExpenseDialog(props: {
  token: string;
  people: readonly Person[];
  currency: string;
  expense?: Expense;
  onClose: () => void;
  onSaved: () => void;
}) {
  const existing = props.expense;
  const [description, setDescription] = createSignal(existing?.description ?? "");
  const [amountText, setAmountText] = createSignal(
    existing ? centsToInput(existing.amountCents, props.currency) : "",
  );
  const [payerId, setPayerId] = createSignal(existing?.payerId ?? props.people[0]?.id ?? "");
  const [mode, setMode] = createSignal<SplitMode>(existing?.splitMode ?? "even");
  const [participants, setParticipants] = createSignal<string[]>(
    existing
      ? existing.shares.map((share) => share.personId)
      : props.people.map((person) => person.id),
  );
  const [customAmounts, setCustomAmounts] = createSignal<Record<string, string>>(
    existing && existing.splitMode === "custom"
      ? Object.fromEntries(
          existing.shares.map((share) => [
            share.personId,
            centsToInput(share.amountCents, props.currency),
          ]),
        )
      : {},
  );
  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal("");

  const amountCents = createMemo(() => parseAmountToCents(amountText(), props.currency));
  const evenShares = createMemo(() => {
    const amount = amountCents();
    if (amount === null || amount <= 0) return [];
    return splitEven(amount, participants());
  });
  const shareByPerson = createMemo(
    () => new Map(evenShares().map((share) => [share.personId, share.amountCents])),
  );
  const customTotal = createMemo(() =>
    props.people.reduce(
      (sum, person) =>
        sum + (parseAmountToCents(customAmounts()[person.id] ?? "", props.currency) ?? 0),
      0,
    ),
  );
  const customRemaining = createMemo(() => (amountCents() ?? 0) - customTotal());

  const validationError = createMemo(() => {
    if (!description().trim()) return "Add a description.";
    const amount = amountCents();
    if (amount === null || amount <= 0) return "Enter an amount greater than zero.";
    if (!payerId()) return "Choose who paid.";
    if (mode() === "even") {
      if (participants().length === 0) return "Pick at least one person to split with.";
      return "";
    }
    if (customTotal() <= 0) return "Add at least one share.";
    if (customTotal() !== amount) {
      return `Shares add up to ${formatCents(customTotal(), props.currency)}, but the expense is ${formatCents(amount, props.currency)}.`;
    }
    return "";
  });

  function toggleParticipant(personId: string) {
    setParticipants((current) =>
      current.includes(personId) ? current.filter((id) => id !== personId) : [...current, personId],
    );
  }

  function switchMode(next: SplitMode) {
    if (next === "custom" && Object.keys(customAmounts()).length === 0) {
      const seeded: Record<string, string> = {};
      for (const person of props.people) {
        const share = shareByPerson().get(person.id);
        seeded[person.id] = share === undefined ? "" : centsToInput(share, props.currency);
      }
      setCustomAmounts(seeded);
    }
    setMode(next);
  }

  async function save() {
    if (validationError()) return;
    setSaving(true);
    setError("");
    try {
      const amount = amountCents();
      if (amount === null) return;
      const body: ExpenseRequest = {
        description: description().trim(),
        amountCents: amount,
        payerId: payerId(),
        splitMode: mode(),
        ...(mode() === "even"
          ? { participants: participants() }
          : {
              customShares: props.people
                .map((person) => ({
                  personId: person.id,
                  amountCents:
                    parseAmountToCents(customAmounts()[person.id] ?? "", props.currency) ?? 0,
                }))
                .filter((share) => share.amountCents > 0),
            }),
      };

      if (existing) {
        await api.updateExpense(props.token, existing.id, body);
      } else {
        await api.createExpense(props.token, body);
      }
      props.onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={existing ? "Edit expense" : "Add expense"}
      onClose={props.onClose}
      wide
      footer={
        <>
          <button class="tc-btn" onClick={props.onClose} disabled={saving()}>
            Cancel
          </button>
          <span class="tc-spacer" />
          <button
            class="tc-btn tc-btn--primary"
            onClick={() => void save()}
            disabled={saving() || validationError() !== ""}
          >
            {existing ? "Save changes" : "Add expense"}
          </button>
        </>
      }
    >
      <form
        class="tc-form"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <div class="tc-field-row">
          <label class="tc-field tc-field--grow">
            <span>Description</span>
            <input
              class="tc-input"
              value={description()}
              onInput={(event) => setDescription(event.currentTarget.value)}
              placeholder="Dinner, taxi, hotel..."
              autofocus
            />
          </label>
          <label class="tc-field tc-field--amount">
            <span>Amount ({props.currency})</span>
            <input
              class="tc-input"
              inputmode="decimal"
              value={amountText()}
              onInput={(event) => setAmountText(event.currentTarget.value)}
              placeholder="0.00"
            />
          </label>
        </div>

        <label class="tc-field">
          <span>Paid by</span>
          <select
            class="tc-select"
            value={payerId()}
            onChange={(event) => setPayerId(event.currentTarget.value)}
          >
            <For each={props.people}>
              {(person) => <option value={person.id}>{person.name}</option>}
            </For>
          </select>
        </label>

        <div class="tc-field">
          <span>Split</span>
          <div class="tc-segmented">
            <button
              type="button"
              class={["tc-segment", { "is-active": mode() === "even" }]}
              onClick={() => switchMode("even")}
            >
              Evenly
            </button>
            <button
              type="button"
              class={["tc-segment", { "is-active": mode() === "custom" }]}
              onClick={() => switchMode("custom")}
            >
              Custom amounts
            </button>
          </div>
        </div>

        <Show when={mode() === "even"}>
          <div class="tc-field">
            <span>
              Split between{" "}
              <span class="tc-muted">
                {participants().length} {participants().length === 1 ? "person" : "people"}
              </span>
            </span>
            <div class="tc-check-list">
              <For each={props.people}>
                {(person) => (
                  <label class="tc-check">
                    <input
                      type="checkbox"
                      checked={participants().includes(person.id)}
                      onChange={() => toggleParticipant(person.id)}
                    />
                    <span class="tc-check-name">
                      <PersonName person={person} />
                    </span>
                    <span class="tc-muted">
                      {shareByPerson().has(person.id)
                        ? formatCents(shareByPerson().get(person.id) ?? 0, props.currency)
                        : "—"}
                    </span>
                  </label>
                )}
              </For>
            </div>
          </div>
        </Show>

        <Show when={mode() === "custom"}>
          <div class="tc-field">
            <span>Amounts per person</span>
            <div class="tc-check-list">
              <For each={props.people}>
                {(person) => (
                  <div class="tc-check tc-check--input">
                    <span class="tc-check-name">
                      <PersonName person={person} />
                    </span>
                    <input
                      class="tc-input tc-input--small"
                      inputmode="decimal"
                      placeholder="0.00"
                      value={customAmounts()[person.id] ?? ""}
                      onInput={(event) =>
                        setCustomAmounts((current) => ({
                          ...current,
                          [person.id]: event.currentTarget.value,
                        }))
                      }
                    />
                  </div>
                )}
              </For>
            </div>
            <div class="tc-hint">
              <span
                class={
                  customRemaining() === 0
                    ? "tc-hint-ok"
                    : customRemaining() < 0
                      ? "tc-hint-over"
                      : ""
                }
              >
                {customRemaining() === 0
                  ? "All accounted for."
                  : customRemaining() > 0
                    ? `${formatCents(customRemaining(), props.currency)} left to assign.`
                    : `${formatCents(-customRemaining(), props.currency)} over the total.`}
              </span>
            </div>
          </div>
        </Show>

        <Show when={validationError() && (description() || amountText())}>
          <div class="tc-form-error">{validationError()}</div>
        </Show>
        <Show when={error()}>
          <div class="tc-form-error">{error()}</div>
        </Show>
      </form>
    </Modal>
  );
}
