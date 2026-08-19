import { describe, it, expect, vi } from "vitest";
import { json, params } from "./helpers.js";

// A signed-in user who is not an administrator. The question here is not whether
// the door is locked — the previous file covers that — but whether an ordinary
// staff account can reach the things only an administrator should.
vi.mock("@/lib/auth", () => ({
  auth: async () => ({ user: { id: "99", email: "staff@example.invalid", isAdmin: false } }),
  handlers: {}, signIn: async () => {}, signOut: async () => {},
}));

const req = new Request("http://test/x");
const body = (method) => json("http://test/x", method, {});
const p = params(1);

const adminOnly = [
  ["/api/users", "@/app/api/users/route.js", ["GET", "POST"]],
  ["/api/users/[id]", "@/app/api/users/[id]/route.js", ["GET", "PUT", "DELETE"]],
  ["/api/users/[id]/reset-password", "@/app/api/users/[id]/reset-password/route.js", ["POST"]],
  ["/api/debug", "@/app/api/debug/route.js", ["GET"]],
  ["/api/setup/purge", "@/app/api/setup/purge/route.js", ["POST"]],
  ["/api/setup/seed", "@/app/api/setup/seed/route.js", ["GET"]],
];

describe("an ordinary account cannot do administrator things", () => {
  for (const [label, modulePath, methods] of adminOnly) {
    for (const method of methods) {
      it(`${method} ${label}`, async () => {
        const mod = await import(modulePath);
        const handler = mod[method];
        if (!handler) return;
        const res = await handler(method === "GET" || method === "DELETE" ? req : body(method), p);
        expect(
          [401, 403].includes(res.status),
          `${method} ${label} let a non-admin through with ${res.status}`
        ).toBe(true);
      });
    }
  }
});

describe("the account list is never exposed to a non-administrator", () => {
  it("returns no email addresses of other users", async () => {
    const { GET } = await import("@/app/api/users/route.js");
    const res = await GET(req);
    expect(await res.text()).not.toMatch(/password_hash|@fightclub|@rbennion/);
  });
});

describe("ordinary work is still allowed", () => {
  // The gate must not be so tight that staff cannot do their jobs.
  it("can read the people list", async () => {
    const { GET } = await import("@/app/api/people/route.js");
    const res = await GET(new Request("http://test/api/people?limit=1"));
    expect(res.status).toBe(200);
  });

  it("can read the certification roster", async () => {
    const { GET } = await import("@/app/api/certifications/route.js");
    expect((await GET(new Request("http://test/api/certifications"))).status).toBe(200);
  });
});
