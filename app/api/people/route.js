import { NextResponse } from "next/server";
import { all, run, get } from "@/lib/db";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type");
    const isDonor = searchParams.get("is_donor");
    const isFcCertified = searchParams.get("is_fc_certified");
    const isBoardMember = searchParams.get("is_board_member");
    const schoolId = searchParams.get("school_id");
    const sortBy = searchParams.get("sort_by") || "last_name";
    const sortOrder = searchParams.get("sort_order") || "asc";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    // Build base query with subquery for types
    let baseQuery = `
      SELECT p.id, p.first_name, p.middle_name, p.last_name, p.email, p.phone, 
             p.title, p.address, p.city, p.state, p.zip, p.picture_path,
             p.is_donor, p.is_fc_certified, p.is_board_member, p.children,
             p.created_at, p.updated_at,
             (SELECT STRING_AGG(pt.name, ',') 
              FROM person_type_assignments pta 
              JOIN person_types pt ON pta.type_id = pt.id 
              WHERE pta.person_id = p.id) as types
      FROM people p
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      baseQuery += ` AND (p.first_name ILIKE ? OR p.last_name ILIKE ? OR p.email ILIKE ? OR p.phone ILIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (type) {
      baseQuery += ` AND EXISTS (SELECT 1 FROM person_type_assignments pta WHERE pta.person_id = p.id AND pta.type_id = ?)`;
      params.push(type);
    }

    if (isDonor !== null && isDonor !== undefined) {
      baseQuery += ` AND p.is_donor = ?`;
      params.push(isDonor === "true" ? 1 : 0);
    }

    if (isFcCertified !== null && isFcCertified !== undefined) {
      baseQuery += ` AND p.is_fc_certified = ?`;
      params.push(isFcCertified === "true" ? 1 : 0);
    }

    if (isBoardMember !== null && isBoardMember !== undefined) {
      baseQuery += ` AND p.is_board_member = ?`;
      params.push(isBoardMember === "true" ? 1 : 0);
    }

    if (schoolId) {
      baseQuery += ` AND EXISTS (SELECT 1 FROM person_schools ps WHERE ps.person_id = p.id AND ps.school_id = ?)`;
      params.push(schoolId);
    }

    const validSortColumns = [
      "first_name",
      "last_name",
      "email",
      "created_at",
      "updated_at",
    ];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : "last_name";
    const order = sortOrder.toLowerCase() === "desc" ? "DESC" : "ASC";

    // Get total count
    const countQuery = baseQuery.replace(
      /SELECT p\.id.*?FROM people p/s,
      "SELECT COUNT(*) as count FROM people p",
    );
    const countResult = await get(countQuery, params);
    const total = countResult?.count || 0;

    let query =
      baseQuery + ` ORDER BY p.${sortColumn} ${order} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const people = await all(query, params);

    return NextResponse.json({
      data: people,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching people:", error);
    return NextResponse.json(
      { error: "Failed to fetch people" },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      first_name,
      middle_name,
      last_name,
      email,
      phone,
      title,
      address,
      city,
      state,
      zip,
      is_donor,
      is_fc_certified,
      is_board_member,
      children,
      company_ids,
      type_ids,
      school_ids,
    } = body;

    if (!first_name || !last_name) {
      return NextResponse.json(
        { error: "First name and last name are required" },
        { status: 400 },
      );
    }

    const result = await run(
      `INSERT INTO people (first_name, middle_name, last_name, email, phone, title, address, city, state, zip, is_donor, is_fc_certified, is_board_member, children)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        first_name,
        middle_name || null,
        last_name,
        email || null,
        phone || null,
        title || null,
        address || null,
        city || null,
        state || null,
        zip || null,
        is_donor ? 1 : 0,
        is_fc_certified ? 1 : 0,
        is_board_member ? 1 : 0,
        children || null,
      ],
    );

    const personId = result.lastInsertRowid;

    // Add company associations
    if (company_ids && company_ids.length > 0) {
      for (let i = 0; i < company_ids.length; i++) {
        await run(
          "INSERT INTO person_companies (person_id, company_id, is_primary) VALUES (?, ?, ?)",
          [personId, company_ids[i], i === 0 ? 1 : 0],
        );
      }
    }

    // Add type associations
    if (type_ids && type_ids.length > 0) {
      for (const typeId of type_ids) {
        await run(
          "INSERT INTO person_type_assignments (person_id, type_id) VALUES (?, ?)",
          [personId, typeId],
        );
      }
    }

    // Add school associations
    if (school_ids && school_ids.length > 0) {
      for (const schoolId of school_ids) {
        await run(
          "INSERT INTO person_schools (person_id, school_id) VALUES (?, ?)",
          [personId, schoolId],
        );
      }
    }

    // Create certification record if FC certified
    if (is_fc_certified) {
      await run(
        "INSERT INTO certifications (person_id, background_check_status) VALUES (?, ?)",
        [personId, "pending"],
      );
    }

    const person = await get("SELECT * FROM people WHERE id = ?", [personId]);

    return NextResponse.json(person, { status: 201 });
  } catch (error) {
    console.error("Error creating person:", error);
    return NextResponse.json(
      { error: "Failed to create person" },
      { status: 500 },
    );
  }
}
