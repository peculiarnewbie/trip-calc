import { createSignal, onCleanup } from "solid-js";
import { Icon } from "./Icon";

export function CopyButton(props: {
  value: string;
  label: string;
  onError: (message: string) => void;
}) {
  const [copied, setCopied] = createSignal(false);
  let timer: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => clearTimeout(timer));

  async function copy() {
    props.onError("");
    clearTimeout(timer);
    setCopied(false);
    try {
      await navigator.clipboard.writeText(props.value);
      setCopied(true);
      timer = setTimeout(() => setCopied(false), 1500);
    } catch {
      props.onError("Couldn't copy automatically — select the text and copy it.");
    }
  }

  return (
    <button
      class="tc-btn tc-btn--ghost tc-copy-btn"
      type="button"
      title={props.label}
      aria-label={props.label}
      onClick={() => void copy()}
    >
      <Icon name={copied() ? "check" : "copy"} />
      <span aria-live="polite">{copied() ? "Copied" : "Copy"}</span>
    </button>
  );
}
