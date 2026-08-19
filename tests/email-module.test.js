import { describe, it, expect } from "vitest";

// Every other test stubs this module, which means nothing was checking it can
// even be imported. Rewriting it once silently removed two functions the waiver
// routes depend on, and the suite stayed green. This file loads the real thing.
const email = await import("@/lib/email");

describe("the email module keeps its shape", () => {
  it("exports everything the rest of the app imports from it", () => {
    // Anything the routes import must be here, or the build breaks.
    for (const name of ["sendWaiverRequest", "sendPasswordReset", "buildSigningUrl"]) {
      expect(typeof email[name], `${name} is missing from lib/email`).toBe("function");
    }
  });

  it("builds a signing link from a token", () => {
    const url = email.buildSigningUrl("token123");
    expect(url).toMatch(/\/sign\/token123$/);
    expect(url).not.toContain("//sign");   // no doubled slash from a trailing one
  });
});

describe("no route imports something that is not there", () => {
  it("every named import from lib/email actually exists", async () => {
    const { readdirSync, readFileSync, statSync } = await import("node:fs");
    const { join } = await import("node:path");
    const walk = (dir) => readdirSync(dir).flatMap((f) => {
      const p = join(dir, f);
      return statSync(p).isDirectory() ? walk(p) : [p];
    });
    const missing = [];
    for (const file of walk("app").concat(walk("lib"))) {
      if (!file.endsWith(".js")) continue;
      const src = readFileSync(file, "utf8");
      const m = src.match(/import\s*\{([^}]+)\}\s*from\s*["']@\/lib\/email["']/);
      if (!m) continue;
      for (const raw of m[1].split(",")) {
        const name = raw.trim().split(/\s+as\s+/)[0].trim();
        if (name && typeof email[name] !== "function") missing.push(`${file} imports ${name}`);
      }
    }
    expect(missing, missing.join("; ")).toEqual([]);
  });
});
