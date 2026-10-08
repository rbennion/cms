import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { staffStatus, markReviewed, getRegistrationForGroup } from "@/lib/event-registration-server";

export const dynamic = "force-dynamic";

// Clears a "needs a look" note once staff have sorted the record out.
export async function PATCH(request, { params }) {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const { id, entryId } = await params;
    const registration = await getRegistrationForGroup(id);
    if (!registration) {
      return NextResponse.json({ error: "This group has no event registration yet" }, { status: 404 });
    }

    await markReviewed(registration.id, entryId);
    return NextResponse.json(await staffStatus(id));
  } catch (error) {
    console.error("Error marking registration entry reviewed:", error);
    return NextResponse.json({ error: "Failed to update the note" }, { status: 500 });
  }
}
