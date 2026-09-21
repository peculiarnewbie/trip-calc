import { createSignal, For, Show } from "solid-js";
import { Icon, type IconName } from "./Icon";

export interface MenuItem {
  label: string;
  icon: IconName;
  onSelect: () => void;
  danger?: boolean;
}

export function Menu(props: { items: MenuItem[]; title?: string }) {
  const [open, setOpen] = createSignal(false);

  function choose(item: MenuItem) {
    setOpen(false);
    item.onSelect();
  }

  return (
    <div class="tc-menu-wrap">
      <button
        class={["tc-btn", "tc-btn--icon", { "is-open": open() }]}
        title={props.title ?? "More"}
        aria-haspopup="menu"
        aria-expanded={open() ? "true" : "false"}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="more" size={16} />
      </button>

      <Show when={open()}>
        <div class="tc-menu-scrim" onClick={() => setOpen(false)} />
        <div class="tc-menu" role="menu">
          <For each={props.items}>
            {(item) => (
              <button
                class={["tc-menu-item", { "is-danger": item.danger ?? false }]}
                role="menuitem"
                onClick={() => choose(item)}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
