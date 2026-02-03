import { NextResponse } from "next/server";
import { get, run, all } from "@/lib/db";

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const person = await get(
      `
      SELECT p.*, es.name as stage_name
      FROM people p
      LEFT JOIN engagement_stages es ON p.stage_id = es.id
      WHERE p.id = ?
    `,
      [id]
    );

    if (!person) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }

    // Get associated companies
    const companies = await all(
      `
      SELECT c.*, pc.is_primary
      FROM companies c
      JOIN person_companies pc ON c.id = pc.company_id
      WHERE pc.person_id = ?
      ORDER BY pc.is_primary DESC, c.name
    `,
      [id]
    );

    // Get associated roles
    const roles = await all(
      `
      SELECT r.*
      FROM roles r
      JOIN person_roles pr ON r.id = pr.role_id
      WHERE pr.person_id = ?
      ORDER BY r.sort_order, r.name
    `,
      [id]
    );

    // Get associated schools
    const schools = await all(
      `
      SELECT s.*
      FROM schools s
      JOIN person_schools ps ON s.id = ps.school_id
      WHERE ps.person_id = ?
    `,
      [id]
    );

    // Get engagement stage
    let stage = null;
    if (person.stage_id) {
      stage = await get("SELECT * FROM engagement_stages WHERE id = ?", [
        person.stage_id,
      ]);
    }

    // Get certification if FC certified
    let certification = null;
    if (person.is_fc_certified) {
      certification = await get(
        "SELECT * FROM certifications WHERE person_id = ?",
        [id]
      );
    }

    // Get recent donations
    const donations = await all(
      `
      SELECT * FROM donations
      WHERE person_id = ?
      ORDER BY date DESC
      LIMIT 10
    `,
      [id]
    );

    // Get notes
    const notes = await all(
      `
      SELECT * FROM notes
      WHERE entity_type = 'person' AND entity_id = ?
      ORDER BY date DESC
    `,
      [id]
    );

    return NextResponse.json({
      ...person,
      companies,
      roles,
      stage,
      schools,
      certification,
      donations,
      notes,
    });
  } catch (error) {
    console.error("Error fetching person:", error);
    return NextResponse.json(
      { error: "Failed to fetch person" },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
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
      stage_id,
      children,
      company_ids,
      role_ids,
      school_ids,
    } = body;

    const existing = await get("SELECT * FROM people WHERE id = ?", [id]);
    if (!existing) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }

    // Only validate name fields if they are being updated
    const hasPersonFields =
      first_name !== undefined ||
      last_name !== undefined ||
      middle_name !== undefined ||
      email !== undefined ||
      phone !== undefined ||
      title !== undefined ||
      address !== undefined ||
      city !== undefined ||
      state !== undefined ||
      zip !== undefined ||
      is_donor !== undefined ||
      is_fc_certified !== undefined ||
      stage_id !== undefined ||
      children !== undefined;

    if (hasPersonFields) {
      // Use existing values as defaults for partial updates
      const updatedFirstName =
        first_name !== undefined ? first_name : existing.first_name;
      const updatedLastName =
        last_name !== undefined ? last_name : existing.last_name;

      if (!updatedFirstName || !updatedLastName) {
        return NextResponse.json(
          { error: "First name and last name are required" },
          { status: 400 }
        );
      }

      await run(
        `UPDATE people SET
          first_name = ?, middle_name = ?, last_name = ?, email = ?, phone = ?,
          title = ?, address = ?, city = ?, state = ?, zip = ?,
          is_donor = ?, is_fc_certified = ?, stage_id = ?, children = ?,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          updatedFirstName,
          middle_name !== undefined
            ? middle_name || null
            : existing.middle_name,
          updatedLastName,
          email !== undefined ? email || null : existing.email,
          phone !== undefined ? phone || null : existing.phone,
          title !== undefined ? title || null : existing.title,
          address !== undefined ? address || null : existing.address,
          city !== undefined ? city || null : existing.city,
          state !== undefined ? state || null : existing.state,
          zip !== undefined ? zip || null : existing.zip,
          is_donor !== undefined ? (is_donor ? 1 : 0) : existing.is_donor,
          is_fc_certified !== undefined
            ? is_fc_certified
              ? 1
              : 0
            : existing.is_fc_certified,
          stage_id !== undefined ? stage_id || null : existing.stage_id,
          children !== undefined ? children || null : existing.children,
          id,
        ]
      );
    }

    // Update company associations
    if (company_ids !== undefined) {
      await run("DELETE FROM person_companies WHERE person_id = ?", [id]);
      if (company_ids.length > 0) {
        for (let i = 0; i < company_ids.length; i++) {
          await run(
            "INSERT INTO person_companies (person_id, company_id, is_primary) VALUES (?, ?, ?)",
            [id, company_ids[i], i === 0 ? 1 : 0]
          );
        }
      }
    }

    // Update role associations
    if (role_ids !== undefined) {
      await run("DELETE FROM person_roles WHERE person_id = ?", [id]);
      if (role_ids.length > 0) {
        for (const roleId of role_ids) {
          await run(
            "INSERT INTO person_roles (person_id, role_id) VALUES (?, ?)",
            [id, roleId]
          );
        }
      }
    }

    // Update school associations
    if (school_ids !== undefined) {
      await run("DELETE FROM person_schools WHERE person_id = ?", [id]);
      if (school_ids.length > 0) {
        for (const schoolId of school_ids) {
          await run(
            "INSERT INTO person_schools (person_id, school_id) VALUES (?, ?)",
            [id, schoolId]
          );
        }
      }
    }

    // Handle certification status change
    const newIsFcCertified =
      is_fc_certified !== undefined
        ? is_fc_certified
        : existing.is_fc_certified;
    if (newIsFcCertified && !existing.is_fc_certified) {
      // Newly certified - create certification record
      const existingCert = await get(
        "SELECT * FROM certifications WHERE person_id = ?",
        [id]
      );
      if (!existingCert) {
        await run(
          "INSERT INTO certifications (person_id, background_check_status) VALUES (?, ?)",
          [id, "pending"]
        );
      }
    }

    const person = await get("SELECT * FROM people WHERE id = ?", [id]);

    return NextResponse.json(person);
  } catch (error) {
    console.error("Error updating person:", error);
    return NextResponse.json(
      { error: "Failed to update person" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    const existing = await get("SELECT * FROM people WHERE id = ?", [id]);
    if (!existing) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }

    await run("DELETE FROM people WHERE id = ?", [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting person:", error);
    return NextResponse.json(
      { error: "Failed to delete person" },
      { status: 500 }
    );
  }
}
