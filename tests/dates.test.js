import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { parseDateValue, formatDate, todayDateValue } from "@/lib/utils";
import { formatDateOnly, bgCheckExpired, deriveCertStatus } from "@/lib/certifications";
import { bgExpiryDate } from "@/lib/certifications-server";

// The reported bug: picking July 7th recorded and displayed July 6th. It only
// showed up in production because there the server runs on UTC and the user
// does not — so these tests pin the browser to a US timezone, where the old
// behaviour was wrong.

const originalTZ = process.env.TZ;
beforeAll(() => { process.env.TZ = "America/Chicago"; });
afterAll(() => { process.env.TZ = originalTZ; });

describe("a calendar date keeps its day", () => {
  it("parses a plain date at local midnight, not UTC midnight", () => {
    const d = parseDateValue("2026-07-07");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6);   // July
    expect(d.getDate()).toBe(7);    // the 7th, not the 6th
  });

  it("displays the day that was stored", () => {
    expect(formatDate("2026-07-07")).toBe("Jul 7, 2026");
    expect(formatDate("2026-01-01")).toBe("Jan 1, 2026");
    expect(formatDate("2026-12-31")).toBe("Dec 31, 2026");
  });

  it("still handles a real timestamp normally", () => {
    // Not a calendar date — an actual moment, which should localise as usual.
    const out = formatDate("2026-07-07T18:30:00.000Z");
    expect(out).toBe("Jul 7, 2026");
  });

  it("survives the shape the database used to return", () => {
    // Should the driver ever hand back a full timestamp again, the day must
    // still not slide backwards for a user behind UTC.
    expect(formatDateOnly("2026-07-07T00:00:00.000Z")).toBe("Jul 7, 2026");
  });

  it("returns nothing for an absent date", () => {
    expect(formatDate(null)).toBe("");
    expect(formatDate(undefined)).toBe("");
    expect(formatDateOnly(null)).toBe("");
  });

  it("today is the user's today, not UTC's", () => {
    const today = todayDateValue();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    expect(today).toBe(expected);
  });
});

describe("background check expiry", () => {
  it("adds the policy period to the check date", () => {
    expect(bgExpiryDate("2026-05-01", 2)).toBe("2028-05-01");
  });

  it("is empty when no check date is recorded", () => {
    expect(bgExpiryDate(null, 2)).toBeNull();
    expect(bgExpiryDate("", 2)).toBeNull();
  });

  it("counts a passed check as expired once the date is behind us", () => {
    const cert = {
      background_check_status: "approved",
      background_check_expires_at: "2020-01-01",
    };
    expect(bgCheckExpired(cert)).toBe(true);
  });

  it("does not call a pending check expired", () => {
    const cert = {
      background_check_status: "pending",
      background_check_expires_at: "2020-01-01",
    };
    expect(bgCheckExpired(cert)).toBe(false);
  });
});

describe("overall certification status", () => {
  const base = {
    application_received: 0,
    background_check_status: "pending",
    qpr_gatekeeper_training: 0,
  };

  it("is not started when nothing has been touched", () => {
    expect(deriveCertStatus(base).key).toBe("not_started");
    expect(deriveCertStatus(null).key).toBe("not_started");
  });

  it("is in progress partway through, and says how far", () => {
    const status = deriveCertStatus({ ...base, application_received: 1 });
    expect(status.key).toBe("in_progress");
    expect(status.reason).toContain("1 of 3");
  });

  it("is certified once all three are done", () => {
    const status = deriveCertStatus({
      application_received: 1,
      background_check_status: "approved",
      qpr_gatekeeper_training: 1,
    });
    expect(status.key).toBe("certified");
  });

  it("is expired when the background check has lapsed, whatever else is done", () => {
    const status = deriveCertStatus({
      application_received: 1,
      background_check_status: "approved",
      background_check_expires_at: "2020-01-01",
      qpr_gatekeeper_training: 1,
    });
    expect(status.key).toBe("expired");
    expect(status.reason).toMatch(/background check expired/i);
  });

  it("is failed when the background check was refused", () => {
    expect(deriveCertStatus({ ...base, background_check_status: "denied" }).key).toBe("failed");
  });
});
