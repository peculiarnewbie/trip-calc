import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import config from "../cloudflare.config.ts";

const database = config.worker.env.DB.id;
const names = [
  "0001_initial.sql",
  "0002_accounts.sql",
  "0003_person_color.sql",
  "0004_person_payment_info.sql",
];
const response = JSON.parse(
  execFileSync(
    "cf",
    ["d1", "query", database, "--sql", "SELECT name, hash FROM __alchemy_migrations ORDER BY id"],
    { encoding: "utf8" },
  ),
);
const history = response[0].results;
assert.deepEqual(
  history.map((entry) => entry.name).sort(),
  names,
  "Unexpected Alchemy migration history.",
);
for (const entry of history) {
  const sql = readFileSync(new URL(`../src/migrations/${entry.name}`, import.meta.url));
  const hash = createHash("sha256").update(sql).digest("hex");
  assert.equal(hash, entry.hash, `Migration contents changed: ${entry.name}`);
}

const sql = readFileSync(new URL("./adopt-alchemy-history.sql", import.meta.url), "utf8");
execFileSync("cf", ["d1", "raw", database, "--body", JSON.stringify({ sql })], {
  stdio: "inherit",
});
console.log("Alchemy migration history adopted; existing application migrations were not rerun.");
