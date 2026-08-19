import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { json, params, TEST_PREFIX } from "./helpers.js";

vi.mock("@/lib/api-auth", () => ({
  requireAuth: async () => ({ session: { user: { id: String(globalThis.__uid ?? 1), isAdmin: true } } }),
  requireAdmin: async () => ({ session: { user: { id: String(globalThis.__uid ?? 1), isAdmin: true } } }),
}));
vi.mock("@/lib/auth", () => ({
  auth: async () => ({ user: { id: String(globalThis.__uid ?? 1), email: "zztest.admin@example.invalid", isAdmin: true } }),
  handlers: {}, signIn: async () => {}, signOut: async () => {},
}));

const users = await import("@/app/api/users/route.js");
const userOne = await import("@/app/api/users/[id]/route.js");
const register = await import("@/app/api/auth/register/route.js");
const forgot = await import("@/app/api/auth/forgot-password/route.js");
const reset = await import("@/app/api/auth/reset-password/route.js");
const changePassword = await import("@/app/api/account/change-password/route.js");
const { run, query, get } = await import("@/lib/db");
const bcrypt = (await import("bcryptjs")).default;

const rows = (b) => (Array.isArray(b) ? b : b.data || []);
let adminId, targetId;

beforeAll(async () => {
  const res = await run(
    "INSERT INTO users (email, password_hash, name, is_active, is_admin) VALUES (?, ?, ?, TRUE, TRUE)",
    ["zztest.admin@example.invalid", bcrypt.hashSync("original-password", 10), `${TEST_PREFIX} Admin`]
  );
  adminId = res.lastInsertRowid;
  globalThis.__uid = adminId;
});

afterAll(async () => {
  await query("DELETE FROM password_reset_tokens WHERE user_id IN (SELECT id FROM users WHERE email LIKE ?)",
    ["zztest.%@example.invalid"]);
  await query("DELETE FROM users WHERE email LIKE ?", ["zztest.%@example.invalid"]);
});

describe("registering an account", () => {
  it("requires a name, an email and a password", async () => {
    const res = await register.POST(json("http://test/x", "POST", { email: "zztest.new@example.invalid" }));
    expect(res.status).toBe(400);
  });

  it("creates an account", async () => {
    const res = await register.POST(json("http://test/x", "POST", {
      name: `${TEST_PREFIX} New Person`, email: "zztest.new@example.invalid", password: "a-good-password",
    }));
    expect(res.status).toBeLessThan(300);
    const row = await get("SELECT id, password_hash, is_active FROM users WHERE email = ?", ["zztest.new@example.invalid"]);
    targetId = row.id;
    expect(row).toBeTruthy();
    // The password is never stored as typed.
    expect(row.password_hash).not.toBe("a-good-password");
    expect(row.password_hash.startsWith("$2")).toBe(true);
  });

  it("new accounts start switched off, awaiting approval", async () => {
    const row = await get("SELECT is_active FROM users WHERE email = ?", ["zztest.new@example.invalid"]);
    expect(row.is_active).toBe(false);
  });

  it("will not register the same address twice", async () => {
    const res = await register.POST(json("http://test/x", "POST", {
      name: "Someone", email: "zztest.new@example.invalid", password: "another-password",
    }));
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

describe("managing accounts as an administrator", () => {
  it("lists accounts without exposing any passwords", async () => {
    const res = await users.GET(new Request("http://test/api/users"));
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).not.toContain("password_hash");
    expect(rows(JSON.parse(body)).length).toBeGreaterThan(0);
  });

  it("activates an account", async () => {
    // The update replaces the whole record, so the name and address travel with
    // it — sending only the flags would blank them.
    const res = await userOne.PUT(
      json("http://test/x", "PUT", {
        name: `${TEST_PREFIX} New Person`, email: "zztest.new@example.invalid",
        is_active: true, is_admin: false,
      }),
      params(targetId)
    );
    expect(res.status).toBeLessThan(300);
    const row = await get("SELECT is_active FROM users WHERE id = ?", [targetId]);
    expect(row.is_active).toBe(true);
  });

  it("reads one account back", async () => {
    const res = await userOne.GET(new Request("http://test/x"), params(targetId));
    expect(res.status).toBe(200);
    expect(await res.text()).not.toContain("password_hash");
  });

  it("deletes an account", async () => {
    const res = await userOne.DELETE(new Request("http://test/x", { method: "DELETE" }), params(targetId));
    expect(res.status).toBeLessThan(300);
    expect(await get("SELECT id FROM users WHERE id = ?", [targetId])).toBeNull();
  });
});

describe("changing your own password", () => {
  it("refuses when the current password is wrong", async () => {
    const res = await changePassword.POST(json("http://test/x", "POST", {
      currentPassword: "not-the-right-one", newPassword: "brand-new-password",
    }));
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("changes it when the current password is right", async () => {
    const res = await changePassword.POST(json("http://test/x", "POST", {
      currentPassword: "original-password", newPassword: "brand-new-password",
    }));
    expect(res.status).toBeLessThan(300);
    const row = await get("SELECT password_hash FROM users WHERE id = ?", [adminId]);
    expect(bcrypt.compareSync("brand-new-password", row.password_hash)).toBe(true);
  });
});

describe("forgotten passwords", () => {
  it("gives the same answer whether or not the address is known", async () => {
    // Otherwise the form tells a stranger which addresses have accounts.
    const known = await forgot.POST(json("http://test/x", "POST", { email: "zztest.admin@example.invalid" }));
    const unknown = await forgot.POST(json("http://test/x", "POST", { email: "nobody@example.invalid" }));
    expect(known.status).toBe(unknown.status);
  });

  it("records a reset token for a real account", async () => {
    await forgot.POST(json("http://test/x", "POST", { email: "zztest.admin@example.invalid" }));
    const tokens = await query("SELECT id FROM password_reset_tokens WHERE user_id = ?", [adminId]);
    expect(tokens.length).toBeGreaterThan(0);
  });

  it("refuses a reset with a token that was never issued", async () => {
    const res = await reset.POST(json("http://test/x", "POST", {
      token: "not-a-real-token", password: "whatever-password",
    }));
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
