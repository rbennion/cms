// Loads the test database connection before any test runs. Tests never point at
// the development or production databases — .env.test names its own.
import { readFileSync, existsSync } from "node:fs";

const file = ".env.test";
if (!existsSync(file)) {
  throw new Error(
    "Missing .env.test — tests need their own database. See tests/README.md"
  );
}
for (const line of readFileSync(file, "utf8").split("\n")) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match) process.env[match[1]] = match[2].replace(/^"|"$/g, "");
}

if (!/_test(\?|$)/.test(process.env.POSTGRES_URL || "")) {
  throw new Error(
    `Refusing to run: POSTGRES_URL does not name a _test database (${process.env.POSTGRES_URL})`
  );
}
