// Brings the test database up to the current schema once per run, using the
// same migration runner production uses — so the tests exercise the real
// migrations, not a hand-maintained copy of the schema.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

export default function setup() {
  const env = { ...process.env };
  for (const line of readFileSync(".env.test", "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
  execFileSync("node", ["scripts/migrate.js"], { env, stdio: "pipe" });
}
