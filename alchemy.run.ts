import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Effect from "effect/Effect";

export default Alchemy.Stack(
  "TripCalc",
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const db = yield* Cloudflare.D1.Database("DB", {
      name: "trip-calc",
      migrations: "src/migrations",
    });

    const worker = yield* Cloudflare.Worker("Worker", {
      name: "trip-calc",
      main: "src/worker.ts",
      assets: "dist/client",
      domain: {
        name: "trip-calc.peculiarnewbie.com",
      },
      compatibility: {
        date: "2026-03-22",
        flags: ["nodejs_compat"],
      },
      env: {
        DB: db,
      },
    });

    return {
      url: worker.url,
    };
  }),
);
