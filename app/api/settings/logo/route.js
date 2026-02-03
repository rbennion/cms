import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET - Fetch current logo URL and app name (public endpoint for login page)
export async function GET() {
  try {
    // Ensure the app_settings table exists
    await sql`
      CREATE TABLE IF NOT EXISTS app_settings (
        id SERIAL PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const result = await sql`
      SELECT key, value FROM app_settings WHERE key IN ('logo_url', 'app_name')
    `;

    const settings = {};
    result.rows.forEach((row) => {
      settings[row.key] = row.value;
    });

    return NextResponse.json({
      logo_url: settings.logo_url || null,
      app_name: settings.app_name || null,
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json({ logo_url: null, app_name: null });
  }
}

// POST - Upload new logo (admin only)
export async function POST(request) {
  try {
    const session = await auth();

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const validTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
    ];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "Invalid file type. Please upload an image (JPEG, PNG, GIF, WebP, or SVG).",
        },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Convert to base64 data URL
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    // Ensure table exists and save logo as base64 data URL
    await sql`
      CREATE TABLE IF NOT EXISTS app_settings (
        id SERIAL PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES ('logo_url', ${dataUrl}, CURRENT_TIMESTAMP)
      ON CONFLICT (key)
      DO UPDATE SET value = ${dataUrl}, updated_at = CURRENT_TIMESTAMP
    `;

    return NextResponse.json({ success: true, logo_url: dataUrl });
  } catch (error) {
    console.error("Error uploading logo:", error);
    return NextResponse.json(
      { error: "Failed to upload logo" },
      { status: 500 }
    );
  }
}

// PUT - Update app name (admin only)
export async function PUT(request) {
  try {
    const session = await auth();

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { app_name } = await request.json();

    await sql`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES ('app_name', ${app_name || 'Fight Club CRM'}, CURRENT_TIMESTAMP)
      ON CONFLICT (key)
      DO UPDATE SET value = ${app_name || 'Fight Club CRM'}, updated_at = CURRENT_TIMESTAMP
    `;

    return NextResponse.json({ success: true, app_name: app_name || 'Fight Club CRM' });
  } catch (error) {
    console.error("Error updating app name:", error);
    return NextResponse.json(
      { error: "Failed to update app name" },
      { status: 500 }
    );
  }
}

// DELETE - Remove logo (admin only)
export async function DELETE() {
  try {
    const session = await auth();

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await sql`
      DELETE FROM app_settings WHERE key = 'logo_url'
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing logo:", error);
    return NextResponse.json(
      { error: "Failed to remove logo" },
      { status: 500 }
    );
  }
}
