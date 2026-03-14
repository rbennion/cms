import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

// Migration endpoint that:
// 1. Creates roles matching the CSV data
// 2. Migrates person_types data to roles
// 3. Migrates is_board_member to Board Member role
export async function GET() {
  try {
    const logs = [];
    const log = (msg) => {
      console.log(msg);
      logs.push(msg);
    };

    log("Starting role migration...");

    // Ensure roles table exists
    await sql`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        sort_order INTEGER DEFAULT 0
      )
    `;

    // Ensure person_roles table exists
    await sql`
      CREATE TABLE IF NOT EXISTS person_roles (
        id SERIAL PRIMARY KEY,
        person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
        role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        UNIQUE(person_id, role_id)
      )
    `;

    // Define roles matching the CSV columns
    const rolesToCreate = [
      { name: "Board Member", sort_order: 1 },
      { name: "Volunteer", sort_order: 2 },
      { name: "Parent", sort_order: 3 },
      { name: "FC Leader", sort_order: 4 },
      { name: "Potential Group Leader", sort_order: 5 },
      { name: "Vendor", sort_order: 6 },
      { name: "Community Partner", sort_order: 7 }, // maps to "Partner" in CSV
    ];

    // Create roles
    for (const role of rolesToCreate) {
      await sql`
        INSERT INTO roles (name, sort_order) 
        VALUES (${role.name}, ${role.sort_order}) 
        ON CONFLICT (name) DO UPDATE SET sort_order = ${role.sort_order}
      `;
    }
    log(`Created/updated ${rolesToCreate.length} roles`);

    // Get role IDs
    const rolesResult = await sql`SELECT id, name FROM roles`;
    const roleMap = {};
    for (const row of rolesResult.rows) {
      roleMap[row.name.toLowerCase()] = row.id;
    }

    // Mapping from old person_types to new roles
    const typeToRoleMapping = {
      volunteer: "volunteer",
      parent: "parent",
      "fc leader": "fc leader",
      "potential group leader": "potential group leader",
      vendor: "vendor",
      partner: "community partner",
    };

    // Migrate from person_types if table exists
    let migratedFromTypes = 0;
    try {
      const personTypes = await sql`
        SELECT pta.person_id, pt.name as type_name
        FROM person_type_assignments pta
        JOIN person_types pt ON pta.type_id = pt.id
      `;

      for (const row of personTypes.rows) {
        const typeName = row.type_name.toLowerCase();
        const roleName = typeToRoleMapping[typeName];

        if (roleName && roleMap[roleName]) {
          await sql`
            INSERT INTO person_roles (person_id, role_id) 
            VALUES (${row.person_id}, ${roleMap[roleName]}) 
            ON CONFLICT DO NOTHING
          `;
          migratedFromTypes++;
        }
      }
      log(`Migrated ${migratedFromTypes} person_type assignments to roles`);
    } catch (e) {
      log(`person_types table not found or error: ${e.message}`);
    }

    // Migrate is_board_member column to Board Member role
    let migratedBoardMembers = 0;
    try {
      // Cast to handle integer or boolean storage
      const boardMembers =
        await sql`SELECT id FROM people WHERE is_board_member::boolean = true`;
      const boardMemberRoleId = roleMap["board member"];

      if (boardMemberRoleId) {
        for (const person of boardMembers.rows) {
          await sql`
            INSERT INTO person_roles (person_id, role_id) 
            VALUES (${person.id}, ${boardMemberRoleId}) 
            ON CONFLICT DO NOTHING
          `;
          migratedBoardMembers++;
        }
        log(
          `Migrated ${migratedBoardMembers} board members to Board Member role`
        );
      }
    } catch (e) {
      log(`Error migrating board members: ${e.message}`);
    }

    // Count results
    const finalRoles = await sql`SELECT COUNT(*) as count FROM roles`;
    const finalAssignments =
      await sql`SELECT COUNT(*) as count FROM person_roles`;

    log("Migration complete!");
    log(`Total roles: ${finalRoles.rows[0].count}`);
    log(`Total role assignments: ${finalAssignments.rows[0].count}`);

    return NextResponse.json({
      success: true,
      message: "Role migration completed",
      logs,
      summary: {
        roles: parseInt(finalRoles.rows[0].count),
        assignments: parseInt(finalAssignments.rows[0].count),
        migratedFromTypes,
        migratedBoardMembers,
      },
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
