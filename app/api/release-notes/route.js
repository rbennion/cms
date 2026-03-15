import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const filePath = join(process.cwd(), "CHANGELOG.md");
    const content = readFileSync(filePath, "utf-8");
    return NextResponse.json({ content });
  } catch (error) {
    return NextResponse.json({ content: "Release notes not available." }, { status: 500 });
  }
}
