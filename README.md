# Trip Calc

Split trip expenses between friends and settle up with the fewest possible
transfers. Log who paid for what — split evenly or with custom per-person
amounts — and Trip Calc works out exactly who should send how much to whom.

Built on the [web-template](https://github.com/peculiarnewbie/web-template)
(Effect + Solid.js), with the UI inspired by
[d1-studio](https://github.com/peculiarnewbie/d1-studio).

## Accounts & sharing

- **No email, no password.** A new browser is silently given a 16-digit account
  number (Mullvad-style). It lives in `localStorage` and the header chip reveals
  and copies it — save it to open your trips on another device.
- **Share links per trip.** The share dialog hands out an edit link and a
  view-only link (`/t/<token>`). View-only links hide every editing control and
  mutations are rejected server-side with `403`.

## Features

- Trip list with per-trip totals, scoped to your account number
- People per trip
- Multiple payment methods per person, with copy buttons for destinations and
  amounts on each settlement transfer
- Expenses with a payer and either an even split or custom per-person amounts
- Expenses sorted by largest amount, and split lists sorted alphabetically
- Color-code people from a muted palette; the color follows each name through
  expenses, balances, and settlement (auto-assigned, changeable per person)
- Remainder cents distributed so shares always sum to the total
- Per-trip currency in trip settings; zero-decimal currencies (IDR, JPY, KRW,
  VND…) are stored and displayed as whole units
- Settlement that minimizes the number of transfers (exact for ≤12 people,
  greedy above that) and prefers direct payments on ties
- Per-person balance breakdown (paid, share, net)
- Responsive UI: off-canvas trips drawer, card-style expenses/balances, and
  bottom-sheet dialogs on phones

## Stack

| Layer     | Tool                                                             |
| --------- | ---------------------------------------------------------------- |
| Deploy    | [Cloudflare CLI](https://developers.cloudflare.com/cf/) (`cf`)   |
| Runtime   | [Effect](https://effect.website) (`effect/unstable/http` router) |
| Frontend  | [Solid.js 2](https://solidjs.com) + Solid Router                 |
| Storage   | Cloudflare D1 + [Drizzle ORM](https://orm.drizzle.team)          |
| Build/dev | [Vite+](https://viteplus.dev) + Cloudflare Vite plugin           |
| Tests     | [Vitest](https://vitest.dev) (bundled in `vp`)                   |

## Quick start

```bash
pnpm install
cf auth login          # required for deployment; local development works without login
pnpm db:migrate:local   # create tables in the local D1 (once)
pnpm dev                # http://localhost:5173
```

## Commands

| Run                      | What it does                                             |
| ------------------------ | -------------------------------------------------------- |
| `pnpm dev`               | Vite dev server + Worker + local D1 (workerd)            |
| `pnpm build`             | Build client and Worker into `.cloudflare/output/v0`     |
| `pnpm preview`           | Build then preview in the Workers runtime                |
| `pnpm run deploy`        | Build, apply remote D1 migrations, then deploy with `cf` |
| `pnpm plan`              | Build and validate a deployment without uploading        |
| `pnpm db:migrate:local`  | Apply migrations to the local D1                         |
| `pnpm db:migrate:remote` | Apply migrations to the production D1                    |
| `pnpm db:generate`       | Generate a Drizzle migration                             |
| `pnpm check`             | Format check + lint                                      |
| `pnpm test`              | Run all tests                                            |
| `pnpm typecheck`         | TypeScript check                                         |

`cloudflare.config.ts` configures the Worker, the existing D1 database, SPA
assets, and `trip-calc.peculiarnewbie.com`. Local D1 state lives in
`.cloudflare/state`. The `cf` CLI and Cloudflare Vite plugin are pinned to beta
releases, which support the new TypeScript configuration.

Use `pnpm run deploy`: `pnpm deploy` is a different pnpm built-in command. The
deployment script builds first, applies SQL migrations from `src/migrations`,
then uploads that same build with `cf deploy --prebuilt`.

The production database was previously managed by Alchemy. The one-time
`pnpm db:adopt:alchemy` command verifies the SHA-256 hashes of migrations 0001–0004
and copies their history into `d1_migrations`; it does not rerun their SQL.
It is retained for auditing the handoff and is not part of normal deployments.

## How settlement works

Every expense stores explicit shares in cents. For each person
`net = paid − owed`; a positive net means they are owed money. The minimizer
then pairs debtors and creditors so the whole trip clears in as few transfers as
possible — exact for small groups, greedy (at most n−1 transfers) for large ones.

```bash
pnpm test   # includes a randomized comparison against a brute-force solver
```
