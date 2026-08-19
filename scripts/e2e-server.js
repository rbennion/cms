// Builds and serves the app for the browser tests, using the e2e environment
// only. Kept as a script rather than a shell one-liner so the environment can
// never leak in from the developer's own .env.local.
const { execFileSync, spawn } = require("child_process");
const { readFileSync, existsSync } = require("fs");

if (!existsSync(".env.e2e")) {
  console.error("Missing .env.e2e — see e2e/README.md");
  process.exit(1);
}

const env = { ...process.env };
for (const line of readFileSync(".env.e2e", "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
}

if (!/_e2e(\?|$)/.test(env.POSTGRES_URL || "")) {
  console.error(`Refusing to run: POSTGRES_URL is not an _e2e database (${env.POSTGRES_URL})`);
  process.exit(1);
}

env.PORT = "3100";
env.NODE_ENV = "production";

console.log("==> building the app for browser tests");
execFileSync("npx", ["next", "build"], { env, stdio: "inherit" });

console.log("==> serving on http://localhost:3100");
const server = spawn("npx", ["next", "start", "-p", "3100"], { env, stdio: "inherit" });
process.on("SIGTERM", () => server.kill("SIGTERM"));
process.on("SIGINT", () => server.kill("SIGINT"));
