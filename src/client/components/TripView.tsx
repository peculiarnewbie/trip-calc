import { createSignal, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { formatCents } from "../../shared/money";
import type { TripDetail } from "../../shared/types";
import { api } from "../api";
import { currentToken, refreshAll, refreshTrip, refreshTrips, tripDetail } from "../state";
import { ExpensesPanel } from "./ExpensesPanel";
import { Icon } from "./Icon";
import { Menu } from "./Menu";
import { PeoplePanel } from "./PeoplePanel";
import { SettlePanel } from "./SettlePanel";
import { ShareDialog } from "./ShareDialog";
import { TripDialog } from "./TripDialog";

export type TripTab = "expenses" | "people" | "settle";

export function TripView(props: { tab: TripTab; onTab: (tab: TripTab) => void }) {
  const navigate = useNavigate();
  const [settings, setSettings] = createSignal(false);
  const [sharing, setSharing] = createSignal(false);
  const [error, setError] = createSignal("");

  async function removeTrip(detail: TripDetail, token: string) {
    if (!confirm(`Delete "${detail.trip.name}" and all of its expenses?`)) return;
    setError("");
    try {
      await api.deleteTrip(token);
      await refreshTrips();
      navigate("/");
      await refreshTrip();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  return (
    <Show when={tripDetail()} keyed>
      {(detail) => {
        const readOnly = () => detail.role === "view";
        const token = () => currentToken();

        return (
          <div class="tc-trip">
            <div class="tc-toolbar">
              <div class="tc-toolbar-head">
                <div class="tc-toolbar-title">{detail.trip.name}</div>
                <div class="tc-toolbar-meta">
                  {detail.people.length} {detail.people.length === 1 ? "person" : "people"} ·{" "}
                  {detail.expenses.length} {detail.expenses.length === 1 ? "expense" : "expenses"} ·{" "}
                  {formatCents(detail.settlement.totalCents, detail.trip.currency)} total
                </div>
              </div>
              <span class="tc-toolbar-spacer" />
              <div class="tc-toolbar-actions">
                <button class="tc-btn tc-btn--icon" title="Refresh" onClick={() => refreshAll()}>
                  <Icon name="refresh" />
                </button>
                <Show when={!readOnly()}>
                  <Menu
                    title="Trip actions"
                    items={[
                      { label: "Share this trip", icon: "share", onSelect: () => setSharing(true) },
                      {
                        label: "Trip settings",
                        icon: "edit",
                        onSelect: () => setSettings(true),
                      },
                      {
                        label: "Delete trip",
                        icon: "trash",
                        danger: true,
                        onSelect: () => void removeTrip(detail, token()),
                      },
                    ]}
                  />
                </Show>
              </div>
            </div>

            <Show when={error()}>
              <div class="tc-error">{error()}</div>
            </Show>

            <Show
              when={!readOnly()}
              fallback={
                <div class="tc-content tc-content--stacked">
                  <ExpensesPanel token={token()} detail={detail} readOnly onChanged={refreshAll} />
                  <Show when={detail.expenses.length > 0}>
                    <SettlePanel detail={detail} readOnly />
                  </Show>
                </div>
              }
            >
              <div class="tc-tabbar">
                <button
                  class={["tc-tab", { "is-active": props.tab === "people" }]}
                  onClick={() => props.onTab("people")}
                >
                  <Icon name="users" /> People
                </button>
                <button
                  class={["tc-tab", { "is-active": props.tab === "expenses" }]}
                  onClick={() => props.onTab("expenses")}
                >
                  <Icon name="receipt" /> Expenses
                </button>
                <button
                  class={["tc-tab", { "is-active": props.tab === "settle" }]}
                  onClick={() => props.onTab("settle")}
                >
                  <Icon name="scale" /> Settle up
                </button>
              </div>

              <div class="tc-content">
                <Show when={props.tab === "people"}>
                  <PeoplePanel
                    token={token()}
                    people={detail.people}
                    readOnly={false}
                    onChanged={refreshAll}
                  />
                </Show>
                <Show when={props.tab === "expenses"}>
                  <ExpensesPanel
                    token={token()}
                    detail={detail}
                    readOnly={false}
                    onChanged={refreshAll}
                  />
                </Show>
                <Show when={props.tab === "settle"}>
                  <SettlePanel detail={detail} />
                </Show>
              </div>
            </Show>

            <Show when={settings()}>
              <TripDialog
                trip={detail.trip}
                token={token()}
                onClose={() => setSettings(false)}
                onSaved={() => {
                  setSettings(false);
                  refreshAll();
                }}
              />
            </Show>

            <Show when={sharing() && detail.viewToken}>
              <ShareDialog
                editToken={token()}
                viewToken={detail.viewToken ?? ""}
                onClose={() => setSharing(false)}
              />
            </Show>
          </div>
        );
      }}
    </Show>
  );
}
