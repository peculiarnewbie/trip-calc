import { createSignal } from "solid-js";
import { For, Show } from "@solidjs/web";
import { CURRENCIES } from "../../shared/money";
import type { Trip } from "../../shared/types";
import { api } from "../api";
import { accountNumber } from "../state";
import { Modal } from "./Modal";

const CURRENCY_KEY = "trip-calc:currency";

function storedCurrency(): string {
  try {
    return localStorage.getItem(CURRENCY_KEY) ?? "USD";
  } catch {
    return "USD";
  }
}

function rememberCurrency(currency: string): void {
  try {
    localStorage.setItem(CURRENCY_KEY, currency);
  } catch {
    // Storage can be unavailable (private mode); the selector still works.
  }
}

export function TripDialog(props: {
  trip?: Trip;
  token?: string;
  onClose: () => void;
  onCreated?: (editToken: string) => void;
  onSaved?: () => void;
}) {
  const editing = props.trip;
  const [name, setName] = createSignal(editing?.name ?? "");
  const [currency, setCurrency] = createSignal(editing?.currency ?? storedCurrency());
  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal("");

  async function save() {
    const trimmed = name().trim();
    if (!trimmed || saving()) return;
    setSaving(true);
    setError("");
    try {
      rememberCurrency(currency());
      if (editing) {
        if (!props.token) throw new Error("Missing trip link.");
        await api.updateTrip(props.token, { name: trimmed, currency: currency() });
        props.onSaved?.();
      } else {
        const created = await api.createTrip(accountNumber(), {
          name: trimmed,
          currency: currency(),
        });
        props.onCreated?.(created.editToken);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={editing ? "Trip settings" : "New trip"}
      onClose={props.onClose}
      footer={
        <>
          <button class="tc-btn" onClick={props.onClose} disabled={saving()}>
            Cancel
          </button>
          <span class="tc-spacer" />
          <button
            class="tc-btn tc-btn--primary"
            onClick={() => void save()}
            disabled={saving() || !name().trim()}
          >
            {editing ? "Save changes" : "Create trip"}
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
        <label class="tc-field">
          <span>Trip name</span>
          <input
            class="tc-input"
            value={name()}
            onInput={(event) => setName(event.currentTarget.value)}
            placeholder="Bali 2026"
            autofocus
          />
        </label>
        <label class="tc-field">
          <span>Currency</span>
          <select
            class="tc-select"
            value={currency()}
            onChange={(event) => setCurrency(event.currentTarget.value)}
          >
            <For each={CURRENCIES}>{(code) => <option value={code}>{code}</option>}</For>
          </select>
          <span class="tc-hint">Used for every amount in this trip.</span>
        </label>
        <Show when={error()}>
          <div class="tc-form-error">{error()}</div>
        </Show>
      </form>
    </Modal>
  );
}
