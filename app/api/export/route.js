import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");
    const format = searchParams.get("format") || "csv";
    const filters = searchParams.get("filters")
      ? JSON.parse(searchParams.get("filters"))
      : {};

    if (!entityType) {
      return NextResponse.json(
        { error: "Entity type is required" },
        { status: 400 }
      );
    }

    let data = [];
    let columns = [];

    if (entityType === "people") {
      let query = `
        SELECT p.id, p.first_name, p.last_name, p.email, p.phone,
               p.title, p.address, p.city, p.state, p.zip,
               p.is_donor, p.is_fc_certified, p.is_board_member, p.children
        FROM people p
        WHERE 1=1
      `;
      const params = [];

      if (filters.search) {
        query += ` AND (p.first_name ILIKE $${params.length + 1} OR p.last_name ILIKE $${params.length + 2} OR p.email ILIKE $${params.length + 3})`;
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      if (filters.is_donor !== undefined && filters.is_donor !== "") {
        query += ` AND p.is_donor = $${params.length + 1}`;
        params.push(filters.is_donor === "true");
      }

      if (filters.is_fc_certified !== undefined && filters.is_fc_certified !== "") {
        query += ` AND p.is_fc_certified = $${params.length + 1}`;
        params.push(filters.is_fc_certified === "true");
      }

      query += " ORDER BY p.last_name, p.first_name";

      const result = await sql.query(query, params);
      data = result.rows;
      columns = [
        "id",
        "first_name",
        "last_name",
        "email",
        "phone",
        "title",
        "address",
        "city",
        "state",
        "zip",
        "is_donor",
        "is_fc_certified",
        "is_board_member",
        "children",
      ];
    } else if (entityType === "companies") {
      let query = `
        SELECT id, name, address, city, state, zip, website, is_donor
        FROM companies
        WHERE 1=1
      `;
      const params = [];

      if (filters.search) {
        query += ` AND name ILIKE $${params.length + 1}`;
        params.push(`%${filters.search}%`);
      }

      query += " ORDER BY name";

      const result = await sql.query(query, params);
      data = result.rows;
      columns = [
        "id",
        "name",
        "address",
        "city",
        "state",
        "zip",
        "website",
        "is_donor",
      ];
    } else if (entityType === "schools") {
      const result = await sql`
        SELECT id, name, address, city, state, zip
        FROM schools
        ORDER BY name
      `;
      data = result.rows;
      columns = ["id", "name", "address", "city", "state", "zip"];
    } else {
      return NextResponse.json(
        { error: "Invalid entity type" },
        { status: 400 }
      );
    }

    if (format === "email") {
      // Return semicolon-separated email list
      const emails = data
        .filter((row) => row.email)
        .map((row) => row.email)
        .join("; ");

      return new NextResponse(emails, {
        headers: {
          "Content-Type": "text/plain",
          "Content-Disposition": `attachment; filename="${entityType}-emails.txt"`,
        },
      });
    }

    // Generate CSV
    const escapeCSV = (value) => {
      if (value === null || value === undefined) return "";
      const str = String(value);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvHeader = columns.join(",");
    const csvRows = data.map((row) =>
      columns.map((col) => escapeCSV(row[col])).join(",")
    );
    const csv = [csvHeader, ...csvRows].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${entityType}-export.csv"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to export data", details: error.message },
      { status: 500 }
    );
  }
}
