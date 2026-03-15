import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Parse CSV line handling quoted fields
function parseCSVLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

function parseCSV(content) {
  const lines = content.split("\n");
  const headers = parseCSVLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header.trim()] = values[index] || "";
    });
    rows.push(row);
  }

  return { headers, rows };
}

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const entityType = formData.get("entityType");
    const mapping = JSON.parse(formData.get("mapping") || "{}");

    if (!file || !entityType) {
      return NextResponse.json(
        { error: "File and entity type are required" },
        { status: 400 }
      );
    }

    const content = await file.text();
    const { rows } = parseCSV(content);

    let imported = 0;
    let skipped = 0;
    const errors = [];

    for (const row of rows) {
      try {
        if (entityType === "people") {
          const firstName = row[mapping.first_name] || "";
          const lastName = row[mapping.last_name] || "";

          if (!firstName || !lastName) {
            skipped++;
            continue;
          }

          // Check for duplicate
          const existing = await sql`
            SELECT id FROM people
            WHERE LOWER(first_name) = LOWER(${firstName})
            AND LOWER(last_name) = LOWER(${lastName})
          `;

          if (existing.rows.length > 0) {
            skipped++;
            continue;
          }

          const insertResult = await sql`
            INSERT INTO people (first_name, last_name, email, phone, title, address, city, state, zip)
            VALUES (
              ${firstName},
              ${lastName},
              ${row[mapping.email] || null},
              ${row[mapping.phone] || null},
              ${row[mapping.title] || null},
              ${row[mapping.address] || null},
              ${row[mapping.city] || null},
              ${row[mapping.state] || null},
              ${row[mapping.zip] || null}
            )
            RETURNING id
          `;

          // Handle family_members if mapped
          const familyStr = mapping.family_members ? row[mapping.family_members] : "";
          if (familyStr && insertResult.rows[0]) {
            const personId = insertResult.rows[0].id;
            const familyNames = familyStr.split(";").map((n) => n.trim()).filter(Boolean);
            for (const fullName of familyNames) {
              const parts = fullName.split(/\s+/);
              if (parts.length < 2) continue;
              const fFirst = parts[0];
              const fLast = parts.slice(1).join(" ");
              const relatedPerson = await sql`
                SELECT id FROM people
                WHERE LOWER(first_name) = LOWER(${fFirst})
                AND LOWER(last_name) = LOWER(${fLast})
                LIMIT 1
              `;
              if (relatedPerson.rows.length > 0) {
                const relatedId = relatedPerson.rows[0].id;
                // Insert both directions of the relationship
                await sql`
                  INSERT INTO family_relationships (person_id, related_person_id)
                  VALUES (${personId}, ${relatedId})
                  ON CONFLICT DO NOTHING
                `;
                await sql`
                  INSERT INTO family_relationships (person_id, related_person_id)
                  VALUES (${relatedId}, ${personId})
                  ON CONFLICT DO NOTHING
                `;
              }
            }
          }

          imported++;
        } else if (entityType === "companies") {
          const name = row[mapping.name] || "";

          if (!name) {
            skipped++;
            continue;
          }

          // Check for duplicate
          const existing = await sql`
            SELECT id FROM companies WHERE LOWER(name) = LOWER(${name})
          `;

          if (existing.rows.length > 0) {
            skipped++;
            continue;
          }

          await sql`
            INSERT INTO companies (name, address, city, state, zip, website)
            VALUES (
              ${name},
              ${row[mapping.address] || null},
              ${row[mapping.city] || null},
              ${row[mapping.state] || null},
              ${row[mapping.zip] || null},
              ${row[mapping.website] || null}
            )
          `;
          imported++;
        } else if (entityType === "schools") {
          const name = row[mapping.name] || "";

          if (!name) {
            skipped++;
            continue;
          }

          // Check for duplicate
          const existing = await sql`
            SELECT id FROM schools WHERE LOWER(name) = LOWER(${name})
          `;

          if (existing.rows.length > 0) {
            skipped++;
            continue;
          }

          await sql`
            INSERT INTO schools (name, address, city, state, zip)
            VALUES (
              ${name},
              ${row[mapping.address] || null},
              ${row[mapping.city] || null},
              ${row[mapping.state] || null},
              ${row[mapping.zip] || null}
            )
          `;
          imported++;
        } else if (entityType === "groups") {
          const name = row[mapping.name] || "";
          const schoolName = row[mapping.school_name] || "";
          const gender = row[mapping.gender] || "";

          if (!name || !schoolName || !gender) {
            skipped++;
            continue;
          }

          if (!["Girls", "Boys"].includes(gender)) {
            skipped++;
            continue;
          }

          // Look up school by name
          const school = await sql`
            SELECT id FROM schools WHERE LOWER(name) = LOWER(${schoolName}) LIMIT 1
          `;
          if (school.rows.length === 0) {
            skipped++;
            continue;
          }
          const schoolId = school.rows[0].id;

          // Check for duplicate group at same school
          const existing = await sql`
            SELECT id FROM groups
            WHERE LOWER(name) = LOWER(${name})
            AND school_id = ${schoolId}
          `;

          if (existing.rows.length > 0) {
            skipped++;
            continue;
          }

          // Look up primary leader if provided
          let primaryLeaderId = null;
          const leaderName = mapping.primary_leader_name ? row[mapping.primary_leader_name] : "";
          if (leaderName) {
            const parts = leaderName.trim().split(/\s+/);
            if (parts.length >= 2) {
              const lFirst = parts[0];
              const lLast = parts.slice(1).join(" ");
              const leader = await sql`
                SELECT id FROM people
                WHERE LOWER(first_name) = LOWER(${lFirst})
                AND LOWER(last_name) = LOWER(${lLast})
                LIMIT 1
              `;
              if (leader.rows.length > 0) {
                primaryLeaderId = leader.rows[0].id;
              }
            }
          }

          const year = mapping.year ? (row[mapping.year] ? parseInt(row[mapping.year], 10) : null) : null;
          const status = mapping.status ? (row[mapping.status] || "Active") : "Active";

          await sql`
            INSERT INTO groups (school_id, name, gender, year, status, primary_leader_id)
            VALUES (
              ${schoolId},
              ${name},
              ${gender},
              ${year},
              ${status},
              ${primaryLeaderId}
            )
          `;
          imported++;
        }
      } catch (error) {
        errors.push(error.message);
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      total: rows.length,
      errors: errors.slice(0, 5), // First 5 errors
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { error: "Failed to import data", details: error.message },
      { status: 500 }
    );
  }
}
