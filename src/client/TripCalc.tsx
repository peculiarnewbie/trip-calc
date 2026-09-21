import { createEffect, createSignal, Show } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { Errored, Loading } from "@solidjs/web";
import { AccountMenu } from "./components/AccountMenu";
import { Icon } from "./components/Icon";
import { Sidebar } from "./components/Sidebar";
import { TripDialog } from "./components/TripDialog";
import { TripView, type TripTab } from "./components/TripView";
import {
  accountNumber,
  currentToken,
  refreshTrip,
  refreshTrips,
  setUrlToken,
  tripDetail,
  trips,
} from "./state";

export function TripCalc() {
  const params = useParams();

  createEffect(
    () => (typeof params.token === "string" ? params.token : ""),
    (token) => {
      setUrlToken(token);
    },
  );

  return (
    <Errored
      fallback={(error, reset) => (
        <div class="tc-empty tc-empty--full">
          <div>
            <h2>Could not reach the server</h2>
            <p>{String(error())}</p>
            <button class="tc-btn tc-btn--primary" onClick={reset}>
              Retry
            </button>
          </div>
        </div>
      )}
    >
      <Loading fallback={<div class="tc-loading">Loading your trips...</div>}>
        <Shell />
      </Loading>
    </Errored>
  );
}

function Shell() {
  const navigate = useNavigate();
  const [creating, setCreating] = createSignal(false);
  const [tab, setTab] = createSignal<TripTab>("expenses");
  const [drawerOpen, setDrawerOpen] = createSignal(false);
  const [accountOpen, setAccountOpen] = createSignal(false);

  const readOnly = () => tripDetail()?.role === "view";
  const showSidebar = () => !readOnly() && trips().length > 0;
  const masked = () => `•••• ${accountNumber().slice(-4)}`;

  // Land on People for a trip that has none yet, otherwise on Expenses. The
  // async list is read in the compute function; the effect only applies the
  // default once per token so refreshing data never yanks the tab away.
  let tabbedFor = "";
  createEffect(
    () => {
      const token = currentToken();
      const summary = trips().find((trip) => trip.editToken === token);
      return { token, peopleCount: summary?.peopleCount ?? 0 };
    },
    ({ token, peopleCount }) => {
      if (!token || token === tabbedFor) return;
      tabbedFor = token;
      setTab(peopleCount > 0 ? "expenses" : "people");
    },
  );

  function newTrip() {
    setDrawerOpen(false);
    setCreating(true);
  }

  function openTrip(token: string) {
    setDrawerOpen(false);
    navigate(`/t/${token}`);
  }

  return (
    <div class="tc-app">
      <header class="tc-header">
        <Show when={showSidebar()}>
          <button
            class="tc-btn tc-btn--ghost tc-btn--icon tc-menu-btn"
            title="Your trips"
            aria-label="Open trips"
            onClick={() => setDrawerOpen(true)}
          >
            <Icon name="menu" size={16} />
          </button>
        </Show>

        <a
          class="tc-brand"
          href="/"
          onClick={(event) => {
            event.preventDefault();
            navigate("/");
          }}
        >
          <span class="tc-brand-mark">
            <Icon name="plane" size={13} />
          </span>
          <span>Trip Calc</span>
        </a>

        <span class="tc-header-spacer" />

        <Show when={readOnly()}>
          <span class="tc-badge" title="You opened a view-only link">
            <Icon name="eye" size={12} /> View only
          </span>
        </Show>

        <Show when={!readOnly()}>
          <button
            class="tc-btn tc-account-chip"
            title="Your account number"
            onClick={() => setAccountOpen(true)}
          >
            <Icon name="user" />
            <span class="tc-account-chip-number">{masked()}</span>
          </button>

          <button class="tc-btn tc-btn--primary tc-header-new" onClick={newTrip}>
            <Icon name="plus" /> New trip
          </button>
        </Show>
      </header>

      <div class="tc-body">
        <Show when={drawerOpen()}>
          <div class="tc-scrim" onClick={() => setDrawerOpen(false)} />
        </Show>

        <Show when={showSidebar()}>
          <Sidebar
            open={drawerOpen()}
            onClose={() => setDrawerOpen(false)}
            onNewTrip={newTrip}
            onSelect={openTrip}
          />
        </Show>

        <main class="tc-main">
          <Show when={currentToken()} fallback={<WelcomeState onNewTrip={newTrip} />}>
            <TripView tab={tab()} onTab={setTab} />
          </Show>
        </main>
      </div>

      <Show when={creating()}>
        <TripDialog
          onClose={() => setCreating(false)}
          onCreated={(editToken) => {
            setCreating(false);
            navigate(`/t/${editToken}`);
            void refreshTrips();
            void refreshTrip();
          }}
        />
      </Show>

      <Show when={accountOpen()}>
        <AccountMenu
          onClose={() => setAccountOpen(false)}
          onDone={() => {
            setAccountOpen(false);
            navigate("/");
            void refreshTrips();
            void refreshTrip();
          }}
        />
      </Show>
    </div>
  );
}

function WelcomeState(props: { onNewTrip: () => void }) {
  return (
    <div class="tc-empty tc-empty--full">
      <div>
        <Icon name="plane" size={30} />
        <p>Start a trip, add your friends, and log who paid for what.</p>
        <button class="tc-btn tc-btn--primary" onClick={props.onNewTrip}>
          <Icon name="plus" /> New trip
        </button>
        <p class="tc-note tc-note--center">
          Your account number is in the top right — save it to open your trips anywhere.
        </p>
      </div>
    </div>
  );
}
