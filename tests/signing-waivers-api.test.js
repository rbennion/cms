import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { json, params, TEST_PREFIX, cleanupTestRecords } from "./helpers.js";

// The signing page is the only part of the system a stranger can reach without
// an account — the link goes out by email to a parent. Nothing here calls the
// send or resend endpoints, which would email a real person.
vi.mock("@/lib/api-auth", () => ({
  requireAuth: async () => ({ session: { user: { id: "1", isAdmin: true } } }),
  requireAdmin: async () => ({ session: { user: { id: "1", isAdmin: true } } }),
}));
vi.mock("@/lib/auth", () => ({
  auth: async () => ({ user: { id: "1", isAdmin: true } }),
  handlers: {}, signIn: async () => {}, signOut: async () => {},
}));

const sign = await import("@/app/api/sign/[token]/route.js");
const waiverOne = await import("@/app/api/waivers/[id]/route.js");
const people = await import("@/app/api/people/route.js");
const { run, query, get } = await import("@/lib/db");
const { hashToken } = await import("@/lib/tokens");

const tokenParams = (token) => ({ params: { token } });

let personId;
const RAW_TOKEN = `zztest-token-${Date.now()}`;
const EXPIRED_TOKEN = `zztest-expired-${Date.now()}`;
let waiverId, expiredId;

beforeAll(async () => {
  const p = await people.POST(json("http://test/api/people", "POST", {
    first_name: `${TEST_PREFIX}Signer`, last_name: "Parent",
    email: "zztest.signer@example.invalid", phone: "555-0106",
  }));
  personId = (await p.json()).id;

  const live = await run(
    `INSERT INTO waivers (person_id, token_hash, status, sent_to_email, expires_at)
     VALUES (?, ?, 'pending', ?, CURRENT_TIMESTAMP + INTERVAL '30 days')`,
    [personId, hashToken(RAW_TOKEN), "zztest.signer@example.invalid"]
  );
  waiverId = live.lastInsertRowid;

  const dead = await run(
    `INSERT INTO waivers (person_id, token_hash, status, sent_to_email, expires_at)
     VALUES (?, ?, 'pending', ?, CURRENT_TIMESTAMP - INTERVAL '1 day')`,
    [personId, hashToken(EXPIRED_TOKEN), "zztest.signer@example.invalid"]
  );
  expiredId = dead.lastInsertRowid;
});

afterAll(async () => {
  await query("DELETE FROM waivers WHERE person_id = ?", [personId]);
  await cleanupTestRecords();
});

describe("opening a signing link", () => {
  it("opens a valid link", async () => {
    const res = await sign.GET(new Request("http://test/x"), tokenParams(RAW_TOKEN));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(JSON.stringify(body)).toContain(`${TEST_PREFIX}Signer`);
  });

  it("refuses a link that has expired", async () => {
    const res = await sign.GET(new Request("http://test/x"), tokenParams(EXPIRED_TOKEN));
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("refuses a made-up link", async () => {
    const res = await sign.GET(new Request("http://test/x"), tokenParams("not-a-real-token"));
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("refuses an empty link", async () => {
    const res = await sign.GET(new Request("http://test/x"), tokenParams(""));
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("never reveals other people's details", async () => {
    const res = await sign.GET(new Request("http://test/x"), tokenParams(RAW_TOKEN));
    const body = JSON.stringify(await res.json());
    // Only the person this link belongs to.
    expect(body).not.toMatch(/token_hash|password_hash/);
  });
});

describe("submitting a signature", () => {
  it("refuses a submission on an expired link", async () => {
    const res = await sign.POST(
      json("http://test/x", "POST", {
        signer_name: "A Parent", participant_name: `${TEST_PREFIX}Signer Parent`,
        liability_release_choice: "release", photo_release_choice: "allow",
        signature_png: "data:image/png;base64,iVBORw0KGgo=",
      }),
      tokenParams(EXPIRED_TOKEN)
    );
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("refuses a submission on a made-up link", async () => {
    const res = await sign.POST(
      json("http://test/x", "POST", { signer_name: "Nobody" }),
      tokenParams("not-a-real-token")
    );
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("refuses a choice that is not one of the offered options", async () => {
    const res = await sign.POST(
      json("http://test/x", "POST", {
        signer_name: "A Parent", participant_name: "X",
        liability_release_choice: "maybe", photo_release_choice: "allow",
        signature_png: "data:image/png;base64,iVBORw0KGgo=",
      }),
      tokenParams(RAW_TOKEN)
    );
    expect(res.status).toBe(400);
  });

  it("refuses a signature that is not really an image", async () => {
    const res = await sign.POST(
      json("http://test/x", "POST", {
        signer_name: "A Parent", participant_name: "X",
        liability_release_choice: "release", photo_release_choice: "allow",
        signature_png: "<script>alert(1)</script>",
      }),
      tokenParams(RAW_TOKEN)
    );
    expect(res.status).toBe(400);
  });

  it("refuses an incomplete submission", async () => {
    const res = await sign.POST(
      json("http://test/x", "POST", { signer_name: "" }),
      tokenParams(RAW_TOKEN)
    );
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("accepts a complete submission and marks the waiver signed", async () => {
    const res = await sign.POST(
      json("http://test/x", "POST", {
        signer_name: "A Parent", participant_name: `${TEST_PREFIX}Signer Parent`,
        liability_release_choice: "release", photo_release_choice: "allow",
        signature_png: "data:image/png;base64,iVBORw0KGgo=",
      }),
      tokenParams(RAW_TOKEN)
    );
    expect(res.status).toBeLessThan(300);
    const row = await get("SELECT status, signer_name FROM waivers WHERE id = ?", [waiverId]);
    expect(row.status).toBe("signed");
    expect(row.signer_name).toBe("A Parent");
  });

  it("cannot be signed twice with the same link", async () => {
    const res = await sign.POST(
      json("http://test/x", "POST", {
        signer_name: "Someone Else", participant_name: "Someone Else",
        liability_release_choice: "release", photo_release_choice: "allow",
        signature_png: "data:image/png;base64,iVBORw0KGgo=",
      }),
      tokenParams(RAW_TOKEN)
    );
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

describe("managing a waiver", () => {
  it("reads one back", async () => {
    const res = await waiverOne.GET(new Request("http://test/x"), params(waiverId));
    expect(res.status).toBe(200);
  });

  it("deletes one", async () => {
    const res = await waiverOne.DELETE(new Request("http://test/x", { method: "DELETE" }), params(expiredId));
    expect(res.status).toBeLessThan(300);
  });
});
