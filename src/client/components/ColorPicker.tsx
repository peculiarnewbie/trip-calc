import { createSignal, For, Show } from "solid-js";
import { PERSON_COLORS, PERSON_COLOR_KEYS, personColorKey } from "../../shared/colors";
import type { Person } from "../../shared/types";
import { Icon } from "./Icon";

export function ColorPicker(props: { person: Person; onPick: (color: string) => void }) {
  const [open, setOpen] = createSignal(false);
  const current = () => personColorKey(props.person);

  return (
    <div class="tc-menu-wrap">
      <button
        class="tc-color-swatch"
        style={{ "background-color": PERSON_COLORS[current()] }}
        title="Change color"
        aria-label="Change color"
        aria-haspopup="menu"
        aria-expanded={open() ? "true" : "false"}
        onClick={() => setOpen((value) => !value)}
      />

      <Show when={open()}>
        <div class="tc-menu-scrim" onClick={() => setOpen(false)} />
        <div class="tc-color-menu" role="menu">
          <For each={PERSON_COLOR_KEYS}>
            {(key) => (
              <button
                class={["tc-color-option", { "is-selected": current() === key }]}
                style={{ "background-color": PERSON_COLORS[key] }}
                title={key}
                aria-label={key}
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  props.onPick(key);
                }}
              >
                <Show when={current() === key}>
                  <Icon name="check" size={12} />
                </Show>
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
