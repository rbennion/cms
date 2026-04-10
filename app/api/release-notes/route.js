import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { requireAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const filePath = join(process.cwd(), "CHANGELOG.md");
    const content = readFileSync(filePath, "utf-8");
    return NextResponse.json({ content });
  } catch (error) {
    return NextResponse.json({ content: "Release notes not available." }, { status: 500 });
  }
}
