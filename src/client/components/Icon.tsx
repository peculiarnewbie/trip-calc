import { Match, Switch } from "@solidjs/web";

export type IconName =
  | "plus"
  | "refresh"
  | "close"
  | "trash"
  | "edit"
  | "search"
  | "users"
  | "receipt"
  | "scale"
  | "wallet"
  | "arrow-right"
  | "check"
  | "chevron-right"
  | "chevron-left"
  | "menu"
  | "share"
  | "copy"
  | "user"
  | "eye"
  | "logout"
  | "key"
  | "more"
  | "plane";

export function Icon(props: { name: IconName; size?: number }) {
  const size = () => props.size ?? 14;

  return (
    <svg
      width={size()}
      height={size()}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <Switch>
        <Match when={props.name === "plus"}>
          <path d="M12 5v14M5 12h14" />
        </Match>
        <Match when={props.name === "refresh"}>
          <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
          <path d="M21 3v5h-5" />
        </Match>
        <Match when={props.name === "close"}>
          <path d="M18 6 6 18M6 6l12 12" />
        </Match>
        <Match when={props.name === "trash"}>
          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        </Match>
        <Match when={props.name === "edit"}>
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </Match>
        <Match when={props.name === "search"}>
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </Match>
        <Match when={props.name === "users"}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </Match>
        <Match when={props.name === "receipt"}>
          <path d="M4 2v20l2-1.5L8 22l2-1.5L12 22l2-1.5L16 22l2-1.5L20 22V2l-2 1.5L16 2l-2 1.5L12 2l-2 1.5L8 2 6 3.5 4 2z" />
          <path d="M8 7h8M8 11h8M8 15h5" />
        </Match>
        <Match when={props.name === "scale"}>
          <path d="M12 3v18M7 21h10" />
          <path d="M12 6 5 9m7-3 7 3" />
          <path d="M2 15a3 3 0 0 0 6 0L5 9l-3 6zM16 15a3 3 0 0 0 6 0l-3-6-3 6z" />
        </Match>
        <Match when={props.name === "wallet"}>
          <path d="M20 12V8H6a2 2 0 0 1 0-4h12v4" />
          <path d="M4 6v12a2 2 0 0 0 2 2h14v-4" />
          <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z" />
        </Match>
        <Match when={props.name === "arrow-right"}>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </Match>
        <Match when={props.name === "check"}>
          <path d="M20 6 9 17l-5-5" />
        </Match>
        <Match when={props.name === "chevron-right"}>
          <path d="m9 18 6-6-6-6" />
        </Match>
        <Match when={props.name === "chevron-left"}>
          <path d="m15 18-6-6 6-6" />
        </Match>
        <Match when={props.name === "menu"}>
          <path d="M3 6h18M3 12h18M3 18h18" />
        </Match>
        <Match when={props.name === "share"}>
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <path d="M16 6l-4-4-4 4M12 2v13" />
        </Match>
        <Match when={props.name === "copy"}>
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </Match>
        <Match when={props.name === "user"}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </Match>
        <Match when={props.name === "eye"}>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
          <circle cx="12" cy="12" r="3" />
        </Match>
        <Match when={props.name === "logout"}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="M16 17l5-5-5-5M21 12H9" />
        </Match>
        <Match when={props.name === "key"}>
          <circle cx="7.5" cy="15.5" r="4.5" />
          <path d="m10.7 12.3 9.3-9.3M17 6l3 3M14 9l3 3" />
        </Match>
        <Match when={props.name === "more"}>
          <circle cx="12" cy="5" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="12" cy="19" r="1.6" />
        </Match>
        <Match when={props.name === "plane"}>
          <path d="M17.8 19.2 16 11l3.5-3.5a2.12 2.12 0 0 0-3-3L13 8 4.8 6.2a1 1 0 0 0-1 1.6l4.2 4.2-2 4 2 2 4-2 4.2 4.2a1 1 0 0 0 1.6-1z" />
        </Match>
      </Switch>
    </svg>
  );
}
