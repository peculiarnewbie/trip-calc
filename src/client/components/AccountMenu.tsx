import { createSignal } from "solid-js";
import { Show } from "@solidjs/web";
import {
  formatAccountNumber,
  isValidAccountNumber,
  normalizeAccountNumber,
} from "../../shared/account";
import { accountNumber, forgetAccount, useAccount } from "../state";
import { Icon } from "./Icon";
import { Modal } from "./Modal";

export function AccountMenu(props: { onClose: () => void; onDone: () => void }) {
  const [switching, setSwitching] = createSignal(false);
  const [input, setInput] = createSignal("");
  const [error, setError] = createSignal("");
  const [copied, setCopied] = createSignal(false);

  async function copy() {
    setError("");
    try {
      await navigator.clipboard.writeText(accountNumber());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Couldn't copy automatically — select the number and copy it.");
    }
  }

  function applySwitch() {
    const number = normalizeAccountNumber(input());
    if (!isValidAccountNumber(number)) {
      setError("Enter the full 16-digit number.");
      return;
    }
    useAccount(number);
    props.onDone();
  }

  function forget() {
    if (
      !confirm(
        "Forget this device? Your trips stay on the server, but you'll need this number to open them again.",
      )
    ) {
      return;
    }
    forgetAccount();
    props.onDone();
  }

  return (
    <Modal
      title="Your account"
      onClose={props.onClose}
      footer={
        <>
          <button class="tc-btn tc-btn--danger" onClick={forget}>
            <Icon name="logout" /> Forget this device
          </button>
          <span class="tc-spacer" />
          <button class="tc-btn tc-btn--primary" onClick={props.onClose}>
            Done
          </button>
        </>
      }
    >
      <p class="tc-note">
        There's no email or password. This number <strong>is</strong> your account — save it
        somewhere safe to open your trips on another device.
      </p>

      <div class="tc-account-number">
        <span class="tc-mono">{formatAccountNumber(accountNumber())}</span>
        <button class="tc-btn tc-btn--ghost tc-btn--icon" title="Copy" onClick={() => void copy()}>
          <Icon name={copied() ? "check" : "copy"} />
        </button>
      </div>

      <Show
        when={switching()}
        fallback={
          <button class="tc-btn tc-btn--block" onClick={() => setSwitching(true)}>
            <Icon name="key" /> Use a number from another device
          </button>
        }
      >
        <label class="tc-field">
          <span>Paste your 16-digit account number</span>
          <input
            class="tc-input tc-mono"
            inputmode="numeric"
            placeholder="1234 5678 9012 3456"
            value={input()}
            autofocus
            onInput={(event) => setInput(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") applySwitch();
            }}
          />
        </label>
        <button class="tc-btn tc-btn--primary tc-btn--block" onClick={applySwitch}>
          Switch to this account
        </button>
      </Show>

      <Show when={error()}>
        <div class="tc-form-error">{error()}</div>
      </Show>
    </Modal>
  );
}
