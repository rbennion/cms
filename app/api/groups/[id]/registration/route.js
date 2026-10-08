import { NextResponse } from "next/server";
import { get } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { validateWindow } from "@/lib/event-registration";
import {
  staffStatus,
  setWindow,
  closeWindow,
  getRegistrationForGroup,
} from "@/lib/event-registration-server";

export const dynamic = "force-dynamic";

const notFound = () => NextResponse.json({ error: "Group not found" }, { status: 404 });

// Event registration for a group, as staff see it.
export async function GET(request, { params }) {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    if (!(await get("SELECT id FROM groups WHERE id = ?", [id]))) return notFound();

    return NextResponse.json(await staffStatus(id));
  } catch (error) {
    console.error("Error reading event registration:", error);
    return NextResponse.json({ error: "Failed to read event registration" }, { status: 500 });
  }
}

// Sets or changes the window: { starts_at, ends_at } as ISO timestamps.
export async function PUT(request, { params }) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    if (!(await get("SELECT id FROM groups WHERE id = ?", [id]))) return notFound();

    const checked = validateWindow(await request.json());
    if (checked.error) {
      return NextResponse.json({ error: checked.error }, { status: 400 });
    }

    const user = await get("SELECT id FROM users WHERE id = ?", [parseInt(session.user.id, 10) || 0]);
    await setWindow(id, checked.start, checked.end, user?.id ?? null);

    return NextResponse.json(await staffStatus(id));
  } catch (error) {
    console.error("Error setting event registration:", error);
    return NextResponse.json({ error: "Failed to set event registration" }, { status: 500 });
  }
}

// Close early.
export async function DELETE(request, { params }) {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    if (!(await get("SELECT id FROM groups WHERE id = ?", [id]))) return notFound();

    const registration = await getRegistrationForGroup(id);
    if (registration) await closeWindow(registration);

    return NextResponse.json(await staffStatus(id));
  } catch (error) {
    console.error("Error closing event registration:", error);
    return NextResponse.json({ error: "Failed to close event registration" }, { status: 500 });
  }
}
