import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

export async function GET(request) {
  // Check for setup secret to prevent unauthorized access
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const force = searchParams.get("force") === "true";

  if (process.env.SETUP_SECRET && secret !== process.env.SETUP_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if already seeded (unless force=true)
    if (!force) {
      const existingPeople = await sql`SELECT COUNT(*) as count FROM people`;
      if (parseInt(existingPeople.rows[0].count) > 0) {
        return NextResponse.json({
          success: false,
          message:
            "Database already has data. Use ?force=true to reseed anyway.",
        });
      }
    }

    // Seed schools and get IDs
    const school1 =
      await sql`INSERT INTO schools (name, address, city, state, zip) VALUES ('Lincoln Elementary', '123 Education St', 'Springfield', 'IL', '62701') RETURNING id`;
    const school2 =
      await sql`INSERT INTO schools (name, address, city, state, zip) VALUES ('Washington Middle School', '456 Learning Ave', 'Springfield', 'IL', '62702') RETURNING id`;
    const school3 =
      await sql`INSERT INTO schools (name, address, city, state, zip) VALUES ('Jefferson High School', '789 Knowledge Blvd', 'Springfield', 'IL', '62703') RETURNING id`;
    const school4 =
      await sql`INSERT INTO schools (name, address, city, state, zip) VALUES ('Roosevelt Academy', '321 Scholar Dr', 'Springfield', 'IL', '62704') RETURNING id`;
    const school5 =
      await sql`INSERT INTO schools (name, address, city, state, zip) VALUES ('Kennedy Charter School', '654 Student Way', 'Springfield', 'IL', '62705') RETURNING id`;

    // Seed companies and get IDs
    const company1 =
      await sql`INSERT INTO companies (name, address, city, state, zip, website, is_donor) VALUES ('Tech Solutions Inc', '100 Tech Park', 'Springfield', 'IL', '62701', 'https://techsolutions.example.com', 1) RETURNING id`;
    const company2 =
      await sql`INSERT INTO companies (name, address, city, state, zip, website, is_donor) VALUES ('Community Foundation', '200 Main St', 'Springfield', 'IL', '62702', 'https://communityfound.example.com', 1) RETURNING id`;
    const company3 =
      await sql`INSERT INTO companies (name, address, city, state, zip, website, is_donor) VALUES ('Local Business Group', '300 Commerce Dr', 'Springfield', 'IL', '62703', 'https://localbiz.example.com', 0) RETURNING id`;
    const company4 =
      await sql`INSERT INTO companies (name, address, city, state, zip, website, is_donor) VALUES ('Education Partners LLC', '400 Partnership Way', 'Springfield', 'IL', '62704', 'https://edupartners.example.com', 1) RETURNING id`;

    // Get person type IDs
    const leadType = await sql`SELECT id FROM person_types WHERE name = 'Lead'`;
    const interestedType =
      await sql`SELECT id FROM person_types WHERE name = 'Interested'`;
    const leadTypeId = leadType.rows[0].id;
    const interestedTypeId = interestedType.rows[0].id;

    // Seed people and get IDs
    const person1 =
      await sql`INSERT INTO people (first_name, middle_name, last_name, email, phone, title, is_donor, is_fc_certified, is_board_member) VALUES ('John', 'Robert', 'Smith', 'john.smith@example.com', '555-0101', 'Program Director', 1, 1, 1) RETURNING id`;
    const person2 =
      await sql`INSERT INTO people (first_name, middle_name, last_name, email, phone, title, is_donor, is_fc_certified, is_board_member) VALUES ('Sarah', 'Jane', 'Johnson', 'sarah.johnson@example.com', '555-0102', 'Volunteer Coordinator', 0, 1, 0) RETURNING id`;
    const person3 =
      await sql`INSERT INTO people (first_name, last_name, email, phone, title, is_donor, is_fc_certified, is_board_member) VALUES ('Michael', 'Williams', 'michael.w@example.com', '555-0103', 'Teacher', 1, 0, 0) RETURNING id`;
    const person4 =
      await sql`INSERT INTO people (first_name, middle_name, last_name, email, phone, title, is_donor, is_fc_certified, is_board_member) VALUES ('Emily', 'Grace', 'Brown', 'emily.brown@example.com', '555-0104', 'Parent Volunteer', 0, 1, 0) RETURNING id`;
    const person5 =
      await sql`INSERT INTO people (first_name, middle_name, last_name, email, phone, title, is_donor, is_fc_certified, is_board_member) VALUES ('David', 'Lee', 'Davis', 'david.davis@example.com', '555-0105', 'Business Owner', 1, 0, 1) RETURNING id`;
    const person6 =
      await sql`INSERT INTO people (first_name, last_name, email, phone, title, is_donor, is_fc_certified, is_board_member) VALUES ('Jennifer', 'Miller', 'jennifer.m@example.com', '555-0106', 'School Principal', 0, 0, 0) RETURNING id`;
    const person7 =
      await sql`INSERT INTO people (first_name, middle_name, last_name, email, phone, title, is_donor, is_fc_certified, is_board_member) VALUES ('Robert', 'James', 'Wilson', 'robert.wilson@example.com', '555-0107', 'Community Leader', 1, 0, 1) RETURNING id`;

    const p1 = person1.rows[0].id;
    const p2 = person2.rows[0].id;
    const p3 = person3.rows[0].id;
    const p4 = person4.rows[0].id;
    const p5 = person5.rows[0].id;
    const p6 = person6.rows[0].id;
    const p7 = person7.rows[0].id;

    const c1 = company1.rows[0].id;
    const c2 = company2.rows[0].id;
    const c3 = company3.rows[0].id;
    const c4 = company4.rows[0].id;

    const s1 = school1.rows[0].id;
    const s2 = school2.rows[0].id;
    const s3 = school3.rows[0].id;

    // Seed person type assignments using actual IDs
    await sql`INSERT INTO person_type_assignments (person_id, type_id) VALUES (${p1}, ${leadTypeId})`;
    await sql`INSERT INTO person_type_assignments (person_id, type_id) VALUES (${p2}, ${leadTypeId})`;
    await sql`INSERT INTO person_type_assignments (person_id, type_id) VALUES (${p3}, ${interestedTypeId})`;
    await sql`INSERT INTO person_type_assignments (person_id, type_id) VALUES (${p4}, ${leadTypeId})`;
    await sql`INSERT INTO person_type_assignments (person_id, type_id) VALUES (${p4}, ${interestedTypeId})`;
    await sql`INSERT INTO person_type_assignments (person_id, type_id) VALUES (${p6}, ${interestedTypeId})`;

    // Seed person-company relationships using actual IDs
    await sql`INSERT INTO person_companies (person_id, company_id, is_primary) VALUES (${p1}, ${c1}, 1)`;
    await sql`INSERT INTO person_companies (person_id, company_id, is_primary) VALUES (${p5}, ${c3}, 1)`;
    await sql`INSERT INTO person_companies (person_id, company_id, is_primary) VALUES (${p5}, ${c4}, 0)`;
    await sql`INSERT INTO person_companies (person_id, company_id, is_primary) VALUES (${p7}, ${c2}, 1)`;

    // Seed person-school relationships using actual IDs
    await sql`INSERT INTO person_schools (person_id, school_id) VALUES (${p2}, ${s1})`;
    await sql`INSERT INTO person_schools (person_id, school_id) VALUES (${p3}, ${s2})`;
    await sql`INSERT INTO person_schools (person_id, school_id) VALUES (${p4}, ${s1})`;
    await sql`INSERT INTO person_schools (person_id, school_id) VALUES (${p6}, ${s3})`;

    // Seed certifications using actual IDs
    await sql`INSERT INTO certifications (person_id, background_check_status, application_received, training_complete) VALUES (${p1}, 'approved', 1, 1)`;
    await sql`INSERT INTO certifications (person_id, background_check_status, application_received, training_complete) VALUES (${p2}, 'approved', 1, 1)`;
    await sql`INSERT INTO certifications (person_id, background_check_status, application_received, training_complete) VALUES (${p4}, 'pending', 1, 0)`;

    // Seed donations using actual IDs
    await sql`INSERT INTO donations (amount, date, note, company_id) VALUES (5000, '2024-01-15', 'Annual corporate donation', ${c1})`;
    await sql`INSERT INTO donations (amount, date, note, company_id) VALUES (10000, '2024-02-20', 'Foundation grant', ${c2})`;
    await sql`INSERT INTO donations (amount, date, note, person_id) VALUES (500, '2024-03-10', 'Personal contribution', ${p1})`;
    await sql`INSERT INTO donations (amount, date, note, company_id) VALUES (2500, '2024-04-05', 'Quarterly donation', ${c4})`;
    await sql`INSERT INTO donations (amount, date, note, person_id) VALUES (250, '2024-05-15', 'Monthly giving', ${p3})`;
    await sql`INSERT INTO donations (amount, date, note, person_id) VALUES (1000, '2024-06-01', 'Summer program support', ${p5})`;
    await sql`INSERT INTO donations (amount, date, note, person_id) VALUES (750, '2024-07-20', 'Event sponsorship', ${p7})`;
    await sql`INSERT INTO donations (amount, date, note, company_id) VALUES (3000, '2024-08-10', 'Back to school drive', ${c1})`;

    // Seed notes using actual IDs
    await sql`INSERT INTO notes (title, content, date, entity_type, entity_id) VALUES ('Initial Contact', 'Met at community event, very interested in volunteering.', '2024-01-20', 'person', ${p1})`;
    await sql`INSERT INTO notes (title, content, date, entity_type, entity_id) VALUES ('Follow-up Call', 'Discussed program details and certification process.', '2024-02-15', 'person', ${p2})`;
    await sql`INSERT INTO notes (title, content, date, entity_type, entity_id) VALUES ('Partnership Discussion', 'Potential for increased support next fiscal year.', '2024-03-05', 'company', ${c1})`;
    await sql`INSERT INTO notes (title, content, date, entity_type, entity_id) VALUES ('Grant Application', 'Submitted grant application for education programs.', '2024-04-10', 'company', ${c2})`;
    await sql`INSERT INTO notes (title, content, date, entity_type, entity_id) VALUES ('Volunteer Interest', 'Expressed interest in weekend tutoring sessions.', '2024-05-20', 'person', ${p4})`;

    return NextResponse.json({
      success: true,
      message: "Database seeded successfully with sample data!",
      counts: {
        people: 7,
        companies: 4,
        schools: 5,
        donations: 8,
        notes: 5,
        certifications: 3,
      },
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
