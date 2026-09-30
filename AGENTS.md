# Trip Calc — Alchemy v2 + Effect + Solid.js

Split trip expenses between friends and settle up with the fewest possible
transfers. Create a trip, add the people on it, log who paid for what (split
evenly or with custom per-person amounts), and Trip Calc computes who sends how
much to whom.

## Stack

- **Alchemy v2** — infra-as-code (Cloudflare Worker + D1) for `deploy`
- **Cloudflare Vite plugin + `wrangler.jsonc`** — local dev/build (workerd + local D1)
- **Effect** — typed errors, `Context.Service`, Effect Schema, `effect/unstable/http` router
- **Solid.js 2** — reactive UI with Solid Router
- **Drizzle ORM** — D1 schema (`src/db/schema.ts`) + migrations (`src/migrations/`)
- **Vite+** — toolchain (`vp`): dev, build, fmt (oxfmt), lint (oxlint), test (Vitest)
- **TypeScript 7** beta (`tsgo --noEmit`)
- **pnpm** — package manager

## Architecture

- `wrangler.jsonc` — Worker name, `main`, D1 binding (`DB`), SPA assets with
  `run_worker_first: ["/api/*"]`. Used by the Cloudflare Vite plugin for dev/build.
- `alchemy.run.ts` — declares the D1 database and Worker for `deploy` (custom domain
  `trip-calc.peculiarnewbie.com`); assets come from `dist/client`.
- `src/worker.ts` — standard `ExportedHandler<Env>`; `/api/*` goes to the Effect
  router, everything else to static assets.
- `src/server/` — `db.ts` (D1 queries, accounts, token resolution), `routes.ts`
  (Effect `HttpRouter`), `expenses.ts` (request validation), `env.ts` (bindings).
- `src/client/` — Solid app (`TripCalc.tsx`, `state.ts`, `api.ts`, `components/`).
- `src/shared/` — `types.ts` (Effect Schema), `account.ts` (account numbers),
  `money.ts` (parsing/formatting), `settlement.ts` (balances + transfer minimization).

## Auth model

There are no emails or passwords — two independent capabilities:

- **Account number** — a Mullvad-style 16-digit number (`src/shared/account.ts`).
  A new browser profile is provisioned one silently on first load and it is stored
  in `localStorage`; the header chip reveals/copies it. The account gates
  `GET /api/trips` (scoped list) and `POST /api/trips` (create), sent as the
  `x-account-number` header. Save it to open your trips on another device.
- **Trip links** — every trip has an `edit_token` and a `view_token`. `GET /api/trips/:token`
  works with either and reports `role: "edit" | "view"`; every mutation requires the
  edit token (view tokens get 403). The share dialog hands out `/t/<token>` links.

Viewer mode (view token) hides the sidebar, people editing, expense actions, and trip
settings. Trips reached only by link (no account ownership) also hide the sidebar.

## Domain model

- `accounts` — id, number (unique), created_at
- `trips` — id, account_id, name, currency, edit_token, view_token, created_at
- `people` — id, trip_id, name, color (palette key from `shared/colors.ts`),
  payment_methods (named payout destinations, shown under settling transfers), created_at.
  Legacy payment_info is retained in the database; migration 0005 preserves it as
  a "Payment details" method.
- `expenses` — id, trip_id, description, amount_cents, payer_id, split_mode (`even` | `custom`), created_at
- `expense_shares` — id, expense_id, person_id, amount_cents

Every expense stores explicit shares in cents, so settlement is uniform: for each
person, `net = paid − owed`. Even splits are computed server-side and the remainder
cent is distributed so shares always sum to the total.

`src/shared/settlement.ts` minimizes transfers: for up to 12 non-zero balances it
solves the exact minimum with a memoized search, and otherwise falls back to the
largest-debtor/largest-creditor greedy (at most n−1 transfers). On ties it prefers
the greedy result, which never routes money through a third person.

## Solid 2 conventions (differs from 1.x and React)

- No `onMount` — use `onSettled`; props are reactive values, never destructure.
- `class` accepts arrays/objects: `class={["tc-tab", { "is-active": active }]}`.
- Async data uses async `createMemo` + `<Loading>` / `<Errored>`; after a write call
  `refresh(source)` (`refreshAll()` in `state.ts`).
- Module-scope memos/signals are the app store; no Context needed.

## Commands

| Run                     | What it does                                  |
| ----------------------- | --------------------------------------------- |
| `pnpm dev`              | Vite dev server + Worker + local D1 (workerd) |
| `pnpm build`            | Build client (`dist/client`) and Worker       |
| `pnpm preview`          | Build then preview in the Workers runtime     |
| `pnpm run deploy`       | Build then deploy the stack via Alchemy       |
| `pnpm run deploy:yes`   | Same, non-interactive (`--yes`)               |
| `pnpm destroy`          | Tear down the Alchemy stack                   |
| `pnpm db:migrate:local` | Apply migrations to the local D1 database     |
| `pnpm db:generate`      | Generate a Drizzle migration                  |
| `pnpm check`            | Format check + lint                           |
| `pnpm test`             | Run all tests (Vitest)                        |
| `pnpm typecheck`        | TypeScript 7 check                            |

> `pnpm dev` runs against a local, empty copy of `DB`. Run `pnpm db:migrate:local`
> once to create the tables. Alchemy applies `src/migrations` to the remote D1 on
> deploy, so no remote migration step is needed.
>
> `pnpm deploy` is a pnpm built-in, so use `pnpm run deploy` (or `pnpm run deploy:yes`
> for non-interactive/CI).

## Tests

Tests use plain `vitest` (via `vp test`). Keep them next to source as `*.test.ts`.
`src/shared/settlement.test.ts` validates the transfer minimizer against an
independent brute-force solver on random inputs.
