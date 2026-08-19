import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";

if (existsSync(".env.storage.test")) {
  for (const line of readFileSync(".env.storage.test", "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}

const { GET } = await import("@/app/api/health/route.js");

describe("the health check", () => {
  it("reports healthy when the database and storage answer", async () => {
    const res = await GET(new Request("http://test/api/health"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.checks.database).toBe("ok");
  });

  it("gives a scrapeable form for the monitoring system", async () => {
    const res = await GET(new Request("http://test/api/health?format=prometheus"));
    expect(res.headers.get("content-type")).toMatch(/text\/plain/);
    const body = await res.text();
    expect(body).toContain("fightclub_up 1");
    expect(body).toMatch(/fightclub_dependency_up\{dependency="database"\} 1/);
  });

  it("gives away nothing about the system it is checking", async () => {
    // A monitor needs a yes or no, not connection strings, versions or paths.
    const body = await (await GET(new Request("http://test/api/health"))).text();
    expect(body).not.toMatch(/postgres|password|secret|token|amazonaws|192\.168|\.rbennion|version/i);
  });

  it("is not cached, so a monitor sees the current state", async () => {
    const res = await GET(new Request("http://test/api/health"));
    expect(res.headers.get("cache-control")).toMatch(/no-store/);
  });
});

describe("what the health check being public does not open up", () => {
  it("only /api/health is added to the public list, nothing broader", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync("middleware.js", "utf8");
    const list = src.slice(src.indexOf("const publicRoutes"), src.indexOf("];"));
    expect(list).toContain('"/api/health"');
    // A trailing slash or a bare "/api" would expose far more than intended.
    expect(list).not.toMatch(/"\/api"|"\/api\/"/);
  });
});
