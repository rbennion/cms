import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { staffStatus, resetCode, getRegistrationForGroup } from "@/lib/event-registration-server";

export const dynamic = "force-dynamic";

// Gives the group a new QR code. Old printouts, downloads and screen links
// stop working.
export async function POST(request, { params }) {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const registration = await getRegistrationForGroup(id);
    if (!registration) {
      return NextResponse.json({ error: "This group has no event registration yet" }, { status: 404 });
    }

    await resetCode(registration);
    return NextResponse.json(await staffStatus(id));
  } catch (error) {
    console.error("Error resetting event registration code:", error);
    return NextResponse.json({ error: "Failed to reset the QR code" }, { status: 500 });
  }
}
