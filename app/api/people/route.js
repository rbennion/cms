import { NextResponse } from "next/server";
import { all, run, get } from "@/lib/db";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const roleIds = searchParams.get("role_ids"); // comma-separated list
    const stageId = searchParams.get("stage_id");
    const isDonor = searchParams.get("is_donor");
    const isFcCertified = searchParams.get("is_fc_certified");
    const schoolId = searchParams.get("school_id");
    const sortBy = searchParams.get("sort_by") || "last_name";
    const sortOrder = searchParams.get("sort_order") || "asc";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    // Build base query with subqueries for roles and stage
    let baseQuery = `
      SELECT p.id, p.first_name, p.middle_name, p.last_name, p.email, p.phone, 
             p.title, p.address, p.city, p.state, p.zip, p.picture_path,
             p.is_donor, p.is_fc_certified, p.stage_id, p.children,
             p.created_at, p.updated_at,
             es.name as stage_name,
             (SELECT STRING_AGG(r.name, ',') 
              FROM person_roles pr 
              JOIN roles r ON pr.role_id = r.id 
              WHERE pr.person_id = p.id) as roles
      FROM people p
      LEFT JOIN engagement_stages es ON p.stage_id = es.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      baseQuery += ` AND (p.first_name ILIKE ? OR p.last_name ILIKE ? OR p.email ILIKE ? OR p.phone ILIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (roleIds) {
      const roleIdArray = roleIds
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
      if (roleIdArray.length > 0) {
        // Match people who have ANY of the selected roles
        const placeholders = roleIdArray.map(() => "?").join(",");
        baseQuery += ` AND EXISTS (SELECT 1 FROM person_roles pr WHERE pr.person_id = p.id AND pr.role_id IN (${placeholders}))`;
        params.push(...roleIdArray);
      }
    }

    if (stageId) {
      baseQuery += ` AND p.stage_id = ?`;
      params.push(stageId);
    }

    if (isDonor === "true" || isDonor === "false") {
      baseQuery += ` AND p.is_donor = ?`;
      params.push(isDonor === "true" ? 1 : 0);
    }

    if (isFcCertified === "true" || isFcCertified === "false") {
      baseQuery += ` AND p.is_fc_certified = ?`;
      params.push(isFcCertified === "true" ? 1 : 0);
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
      "SELECT COUNT(DISTINCT p.id) as count FROM people p"
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
      { status: 500 }
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
      certification_status,
      stage_id,
      children,
      company_ids,
      role_ids,
      school_ids,
    } = body;

    if (!first_name || !last_name) {
      return NextResponse.json(
        { error: "First name and last name are required" },
        { status: 400 }
      );
    }

    const result = await run(
      `INSERT INTO people (first_name, middle_name, last_name, email, phone, title, address, city, state, zip, is_donor, is_fc_certified, stage_id, children)
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
        stage_id || null,
        children || null,
      ]
    );

    const personId = result.lastInsertRowid;

    // Add company associations
    if (company_ids && company_ids.length > 0) {
      for (let i = 0; i < company_ids.length; i++) {
        await run(
          "INSERT INTO person_companies (person_id, company_id, is_primary) VALUES (?, ?, ?)",
          [personId, company_ids[i], i === 0 ? 1 : 0]
        );
      }
    }

    // Add role associations
    if (role_ids && role_ids.length > 0) {
      for (const roleId of role_ids) {
        await run(
          "INSERT INTO person_roles (person_id, role_id) VALUES (?, ?)",
          [personId, roleId]
        );
      }
    }

    // Add school associations
    if (school_ids && school_ids.length > 0) {
      for (const schoolId of school_ids) {
        await run(
          "INSERT INTO person_schools (person_id, school_id) VALUES (?, ?)",
          [personId, schoolId]
        );
      }
    }

    // Create certification record if FC certified
    if (is_fc_certified) {
      await run(
        "INSERT INTO certifications (person_id, background_check_status) VALUES (?, ?)",
        [personId, certification_status || "pending"]
      );
    }

    const person = await get("SELECT * FROM people WHERE id = ?", [personId]);

    return NextResponse.json(person, { status: 201 });
  } catch (error) {
    console.error("Error creating person:", error);
    return NextResponse.json(
      { error: "Failed to create person" },
      { status: 500 }
    );
  }
}
