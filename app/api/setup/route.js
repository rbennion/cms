import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";

export const dynamic = 'force-dynamic'

export async function GET() {
  const { session, error } = await requireAdmin()
  if (error) return error

  return NextResponse.json({
    message: "Database setup is now managed via migrations. Run: npm run migrate",
    commands: {
      migrate: "npm run migrate",
      status: "npm run migrate:status",
      dryRun: "npm run migrate:dry-run",
      baseline: "npm run migrate -- --baseline",
      backup: "npm run backup",
      reset: "npm run reset-db -- --confirm",
    },
  });
}
