import { NextResponse } from "next/server";
import { windowState, validateSubmission } from "@/lib/event-registration";
import {
  findRegistrationByCode,
  publicStatus,
  windowIsFull,
  saveSubmission,
} from "@/lib/event-registration-server";

export const dynamic = "force-dynamic";

// Public: reached by scanning a group's QR code, no sign-in. It answers only
// with the group's name and whether registration is open, never with names or
// counts, and never says whether an email is already in the CRM.

const unknown = () =>
  NextResponse.json({ error: "This registration link isn't valid" }, { status: 404 });

export async function GET(request, { params }) {
  try {
    const { code } = await params;
    const registration = await findRegistrationByCode(code);
    if (!registration) return unknown();
    return NextResponse.json(publicStatus(registration));
  } catch (error) {
    console.error("Error reading public event registration:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const { code } = await params;
    const registration = await findRegistrationByCode(code);
    if (!registration) return unknown();

    const body = await request.json().catch(() => ({}));

    // A field people never see: only bots fill it in. They get a success and
    // nothing is saved.
    if (body?.website) return NextResponse.json({ ok: true }, { status: 201 });

    const state = windowState(registration);
    if (state !== "open") {
      return NextResponse.json(
        { error: state === "scheduled" ? "Registration hasn't opened yet" : "Registration is closed", ...publicStatus(registration) },
        { status: 403 }
      );
    }

    const checked = validateSubmission(body);
    if (checked.error) {
      return NextResponse.json({ error: checked.error }, { status: 400 });
    }

    if (await windowIsFull(registration)) {
      return NextResponse.json(
        { error: "Registration is full. Please see Fight Club leadership." },
        { status: 429 }
      );
    }

    await saveSubmission(registration, checked);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Error saving public event registration:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
