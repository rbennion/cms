import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Is this instance actually able to do its job?
//
// Deliberately unauthenticated so a monitor can reach it, and deliberately
// terse: it reports whether each dependency answered, never what it contains,
// what version is running, or where anything lives.
//
// Answers 200 when everything works and 503 when it does not, so a monitor only
// has to look at the status code. Add ?format=prometheus for a scrapeable form.

async function checkDatabase() {
  const started = Date.now();
  try {
    const { get } = await import("@/lib/db");
    // Cheap, and proves a real round trip rather than just a live socket.
    await get("SELECT 1 AS ok");
    return { ok: true, ms: Date.now() - started };
  } catch {
    return { ok: false, ms: Date.now() - started };
  }
}

async function checkStorage() {
  const started = Date.now();
  try {
    const { head, usingS3 } = await import("@/lib/storage");
    if (!usingS3()) return { ok: true, ms: 0, skipped: true };
    // Asking about a file that will never exist still proves the store is
    // reachable and the credentials work — a missing file answers, a broken
    // service does not.
    try {
      await head("healthcheck/never-present");
    } catch (err) {
      const message = String(err?.name || err?.Code || err?.message || "");
      const reachable = /NotFound|NoSuchKey|404/i.test(message);
      if (!reachable) throw err;
    }
    return { ok: true, ms: Date.now() - started };
  } catch {
    return { ok: false, ms: Date.now() - started };
  }
}

export async function GET(request) {
  const [database, storage] = await Promise.all([checkDatabase(), checkStorage()]);
  const healthy = database.ok && storage.ok;
  const status = healthy ? 200 : 503;

  const { searchParams } = new URL(request.url);
  if (searchParams.get("format") === "prometheus") {
    const body = [
      "# HELP fightclub_up Whether the CRM can serve requests (1 healthy, 0 not).",
      "# TYPE fightclub_up gauge",
      `fightclub_up ${healthy ? 1 : 0}`,
      "# HELP fightclub_dependency_up Whether each dependency answered.",
      "# TYPE fightclub_dependency_up gauge",
      `fightclub_dependency_up{dependency="database"} ${database.ok ? 1 : 0}`,
      `fightclub_dependency_up{dependency="storage"} ${storage.ok ? 1 : 0}`,
      "# HELP fightclub_dependency_response_ms How long each dependency took to answer.",
      "# TYPE fightclub_dependency_response_ms gauge",
      `fightclub_dependency_response_ms{dependency="database"} ${database.ms}`,
      `fightclub_dependency_response_ms{dependency="storage"} ${storage.ms}`,
      "",
    ].join("\n");
    return new Response(body, {
      status,
      headers: { "Content-Type": "text/plain; version=0.0.4", "Cache-Control": "no-store" },
    });
  }

  return NextResponse.json(
    {
      status: healthy ? "ok" : "unhealthy",
      checks: {
        database: database.ok ? "ok" : "failing",
        storage: storage.skipped ? "not-applicable" : storage.ok ? "ok" : "failing",
      },
    },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}
