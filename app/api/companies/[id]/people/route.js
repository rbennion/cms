import { NextResponse } from "next/server";
import { run } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  try {
    const body = await request.json();
    const { person_id } = body;

    if (!person_id) {
      return NextResponse.json(
        { error: "Person ID is required" },
        { status: 400 }
      );
    }

    await run(
      "INSERT INTO person_companies (person_id, company_id) VALUES (?, ?)",
      [person_id, params.id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error adding person to company:", error);
    return NextResponse.json(
      { error: "Failed to add person" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const body = await request.json();
    const { person_id } = body;

    if (!person_id) {
      return NextResponse.json(
        { error: "Person ID is required" },
        { status: 400 }
      );
    }

    await run(
      "DELETE FROM person_companies WHERE person_id = ? AND company_id = ?",
      [person_id, params.id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing person from company:", error);
    return NextResponse.json(
      { error: "Failed to remove person" },
      { status: 500 }
    );
  }
}
