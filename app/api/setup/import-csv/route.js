import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

// Simple CSV parser that handles quoted fields with commas
function parseCSVLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
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
      row[header.trim()] = values[index]?.trim() || "";
    });
    rows.push(row);
  }

  return rows;
}

async function getOrCreateCompany(companyName) {
  if (!companyName) return null;

  const existing = await sql`SELECT id FROM companies WHERE LOWER(name) = LOWER(${companyName})`;
  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  const result = await sql`INSERT INTO companies (name) VALUES (${companyName}) RETURNING id`;
  return result.rows[0].id;
}

async function getOrCreatePersonType(typeName) {
  const existing = await sql`SELECT id FROM person_types WHERE LOWER(name) = LOWER(${typeName})`;
  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  const result = await sql`INSERT INTO person_types (name) VALUES (${typeName}) RETURNING id`;
  return result.rows[0].id;
}

export async function POST(request) {
  try {
    const results = { schools: 0, people: 0, skipped: 0, errors: [] };

    // Import schools
    const schoolsCsvPath = path.join(process.cwd(), "resources", "School v1.csv");
    let schoolsContent;
    try {
      schoolsContent = fs.readFileSync(schoolsCsvPath, "utf8");
    } catch (e) {
      results.errors.push("Could not read schools CSV: " + e.message);
    }

    if (schoolsContent) {
      const schoolRows = parseCSV(schoolsContent);

      for (const row of schoolRows) {
        const name = row["School"];
        const city = row["City"];
        if (!name) continue;

        try {
          const existing = await sql`SELECT id FROM schools WHERE name = ${name}`;
          if (existing.rows.length > 0) continue;

          await sql`INSERT INTO schools (name, city) VALUES (${name}, ${city || null})`;
          results.schools++;
        } catch (error) {
          results.errors.push(`School "${name}": ${error.message}`);
        }
      }
    }

    // Import people
    const peopleCsvPath = path.join(process.cwd(), "resources", "CRM Data Load v6.csv");
    let peopleContent;
    try {
      peopleContent = fs.readFileSync(peopleCsvPath, "utf8");
    } catch (e) {
      results.errors.push("Could not read people CSV: " + e.message);
    }

    if (peopleContent) {
      const peopleRows = parseCSV(peopleContent);

      const typeColumns = [
        { column: "Volunteer", typeName: "Volunteer" },
        { column: "Potential Group Leader", typeName: "Potential Group Leader" },
        { column: "vendor", typeName: "Vendor" },
        { column: "parent", typeName: "Parent" },
        { column: "Other ", typeName: "Other" },
        { column: "Interested", typeName: "Interested" },
        { column: "FC Leader", typeName: "FC Leader" },
        { column: "Partenr", typeName: "Partner" },
      ];

      for (const row of peopleRows) {
        const firstName = row["crfbe_firstname"]?.trim();
        const lastName = row["crfbe_lastname"]?.trim();
        if (!firstName || !lastName) {
          results.skipped++;
          continue;
        }

        try {
          // Check for duplicate
          const existing = await sql`
            SELECT id FROM people
            WHERE LOWER(first_name) = LOWER(${firstName})
            AND LOWER(last_name) = LOWER(${lastName})
          `;
          if (existing.rows.length > 0) {
            results.skipped++;
            continue;
          }

          const email = row["crfbe_email"] || null;
          const phone = row["crfbe_phone"] || null;
          const city = row["crfbe_city"] || null;
          const state = row["crfbe_state"] || null;
          const street = row["crfbe_street"] || null;
          const zip = row["crfbe_zip"] || null;
          const title = row["crfbe_title"] || null;
          const middleName = row["crfbe_middlename"] || null;
          const isBoardMember = row["crfbe_boardmember"]?.toUpperCase() === "TRUE";
          const isDonor = row["crfbe_donor"]?.toUpperCase() === "TRUE";
          const isFcCertified = row["crfbe_fccertified"]?.toUpperCase() === "TRUE";
          const companyName = row["crfbe_company"] || null;
          const graduatingClass = row["Graduating Class"] || null;

          const result = await sql`
            INSERT INTO people (
              first_name, middle_name, last_name, email, phone,
              title, address, city, state, zip,
              is_donor, is_fc_certified, is_board_member, children
            ) VALUES (
              ${firstName}, ${middleName}, ${lastName}, ${email}, ${phone},
              ${title}, ${street}, ${city}, ${state}, ${zip},
              ${isDonor ? 1 : 0}, ${isFcCertified ? 1 : 0}, ${isBoardMember ? 1 : 0}, ${graduatingClass}
            ) RETURNING id
          `;
          const personId = result.rows[0].id;

          // Link to company
          if (companyName) {
            const companyId = await getOrCreateCompany(companyName);
            if (companyId) {
              await sql`INSERT INTO person_companies (person_id, company_id, is_primary) VALUES (${personId}, ${companyId}, 1) ON CONFLICT DO NOTHING`;
            }
          }

          // Add person types
          for (const { column, typeName } of typeColumns) {
            if (row[column]?.toUpperCase() === "TRUE") {
              const typeId = await getOrCreatePersonType(typeName);
              await sql`INSERT INTO person_type_assignments (person_id, type_id) VALUES (${personId}, ${typeId}) ON CONFLICT DO NOTHING`;
            }
          }

          results.people++;
        } catch (error) {
          results.errors.push(`Person "${firstName} ${lastName}": ${error.message}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Imported ${results.schools} schools and ${results.people} people. Skipped ${results.skipped} duplicates.`,
      ...results,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
