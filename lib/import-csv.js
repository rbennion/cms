const { sql } = require("@vercel/postgres");
const fs = require("fs");
const path = require("path");

// Simple CSV parser that handles quoted fields with commas
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

async function importSchools() {
  console.log("Importing schools...");

  const csvPath = path.join(__dirname, "../resources/School v1.csv");
  const content = fs.readFileSync(csvPath, "utf8");
  const rows = parseCSV(content);

  let imported = 0;
  const schoolMap = new Map(); // name -> id

  for (const row of rows) {
    const name = row["School"];
    const city = row["City"];
    const notes = row["Notes"];

    if (!name) continue;

    try {
      // Check if school already exists
      const existing = await sql`SELECT id FROM schools WHERE name = ${name}`;
      if (existing.rows.length > 0) {
        schoolMap.set(name, existing.rows[0].id);
        continue;
      }

      const result =
        await sql`INSERT INTO schools (name, city) VALUES (${name}, ${city || null}) RETURNING id`;
      schoolMap.set(name, result.rows[0].id);
      imported++;
    } catch (error) {
      console.error(`Error importing school "${name}":`, error.message);
    }
  }

  console.log(`Imported ${imported} schools`);
  return schoolMap;
}

async function getOrCreateCompany(companyName) {
  if (!companyName) return null;

  // Check if company exists
  const existing =
    await sql`SELECT id FROM companies WHERE LOWER(name) = LOWER(${companyName})`;
  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  // Create new company
  const result =
    await sql`INSERT INTO companies (name) VALUES (${companyName}) RETURNING id`;
  return result.rows[0].id;
}

async function getOrCreatePersonType(typeName) {
  // Check if type exists
  const existing =
    await sql`SELECT id FROM person_types WHERE LOWER(name) = LOWER(${typeName})`;
  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  // Create new type
  const result =
    await sql`INSERT INTO person_types (name) VALUES (${typeName}) RETURNING id`;
  return result.rows[0].id;
}

async function findSchoolByGraduatingClass(graduatingClass, schoolMap) {
  // Try to find a school matching the graduating class year
  // The schools have names like "Blue Valley High School-2026"
  if (!graduatingClass) return null;

  // Extract year(s) from graduating class (e.g., "2026", "2025, 2028", "2028 (Blue)")
  const yearMatch = graduatingClass.match(/\d{4}/);
  if (!yearMatch) return null;

  const year = yearMatch[0];

  // Search for schools with this year in the name
  for (const [name, id] of schoolMap) {
    if (name.includes(year)) {
      return id;
    }
  }

  return null;
}

async function importPeople(schoolMap) {
  console.log("Importing people...");

  const csvPath = path.join(__dirname, "../resources/CRM Data Load v6.csv");
  const content = fs.readFileSync(csvPath, "utf8");
  const rows = parseCSV(content);

  let imported = 0;
  let skipped = 0;

  // Type columns in CSV that map to person types
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

  for (const row of rows) {
    const firstName = row["crfbe_firstname"]?.trim();
    const lastName = row["crfbe_lastname"]?.trim();

    if (!firstName || !lastName) {
      skipped++;
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

    try {
      // Check for duplicate by email or name
      let existing = null;
      if (email) {
        existing =
          await sql`SELECT id FROM people WHERE LOWER(email) = LOWER(${email})`;
      }
      if (!existing || existing.rows.length === 0) {
        existing =
          await sql`SELECT id FROM people WHERE LOWER(first_name) = LOWER(${firstName}) AND LOWER(last_name) = LOWER(${lastName})`;
      }

      if (existing && existing.rows.length > 0) {
        console.log(`Skipping duplicate: ${firstName} ${lastName}`);
        skipped++;
        continue;
      }

      // Insert person
      const result = await sql`
        INSERT INTO people (
          first_name, middle_name, last_name, email, phone,
          title, address, city, state, zip,
          is_donor, is_fc_certified, is_board_member, children
        ) VALUES (
          ${firstName}, ${middleName}, ${lastName}, ${email}, ${phone},
          ${title}, ${street}, ${city}, ${state}, ${zip},
          ${isDonor}, ${isFcCertified}, ${isBoardMember}, ${graduatingClass}
        ) RETURNING id
      `;

      const personId = result.rows[0].id;

      // Link to company if specified
      if (companyName) {
        const companyId = await getOrCreateCompany(companyName);
        if (companyId) {
          await sql`INSERT INTO person_companies (person_id, company_id, is_primary) VALUES (${personId}, ${companyId}, true) ON CONFLICT DO NOTHING`;
        }
      }

      // Link to school based on graduating class
      const schoolId = await findSchoolByGraduatingClass(
        graduatingClass,
        schoolMap
      );
      if (schoolId) {
        await sql`INSERT INTO person_schools (person_id, school_id) VALUES (${personId}, ${schoolId}) ON CONFLICT DO NOTHING`;
      }

      // Add person types based on boolean columns
      for (const { column, typeName } of typeColumns) {
        if (row[column]?.toUpperCase() === "TRUE") {
          const typeId = await getOrCreatePersonType(typeName);
          await sql`INSERT INTO person_type_assignments (person_id, type_id) VALUES (${personId}, ${typeId}) ON CONFLICT DO NOTHING`;
        }
      }

      // Create certification record if FC certified
      if (isFcCertified) {
        await sql`INSERT INTO certifications (person_id, background_check_status) VALUES (${personId}, 'pending') ON CONFLICT (person_id) DO NOTHING`;
      }

      imported++;
    } catch (error) {
      console.error(
        `Error importing person "${firstName} ${lastName}":`,
        error.message
      );
    }
  }

  console.log(`Imported ${imported} people, skipped ${skipped}`);
}

async function main() {
  console.log("Starting data import...\n");

  try {
    // Import schools first
    const schoolMap = await importSchools();

    // Then import people (can link to schools and create companies)
    await importPeople(schoolMap);

    console.log("\nImport complete!");
  } catch (error) {
    console.error("Import failed:", error);
    process.exit(1);
  }
}

main();
