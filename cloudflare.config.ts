import { bindings, defineConfig } from "cf/config";

export default defineConfig({
  worker: {
    name: "trip-calc",
    domains: ["trip-calc.peculiarnewbie.com"],
    compatibilityDate: "2026-03-22",
    compatibilityFlags: ["nodejs_compat"],
    entrypoint: "./src/worker.ts",
    assets: {
      notFoundHandling: "single-page-application",
      runWorkerFirst: ["/api/*"],
    },
    env: {
      DB: bindings.d1({
        name: "trip-calc",
        id: "7ba4c32c-3bac-4510-b1b7-5c6a567346f6",
      }),
      ASSETS: bindings.assets(),
    },
  },
});
