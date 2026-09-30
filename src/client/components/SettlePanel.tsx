import { createMemo, createSignal } from "solid-js";
import { For, Show } from "@solidjs/web";
import { centsToInput, formatCents } from "../../shared/money";
import type { TripDetail } from "../../shared/types";
import { Icon } from "./Icon";
import { CopyButton } from "./CopyButton";
import { PersonName } from "./PersonName";

export function SettlePanel(props: { detail: TripDetail; readOnly?: boolean }) {
  const byId = createMemo(() => new Map(props.detail.people.map((person) => [person.id, person])));
  const currency = () => props.detail.trip.currency;
  const transfers = () => props.detail.settlement.transfers;
  const balances = () => props.detail.settlement.balances;
  const [copyError, setCopyError] = createSignal("");

  return (
    <div class="tc-panel">
      <Show when={copyError()}>
        <div class="tc-error" role="alert">
          {copyError()}
        </div>
      </Show>
      <Show
        when={props.detail.expenses.length > 0}
        fallback={
          <div class="tc-empty">
            <Icon name="scale" size={28} />
            <p>
              {props.readOnly
                ? "No expenses have been logged for this trip yet."
                : "Add some expenses and the settlement plan shows up here."}
            </p>
          </div>
        }
      >
        <div class="tc-section-title">Balances</div>
        <div class="tc-balances">
          <div class="tc-balance-row tc-balance-head">
            <span class="tc-balance-name">Person</span>
            <span class="tc-balance-cell tc-balance-paid">
              <span class="tc-cell-label">Paid</span>
              <span class="tc-num">Paid</span>
            </span>
            <span class="tc-balance-cell tc-balance-share">
              <span class="tc-cell-label">Share</span>
              <span class="tc-num">Share</span>
            </span>
            <span class="tc-balance-cell tc-balance-net">
              <span class="tc-cell-label">Net</span>
              <span class="tc-num">Net</span>
            </span>
          </div>
          <For each={balances()}>
            {(balance) => (
              <div class="tc-balance-row">
                <span class="tc-balance-name">
                  <PersonName person={byId().get(balance.personId)} />
                </span>
                <span class="tc-balance-cell tc-balance-paid">
                  <span class="tc-cell-label">Paid</span>
                  <span class="tc-num">{formatCents(balance.paidCents, currency())}</span>
                </span>
                <span class="tc-balance-cell tc-balance-share">
                  <span class="tc-cell-label">Share</span>
                  <span class="tc-num">{formatCents(balance.owedCents, currency())}</span>
                </span>
                <span class="tc-balance-cell tc-balance-net">
                  <span class="tc-cell-label">Net</span>
                  <span
                    class={[
                      "tc-num",
                      balance.netCents > 0
                        ? "tc-pos"
                        : balance.netCents < 0
                          ? "tc-neg"
                          : "tc-muted",
                    ]}
                  >
                    {balance.netCents > 0 ? "+" : ""}
                    {formatCents(balance.netCents, currency())}
                  </span>
                </span>
              </div>
            )}
          </For>
        </div>

        <Show
          when={transfers().length > 0}
          fallback={
            <div class="tc-settled">
              <Icon name="check" size={20} />
              <span>All settled up. Everyone is square.</span>
            </div>
          }
        >
          <div class="tc-section-title">
            {transfers().length} {transfers().length === 1 ? "transfer" : "transfers"} to settle
            everything
          </div>
          <ul class="tc-transfers">
            <For each={transfers()}>
              {(transfer) => (
                <li class="tc-transfer">
                  <div class="tc-transfer-summary">
                    <span class="tc-transfer-from">
                      <PersonName person={byId().get(transfer.fromPersonId)} />
                    </span>
                    <span class="tc-transfer-arrow">
                      <Icon name="arrow-right" />
                    </span>
                    <span class="tc-transfer-to">
                      <PersonName person={byId().get(transfer.toPersonId)} />
                    </span>
                    <span class="tc-spacer" />
                    <span class="tc-transfer-amount">
                      {formatCents(transfer.amountCents, currency())}
                      <CopyButton
                        value={centsToInput(transfer.amountCents, currency())}
                        label={`Copy amount owed by ${byId().get(transfer.fromPersonId)?.name} to ${byId().get(transfer.toPersonId)?.name}`}
                        onError={setCopyError}
                      />
                    </span>
                  </div>
                  <Show when={(byId().get(transfer.toPersonId)?.paymentMethods.length ?? 0) > 0}>
                    <div class="tc-transfer-methods">
                      <span class="tc-pay-label">
                        Pay {byId().get(transfer.toPersonId)?.name} with
                      </span>
                      <For each={byId().get(transfer.toPersonId)?.paymentMethods ?? []}>
                        {(entry) => (
                          <div class="tc-payment-row">
                            <div class="tc-payment-details">
                              <span class="tc-payment-name">{entry.method}</span>
                              <span class="tc-pay-text">{entry.destination}</span>
                            </div>
                            <CopyButton
                              value={entry.destination}
                              label={`Copy ${entry.method} destination for ${byId().get(transfer.toPersonId)?.name}`}
                              onError={setCopyError}
                            />
                          </div>
                        )}
                      </For>
                    </div>
                  </Show>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </Show>
    </div>
  );
}
