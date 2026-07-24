import { NextResponse } from "next/server";
import { all } from "@/lib/db";
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
      // Filters must mirror the People list API (app/api/people) exactly so the
      // export row count matches what the on-screen View shows.
      let query = `
        SELECT p.id, p.first_name, p.last_name, p.email, p.phone,
               p.title, p.address, p.city, p.state, p.zip,
               (SELECT STRING_AGG(r.name, '; ')
                FROM person_roles pr
                JOIN roles r ON pr.role_id = r.id
                WHERE pr.person_id = p.id) as roles
        FROM people p
        WHERE 1=1
      `;
      const params = [];

      if (filters.search) {
        query += ` AND (p.first_name ILIKE ? OR p.last_name ILIKE ? OR p.email ILIKE ? OR p.phone ILIKE ?)`;
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      const roleIdArray = Array.isArray(filters.role_ids)
        ? filters.role_ids.map((id) => String(id).trim()).filter(Boolean)
        : [];
      if (roleIdArray.length > 0) {
        const placeholders = roleIdArray.map(() => "?").join(",");
        query += ` AND EXISTS (SELECT 1 FROM person_roles pr WHERE pr.person_id = p.id AND pr.role_id IN (${placeholders}))`;
        params.push(...roleIdArray);
      }

      if (filters.stage_id) {
        query += ` AND p.stage_id = ?`;
        params.push(filters.stage_id);
      }

      if (filters.school_id) {
        query += ` AND EXISTS (SELECT 1 FROM person_schools ps WHERE ps.person_id = p.id AND ps.school_id = ?)`;
        params.push(filters.school_id);
      }

      query += " ORDER BY p.last_name, p.first_name";

      data = await all(query, params);

      // Fetch family members for all people
      const familyRows = await all(`
        SELECT fr.person_id, p.first_name, p.last_name
        FROM family_relationships fr
        JOIN people p ON fr.related_person_id = p.id
        ORDER BY p.first_name, p.last_name
      `);

      // Build a map of person_id -> "FirstName1 LastName1; FirstName2 LastName2"
      const familyMap = {};
      for (const row of familyRows) {
        if (!familyMap[row.person_id]) {
          familyMap[row.person_id] = [];
        }
        familyMap[row.person_id].push(`${row.first_name} ${row.last_name}`);
      }

      // Add family_members to each row
      for (const row of data) {
        row.family_members = familyMap[row.id]
          ? familyMap[row.id].join("; ")
          : "";
      }

      columns = [
        "id",
        "first_name",
        "last_name",
        "email",
        "phone",
        "title",
        "roles",
        "address",
        "city",
        "state",
        "zip",
        "family_members",
      ];
    } else if (entityType === "companies") {
      // Mirror the Companies list API (app/api/companies) filters.
      let query = `
        SELECT id, name, address, city, state, zip, website, is_donor
        FROM companies
        WHERE 1=1
      `;
      const params = [];

      if (filters.search) {
        query += ` AND name ILIKE ?`;
        params.push(`%${filters.search}%`);
      }

      if (filters.is_donor !== undefined && filters.is_donor !== "") {
        query += ` AND is_donor = ?`;
        params.push(filters.is_donor === "true" || filters.is_donor === true ? 1 : 0);
      }

      query += " ORDER BY name";

      data = await all(query, params);
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
      // Mirror the Schools list API (app/api/schools) filters.
      let query = `
        SELECT id, name, address, city, state, zip
        FROM schools
        WHERE 1=1
      `;
      const params = [];

      if (filters.search) {
        query += ` AND (name ILIKE ? OR city ILIKE ?)`;
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm);
      }

      query += " ORDER BY name";

      data = await all(query, params);
      columns = ["id", "name", "address", "city", "state", "zip"];
    } else if (entityType === "donations") {
      let query = `
        SELECT d.id, d.amount, d.date, d.note,
               p.first_name, p.last_name, c.name as company_name,
               CASE WHEN d.person_id IS NOT NULL THEN 'Individual' ELSE 'Company' END as donor_type
        FROM donations d
        LEFT JOIN people p ON d.person_id = p.id
        LEFT JOIN companies c ON d.company_id = c.id
        WHERE 1=1
      `;
      const params = [];

      if (filters.search) {
        query += ` AND (p.first_name ILIKE ? OR p.last_name ILIKE ? OR c.name ILIKE ? OR d.note ILIKE ?)`;
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      if (filters.donor_type === "person") {
        query += ` AND d.person_id IS NOT NULL`;
      } else if (filters.donor_type === "company") {
        query += ` AND d.company_id IS NOT NULL`;
      }

      if (filters.start_date) {
        query += ` AND d.date >= ?`;
        params.push(filters.start_date);
      }

      if (filters.end_date) {
        query += ` AND d.date <= ?`;
        params.push(filters.end_date);
      }

      query += " ORDER BY d.date DESC";

      data = await all(query, params);
      columns = [
        "id",
        "date",
        "amount",
        "donor_type",
        "first_name",
        "last_name",
        "company_name",
        "note",
      ];
    } else if (entityType === "groups") {
      // Mirror the Groups list API (app/api/groups) filters.
      let query = `
        SELECT g.id, g.name, s.name as school_name, g.gender, g.year, g.status,
               pl.first_name as leader_first_name, pl.last_name as leader_last_name,
               g.notes
        FROM groups g
        JOIN schools s ON g.school_id = s.id
        LEFT JOIN people pl ON g.primary_leader_id = pl.id
        WHERE 1=1
      `;
      const params = [];

      if (filters.school_id) {
        query += ` AND g.school_id = ?`;
        params.push(filters.school_id);
      }

      if (filters.gender) {
        query += ` AND g.gender = ?`;
        params.push(filters.gender);
      }

      if (filters.status) {
        query += ` AND g.status = ?`;
        params.push(filters.status);
      }

      if (filters.year) {
        query += ` AND g.year = ?`;
        params.push(filters.year);
      }

      if (filters.search) {
        query += ` AND (
          g.name ILIKE ? OR
          s.name ILIKE ? OR
          pl.first_name ILIKE ? OR
          pl.last_name ILIKE ? OR
          CONCAT(pl.first_name, ' ', pl.last_name) ILIKE ?
        )`;
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
      }

      query += " ORDER BY s.name, g.name";

      data = await all(query, params);

      // Format primary_leader_name
      for (const row of data) {
        row.primary_leader_name =
          row.leader_first_name && row.leader_last_name
            ? `${row.leader_first_name} ${row.leader_last_name}`
            : "";
        delete row.leader_first_name;
        delete row.leader_last_name;
      }

      columns = [
        "id",
        "name",
        "school_name",
        "gender",
        "year",
        "status",
        "primary_leader_name",
        "notes",
      ];
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
