import { createSignal, For, Show } from "solid-js";
import type { PaymentMethod, Person } from "../../shared/types";
import { api } from "../api";
import { Icon } from "./Icon";

export function PaymentMethodsEditor(props: {
  token: string;
  person: Person;
  readOnly: boolean;
  onChanged: () => void;
}) {
  const [methods, setMethods] = createSignal<readonly PaymentMethod[]>(props.person.paymentMethods);
  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal("");
  const normalized = () =>
    methods().map((entry) => ({
      method: entry.method.trim(),
      destination: entry.destination.trim(),
    }));
  const changed = () =>
    JSON.stringify(normalized()) !== JSON.stringify(props.person.paymentMethods);

  function update(index: number, field: keyof PaymentMethod, value: string) {
    setMethods((entries) =>
      entries.map((entry, i) => (i === index ? { ...entry, [field]: value } : entry)),
    );
  }

  async function save(event: Event) {
    event.preventDefault();
    if (props.readOnly || saving() || !changed()) return;
    setSaving(true);
    setError("");
    try {
      await api.updatePerson(props.token, props.person.id, { paymentMethods: normalized() });
      props.onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      class="tc-person-pay"
      onSubmit={save}
      aria-label={`Payment methods for ${props.person.name}`}
    >
      <For each={methods()} keyed={false}>
        {(entry, index) => (
          <div class="tc-payment-edit-row">
            <label class="tc-payment-field">
              <span>Method</span>
              <input
                class="tc-input"
                placeholder="GoPay, Bank Jago…"
                aria-label={`Payment method ${index + 1} for ${props.person.name}`}
                required
                maxlength={100}
                readonly={props.readOnly}
                disabled={saving()}
                value={entry().method}
                onInput={(event) => update(index, "method", event.currentTarget.value)}
              />
            </label>
            <label class="tc-payment-field">
              <span>Destination</span>
              <input
                class="tc-input tc-mono"
                placeholder="Phone or account number"
                aria-label={`Payment destination ${index + 1} for ${props.person.name}`}
                required
                maxlength={1000}
                readonly={props.readOnly}
                disabled={saving()}
                value={entry().destination}
                onInput={(event) => update(index, "destination", event.currentTarget.value)}
              />
            </label>
            <Show when={!props.readOnly}>
              <button
                class="tc-btn tc-btn--danger tc-btn--icon"
                type="button"
                title={`Remove payment method ${index + 1} for ${props.person.name}`}
                aria-label={`Remove payment method ${index + 1} for ${props.person.name}`}
                disabled={saving()}
                onClick={() => setMethods((entries) => entries.filter((_, i) => i !== index))}
              >
                <Icon name="trash" />
              </button>
            </Show>
          </div>
        )}
      </For>
      <Show when={!props.readOnly}>
        <div class="tc-payment-actions">
          <button
            class="tc-btn tc-btn--ghost"
            type="button"
            disabled={saving() || methods().length >= 20}
            onClick={() => setMethods((entries) => [...entries, { method: "", destination: "" }])}
          >
            <Icon name="plus" /> Add payment method
          </button>
          <Show when={changed()}>
            <button class="tc-btn tc-btn--primary" type="submit" disabled={saving()}>
              {saving() ? "Saving…" : "Save payment methods"}
            </button>
          </Show>
        </div>
      </Show>
      <Show when={error()}>
        <div class="tc-form-error" role="alert">
          {error()}
        </div>
      </Show>
    </form>
  );
}
