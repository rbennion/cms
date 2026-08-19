import { describe, it, expect, vi } from "vitest";
import { json, params } from "./helpers.js";

// No session at all — a stranger with the URL. Note that api-auth is NOT stubbed
// here: the real gate runs, against an empty session. Every other test file
// stubs sign-in so it can get on with testing the endpoint, which means this is
// the only file proving the front door is actually locked.
vi.mock("@/lib/auth", () => ({
  auth: async () => null,
  handlers: {}, signIn: async () => {}, signOut: async () => {},
}));

const anon = new Request("http://test/x");
const anonJson = (method, body) => json("http://test/x", method, body ?? {});
const p = params(1);

// Every endpoint that should refuse an unauthenticated caller, with the method
// to try. Reading and writing are both covered.
const routes = [
  ["/api/people", "@/app/api/people/route.js", ["GET", "POST"]],
  ["/api/people/[id]", "@/app/api/people/[id]/route.js", ["GET", "PUT", "DELETE"]],
  ["/api/companies", "@/app/api/companies/route.js", ["GET", "POST"]],
  ["/api/companies/[id]", "@/app/api/companies/[id]/route.js", ["GET", "PUT", "DELETE"]],
  ["/api/schools", "@/app/api/schools/route.js", ["GET", "POST"]],
  ["/api/schools/[id]", "@/app/api/schools/[id]/route.js", ["GET", "PUT", "DELETE"]],
  ["/api/groups", "@/app/api/groups/route.js", ["GET", "POST"]],
  ["/api/groups/[id]", "@/app/api/groups/[id]/route.js", ["GET", "PUT", "DELETE"]],
  ["/api/donations", "@/app/api/donations/route.js", ["GET", "POST"]],
  ["/api/donations/[id]", "@/app/api/donations/[id]/route.js", ["GET", "PUT", "DELETE"]],
  ["/api/certifications", "@/app/api/certifications/route.js", ["GET", "POST"]],
  ["/api/certifications/[id]", "@/app/api/certifications/[id]/route.js", ["GET", "PUT"]],
  ["/api/certifications/[id]/documents", "@/app/api/certifications/[id]/documents/route.js", ["GET"]],
  ["/api/certifications/[id]/application", "@/app/api/certifications/[id]/application/route.js", ["GET", "POST"]],
  ["/api/certifications/[id]/qpr-certificate", "@/app/api/certifications/[id]/qpr-certificate/route.js", ["GET", "POST"]],
  ["/api/notes", "@/app/api/notes/route.js", ["GET", "POST"]],
  ["/api/notes/[id]", "@/app/api/notes/[id]/route.js", ["PUT", "DELETE"]],
  ["/api/waivers", "@/app/api/waivers/route.js", ["GET"]],
  ["/api/waivers/[id]", "@/app/api/waivers/[id]/route.js", ["GET", "DELETE"]],
  ["/api/waivers/[id]/pdf", "@/app/api/waivers/[id]/pdf/route.js", ["GET"]],
  ["/api/uploads/presign", "@/app/api/uploads/presign/route.js", ["POST"]],
  ["/api/uploads/token", "@/app/api/uploads/token/route.js", ["POST"]],
  ["/api/export", "@/app/api/export/route.js", ["GET"]],
  ["/api/import", "@/app/api/import/route.js", ["POST"]],
  ["/api/dashboard/stats", "@/app/api/dashboard/stats/route.js", ["GET"]],
  ["/api/person-types", "@/app/api/person-types/route.js", ["GET", "POST"]],
  ["/api/roles", "@/app/api/roles/route.js", ["GET", "POST"]],
  ["/api/engagement-stages", "@/app/api/engagement-stages/route.js", ["GET", "POST"]],
  ["/api/saved-views", "@/app/api/saved-views/route.js", ["GET", "POST"]],
  ["/api/users", "@/app/api/users/route.js", ["GET", "POST"]],
  ["/api/users/[id]", "@/app/api/users/[id]/route.js", ["GET", "PUT", "DELETE"]],
  ["/api/settings/logo", "@/app/api/settings/logo/route.js", ["POST", "DELETE"]],
  ["/api/debug", "@/app/api/debug/route.js", ["GET"]],
  ["/api/setup/purge", "@/app/api/setup/purge/route.js", ["POST"]],
  ["/api/setup/seed", "@/app/api/setup/seed/route.js", ["GET"]],
  ["/api/people/[id]/notes", "@/app/api/people/[id]/notes/route.js", ["GET"]],
  ["/api/people/[id]/groups", "@/app/api/people/[id]/groups/route.js", ["POST", "DELETE"]],
  ["/api/people/[id]/roles", "@/app/api/people/[id]/roles/route.js", ["GET", "POST", "DELETE"]],
  ["/api/companies/[id]/people", "@/app/api/companies/[id]/people/route.js", ["POST", "DELETE"]],
  ["/api/schools/[id]/people", "@/app/api/schools/[id]/people/route.js", ["POST", "DELETE"]],
  ["/api/groups/[id]/students", "@/app/api/groups/[id]/students/route.js", ["POST"]],
  ["/api/groups/[id]/parents", "@/app/api/groups/[id]/parents/route.js", ["POST"]],
];

describe("a stranger is turned away", () => {
  for (const [label, modulePath, methods] of routes) {
    for (const method of methods) {
      it(`${method} ${label}`, async () => {
        const mod = await import(modulePath);
        const handler = mod[method];
        if (!handler) return; // method not implemented — nothing to guard
        const req = method === "GET" || method === "DELETE" ? anon : anonJson(method);
        const res = await handler(req, p);
        expect(
          [401, 403].includes(res.status),
          `${method} ${label} answered ${res.status} to an unauthenticated caller`
        ).toBe(true);
      });
    }
  }
});

describe("nothing leaks in the refusal", () => {
  it("does not return records to an unauthenticated caller", async () => {
    const { GET } = await import("@/app/api/people/route.js");
    const res = await GET(anon);
    const body = await res.text();
    expect(body).not.toMatch(/first_name|@/);
  });
});
