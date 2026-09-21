import { createMemo, createSignal } from "solid-js";
import { For, Show } from "@solidjs/web";
import { formatCents } from "../../shared/money";
import type { TripSummary } from "../../shared/types";
import { currentToken, trips } from "../state";
import { Icon } from "./Icon";

export function Sidebar(props: {
  open: boolean;
  onClose: () => void;
  onNewTrip: () => void;
  onSelect: (token: string) => void;
}) {
  const [filter, setFilter] = createSignal("");

  const matches = createMemo(() => {
    const term = filter().trim().toLowerCase();
    const list = trips();
    return term ? list.filter((trip) => trip.name.toLowerCase().includes(term)) : list;
  });

  return (
    <aside class={["tc-sidebar", { "is-open": props.open }]}>
      <div class="tc-sidebar-head">
        <input
          class="tc-search"
          placeholder="Search trips"
          value={filter()}
          onInput={(event) => setFilter(event.currentTarget.value)}
        />
        <button
          class="tc-btn tc-btn--ghost tc-btn--icon tc-sidebar-close"
          title="Close"
          onClick={props.onClose}
        >
          <Icon name="close" />
        </button>
        <button
          class="tc-btn tc-btn--ghost tc-btn--icon"
          title="New trip"
          onClick={props.onNewTrip}
        >
          <Icon name="plus" />
        </button>
      </div>

      <div class="tc-sidebar-scroll">
        <div class="tc-sidebar-section">
          Your trips <span class="tc-count">· {matches().length}</span>
        </div>
        <Show when={matches().length === 0}>
          <div class="tc-sidebar-empty">No trips yet</div>
        </Show>
        <For each={matches()}>
          {(trip) => <TripItem trip={trip} onSelect={() => props.onSelect(trip.editToken)} />}
        </For>
      </div>

      <div class="tc-sidebar-foot">
        <button class="tc-btn tc-btn--primary tc-btn--block" onClick={props.onNewTrip}>
          <Icon name="plus" /> New trip
        </button>
      </div>
    </aside>
  );
}

function TripItem(props: { trip: TripSummary; onSelect: () => void }) {
  const isActive = createMemo(() => currentToken() === props.trip.editToken);

  return (
    <button class={["tc-trip-item", { "is-active": isActive() }]} onClick={props.onSelect}>
      <span class="tc-trip-item-name">{props.trip.name}</span>
      <span class="tc-trip-item-meta">
        {props.trip.peopleCount} {props.trip.peopleCount === 1 ? "person" : "people"} ·{" "}
        {formatCents(props.trip.totalCents, props.trip.currency)}
      </span>
    </button>
  );
}
