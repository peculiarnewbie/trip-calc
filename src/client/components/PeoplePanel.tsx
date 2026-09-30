import { createSignal, For, Show } from "solid-js";
import { personColor } from "../../shared/colors";
import type { Person } from "../../shared/types";
import { api } from "../api";
import { ColorPicker } from "./ColorPicker";
import { Icon } from "./Icon";
import { PaymentMethodsEditor } from "./PaymentMethodsEditor";

export function PeoplePanel(props: {
  token: string;
  people: readonly Person[];
  readOnly: boolean;
  onChanged: () => void;
}) {
  const [name, setName] = createSignal("");
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal("");

  async function add(event: Event) {
    event.preventDefault();
    const trimmed = name().trim();
    if (!trimmed || busy()) return;
    setBusy(true);
    setError("");
    try {
      await api.addPerson(props.token, { name: trimmed });
      setName("");
      props.onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  async function setColor(person: Person, color: string) {
    setError("");
    try {
      await api.updatePerson(props.token, person.id, { color });
      props.onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function remove(person: Person) {
    if (!confirm(`Remove ${person.name} from this trip?`)) return;
    setError("");
    try {
      await api.removePerson(props.token, person.id);
      props.onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  return (
    <div class="tc-panel">
      <div class="tc-panel-head">
        <span class="tc-toolbar-meta">
          {props.people.length} {props.people.length === 1 ? "person" : "people"}
        </span>
      </div>

      <Show when={error()}>
        <div class="tc-error">{error()}</div>
      </Show>

      <Show when={!props.readOnly}>
        <form class="tc-add-row" onSubmit={add}>
          <input
            class="tc-input"
            placeholder="Add a name"
            value={name()}
            onInput={(event) => setName(event.currentTarget.value)}
          />
          <button class="tc-btn tc-btn--primary" type="submit" disabled={busy() || !name().trim()}>
            <Icon name="plus" /> Add
          </button>
        </form>
      </Show>

      <Show
        when={props.people.length > 0}
        fallback={
          <div class="tc-empty">
            <Icon name="users" size={28} />
            <p>
              {props.readOnly
                ? "No one has been added to this trip."
                : "Add the people on this trip, then start logging expenses."}
            </p>
          </div>
        }
      >
        <div class="tc-people-list">
          <For each={props.people}>
            {(person) => {
              const color = () => personColor(person);

              return (
                <div class="tc-person">
                  <span
                    class="tc-person-avatar"
                    style={{
                      color: color(),
                      "background-color": `color-mix(in srgb, ${color()} 20%, transparent)`,
                    }}
                  >
                    {person.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span class="tc-person-name" style={{ color: color() }}>
                    {person.name}
                  </span>
                  <Show when={!props.readOnly}>
                    <ColorPicker person={person} onPick={(next) => void setColor(person, next)} />
                    <button
                      class="tc-btn tc-btn--danger tc-btn--icon"
                      title={`Remove ${person.name}`}
                      onClick={() => void remove(person)}
                    >
                      <Icon name="trash" />
                    </button>
                  </Show>
                  <PaymentMethodsEditor
                    token={props.token}
                    person={person}
                    readOnly={props.readOnly}
                    onChanged={props.onChanged}
                  />
                </div>
              );
            }}
          </For>
        </div>
      </Show>
    </div>
  );
}
