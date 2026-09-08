import { NextResponse } from "next/server";
import { get, run } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { isRelationship, linkFamily, unlinkFamily } from "@/lib/family";

export const dynamic = "force-dynamic";

// POST { related_person_id, relationship } — link a family member.
// `relationship` is what the related person is to this person; omit it for
// a plain "related" link.
export async function POST(request, { params }) {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const body = await request.json();
    const { related_person_id, relationship } = body;

    if (!related_person_id) {
      return NextResponse.json({ error: "related_person_id is required" }, { status: 400 });
    }
    if (parseInt(related_person_id, 10) === parseInt(id, 10)) {
      return NextResponse.json({ error: "A person cannot be their own family member" }, { status: 400 });
    }
    if (relationship && !isRelationship(relationship)) {
      return NextResponse.json({ error: "Invalid relationship" }, { status: 400 });
    }

    const person = await get("SELECT id FROM people WHERE id = ?", [id]);
    if (!person) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }
    const related = await get("SELECT id FROM people WHERE id = ?", [related_person_id]);
    if (!related) {
      return NextResponse.json({ error: "Family member not found" }, { status: 404 });
    }

    await linkFamily(run, get, id, related_person_id, relationship);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Error linking family member:", error);
    return NextResponse.json({ error: "Failed to link family member" }, { status: 500 });
  }
}

// DELETE ?related_person_id= — remove the link in whichever direction it was stored.
export async function DELETE(request, { params }) {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const url = new URL(request.url);
    const relatedId = url.searchParams.get("related_person_id");
    if (!relatedId) {
      return NextResponse.json({ error: "related_person_id is required" }, { status: 400 });
    }

    await unlinkFamily(run, id, relatedId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error unlinking family member:", error);
    return NextResponse.json({ error: "Failed to unlink family member" }, { status: 500 });
  }
}
