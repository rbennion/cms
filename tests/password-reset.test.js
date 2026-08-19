import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { json, TEST_PREFIX } from "./helpers.js";

// The email itself is intercepted — nothing is actually sent — but the flow is
// exercised for real: token issued, message addressed and composed, link usable,
// password changed, token spent.
const sent = [];
vi.mock("@/lib/email", () => ({
  sendPasswordReset: async (args) => { sent.push(args); return { messageId: "test" }; },
  sendWaiverRequest: async () => ({ messageId: "test" }),
}));

const forgot = await import("@/app/api/auth/forgot-password/route.js");
const reset = await import("@/app/api/auth/reset-password/route.js");
const { run, query, get } = await import("@/lib/db");
const bcrypt = (await import("bcryptjs")).default;

let userId;
beforeAll(async () => {
  const res = await run(
    "INSERT INTO users (email, password_hash, name, is_active, is_admin) VALUES (?, ?, ?, TRUE, FALSE)",
    ["zztest.reset@example.invalid", bcrypt.hashSync("the-old-password", 10), `${TEST_PREFIX} Reset`]
  );
  userId = res.lastInsertRowid;
});
afterAll(async () => {
  await query("DELETE FROM password_reset_tokens WHERE user_id = ?", [userId]);
  await query("DELETE FROM users WHERE id = ?", [userId]);
});

describe("asking for a reset link", () => {
  it("sends one to the account holder", async () => {
    const res = await forgot.POST(json("http://test/x", "POST", { email: "zztest.reset@example.invalid" }));
    expect(res.status).toBe(200);
    expect(sent.length).toBe(1);
    expect(sent[0].to).toBe("zztest.reset@example.invalid");
    expect(sent[0].resetUrl).toContain("/reset-password?token=");
  });

  it("sends nothing to an address with no account", async () => {
    const before = sent.length;
    await forgot.POST(json("http://test/x", "POST", { email: "nobody@example.invalid" }));
    expect(sent.length).toBe(before);
  });

  it("gives the same answer either way, so it cannot be used to find accounts", async () => {
    const known = await forgot.POST(json("http://test/x", "POST", { email: "zztest.reset@example.invalid" }));
    const unknown = await forgot.POST(json("http://test/x", "POST", { email: "nobody@example.invalid" }));
    expect(known.status).toBe(unknown.status);
    expect(await known.text()).toBe(await unknown.text());
  });

  it("never puts the link in the response", async () => {
    const res = await forgot.POST(json("http://test/x", "POST", { email: "zztest.reset@example.invalid" }));
    expect(await res.text()).not.toContain("token=");
  });
});

describe("using the link", () => {
  it("changes the password", async () => {
    await forgot.POST(json("http://test/x", "POST", { email: "zztest.reset@example.invalid" }));
    const token = sent.at(-1).resetUrl.split("token=")[1];
    const res = await reset.POST(json("http://test/x", "POST", { token, password: "a-brand-new-password" }));
    expect(res.status).toBeLessThan(300);
    const row = await get("SELECT password_hash FROM users WHERE id = ?", [userId]);
    expect(bcrypt.compareSync("a-brand-new-password", row.password_hash)).toBe(true);
  });

  it("cannot be used a second time", async () => {
    const token = sent.at(-1).resetUrl.split("token=")[1];
    const res = await reset.POST(json("http://test/x", "POST", { token, password: "another-password" }));
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("refuses a token that was never issued", async () => {
    const res = await reset.POST(json("http://test/x", "POST", { token: "made-up", password: "whatever" }));
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("refuses an expired token", async () => {
    await run(
      "INSERT INTO password_reset_tokens (user_id, token, expires_at, used) VALUES (?, ?, ?, FALSE)",
      [userId, "zztest-stale-token", new Date(Date.now() - 3600_000).toISOString()]
    );
    const res = await reset.POST(json("http://test/x", "POST", { token: "zztest-stale-token", password: "whatever" }));
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
