import { NextResponse } from "next/server";
import { run } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  try {
    const { session, error } = await requireAuth()
    if (error) return error

    const { id } = await params;
    const body = await request.json();
    const { person_id } = body;

    if (!person_id) {
      return NextResponse.json(
        { error: "Person ID is required" },
        { status: 400 }
      );
    }

    await run(
      "INSERT INTO person_schools (person_id, school_id) VALUES (?, ?)",
      [person_id, id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error adding person to school:", error);
    return NextResponse.json(
      { error: "Failed to add person" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { session, error } = await requireAuth()
    if (error) return error

    const { id } = await params;
    const body = await request.json();
    const { person_id } = body;

    if (!person_id) {
      return NextResponse.json(
        { error: "Person ID is required" },
        { status: 400 }
      );
    }

    await run(
      "DELETE FROM person_schools WHERE person_id = ? AND school_id = ?",
      [person_id, id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing person from school:", error);
    return NextResponse.json(
      { error: "Failed to remove person" },
      { status: 500 }
    );
  }
}
