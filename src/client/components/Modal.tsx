import type { JSX } from "@solidjs/web";
import { Show } from "@solidjs/web";
import { Icon } from "./Icon";

export function Modal(props: {
  title: string;
  onClose: () => void;
  children: JSX.Element;
  footer?: JSX.Element;
  wide?: boolean;
}) {
  return (
    <div class="tc-overlay" onClick={props.onClose}>
      <div
        class={props.wide ? "tc-dialog tc-dialog--wide" : "tc-dialog"}
        onClick={(event) => event.stopPropagation()}
      >
        <div class="tc-dialog-head">
          <span>{props.title}</span>
          <span class="tc-spacer" />
          <button class="tc-btn tc-btn--ghost tc-btn--icon" onClick={props.onClose} title="Close">
            <Icon name="close" />
          </button>
        </div>
        <div class="tc-dialog-body">{props.children}</div>
        <Show when={props.footer}>
          <div class="tc-dialog-foot">{props.footer}</div>
        </Show>
      </div>
    </div>
  );
}
