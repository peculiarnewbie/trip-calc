# Trip Calc — Cloudflare CLI + Effect + Solid.js

Split trip expenses between friends and settle up with the fewest possible
transfers. Create a trip, add the people on it, log who paid for what (split
evenly or with custom per-person amounts), and Trip Calc computes who sends how
much to whom.

## Stack

- **Cloudflare CLI (`cf`)** — dev, build, D1 migrations, and deploy
- **Cloudflare Vite plugin + `cloudflare.config.ts`** — workerd + local D1;
  the CLI and plugin are pinned to beta releases for the new configuration
- **Effect** — typed errors, `Context.Service`, Effect Schema, `effect/unstable/http` router
- **Solid.js 2** — reactive UI with Solid Router
- **Drizzle ORM** — D1 schema (`src/db/schema.ts`) + migrations (`src/migrations/`)
- **Vite+** — Vite bundler and toolchain (`vp`): fmt (oxfmt), lint (oxlint), test (Vitest)
- **TypeScript 7** beta (`tsgo --noEmit`)
- **pnpm** — package manager

## Architecture

- `cloudflare.config.ts` — Worker entrypoint, existing D1 binding (`DB`), SPA
  assets with `runWorkerFirst: ["/api/*"]`, and custom domain
  `trip-calc.peculiarnewbie.com`. Used by `cf` and the Cloudflare Vite plugin.
- `.cloudflare/output/v0` — built Worker and client assets, uploaded by `cf deploy`.
- `scripts/adopt-alchemy-history.mjs` + `.sql` — one-time, hash-verified adoption
  of migrations 0001–0004 from Alchemy's history into `d1_migrations`.
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

| Run                      | What it does                                         |
| ------------------------ | ---------------------------------------------------- |
| `pnpm dev`               | Vite dev server + Worker + local D1 (workerd)        |
| `pnpm build`             | Build client and Worker into `.cloudflare/output/v0` |
| `pnpm preview`           | Build then preview in the Workers runtime            |
| `pnpm run deploy`        | Build, migrate remote D1, then deploy with `cf`      |
| `pnpm plan`              | Build and validate a deployment without uploading    |
| `pnpm db:migrate:local`  | Apply migrations to the local D1 database            |
| `pnpm db:migrate:remote` | Apply migrations to the production D1                |
| `pnpm db:adopt:alchemy`  | Verify and adopt legacy migration history once       |
| `pnpm db:generate`       | Generate a Drizzle migration                         |
| `pnpm check`             | Format check + lint                                  |
| `pnpm test`              | Run all tests (Vitest)                               |
| `pnpm typecheck`         | TypeScript 7 check                                   |

> `pnpm dev` runs against a local, empty copy of `DB`. Run `pnpm db:migrate:local`
> once to create the tables. Local state lives in `.cloudflare/state`. The deploy
> script builds, applies `src/migrations` to remote D1, then deploys the prebuilt
> output. `cf` D1 commands default to remote; use `--local` for development.
>
> `pnpm deploy` is a pnpm built-in, so use `pnpm run deploy`.

## Tests

Tests use plain `vitest` (via `vp test`). Keep them next to source as `*.test.ts`.
`src/shared/settlement.test.ts` validates the transfer minimizer against an
independent brute-force solver on random inputs.
