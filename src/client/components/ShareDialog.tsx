import { createSignal } from "solid-js";
import { Show } from "@solidjs/web";
import { Icon } from "./Icon";
import { Modal } from "./Modal";

function copyText(value: string): Promise<void> {
  return navigator.clipboard.writeText(value);
}

export function ShareDialog(props: { editToken: string; viewToken: string; onClose: () => void }) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const editUrl = () => `${origin}/t/${props.editToken}`;
  const viewUrl = () => `${origin}/t/${props.viewToken}`;

  const [copied, setCopied] = createSignal<"edit" | "view" | "">("");
  const [error, setError] = createSignal("");

  async function copy(kind: "edit" | "view") {
    setError("");
    try {
      await copyText(kind === "edit" ? editUrl() : viewUrl());
      setCopied(kind);
      setTimeout(() => setCopied(""), 1500);
    } catch {
      setError("Couldn't copy automatically — select the link and copy it.");
    }
  }

  return (
    <Modal
      title="Share this trip"
      onClose={props.onClose}
      footer={
        <>
          <span class="tc-spacer" />
          <button class="tc-btn tc-btn--primary" onClick={props.onClose}>
            Done
          </button>
        </>
      }
    >
      <p class="tc-note">
        Anyone with a link can open this trip — no account needed. Keep the view-only link for
        people who just need to see who owes what.
      </p>

      <div class="tc-field">
        <span>
          <Icon name="edit" /> Edit link
        </span>
        <div class="tc-copy-row">
          <input
            class="tc-input tc-mono"
            readonly
            value={editUrl()}
            onFocus={(e) => e.currentTarget.select()}
          />
          <button
            class="tc-btn tc-btn--icon"
            title="Copy edit link"
            onClick={() => void copy("edit")}
          >
            <Icon name={copied() === "edit" ? "check" : "copy"} />
          </button>
        </div>
      </div>

      <div class="tc-field">
        <span>
          <Icon name="eye" /> View-only link
        </span>
        <div class="tc-copy-row">
          <input
            class="tc-input tc-mono"
            readonly
            value={viewUrl()}
            onFocus={(e) => e.currentTarget.select()}
          />
          <button
            class="tc-btn tc-btn--icon"
            title="Copy view-only link"
            onClick={() => void copy("view")}
          >
            <Icon name={copied() === "view" ? "check" : "copy"} />
          </button>
        </div>
      </div>

      <p class="tc-note tc-note--warn">
        Save your account number too (top-right) if you want to get back to your trips later.
      </p>

      <Show when={error()}>
        <div class="tc-form-error">{error()}</div>
      </Show>
    </Modal>
  );
}
