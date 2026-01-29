import { sql } from '@vercel/postgres'
import { NextResponse } from 'next/server'

export async function GET(request) {
  // Check for setup secret to prevent unauthorized access
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')

  if (process.env.SETUP_SECRET && secret !== process.env.SETUP_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Check if already seeded
    const existingPeople = await sql`SELECT COUNT(*) as count FROM people`
    if (parseInt(existingPeople.rows[0].count) > 0) {
      return NextResponse.json({
        success: false,
        message: 'Database already has data. Skipping seed.'
      })
    }

    // Seed schools
    await sql`INSERT INTO schools (name, address, city, state, zip) VALUES ('Lincoln Elementary', '123 Education St', 'Springfield', 'IL', '62701')`
    await sql`INSERT INTO schools (name, address, city, state, zip) VALUES ('Washington Middle School', '456 Learning Ave', 'Springfield', 'IL', '62702')`
    await sql`INSERT INTO schools (name, address, city, state, zip) VALUES ('Jefferson High School', '789 Knowledge Blvd', 'Springfield', 'IL', '62703')`
    await sql`INSERT INTO schools (name, address, city, state, zip) VALUES ('Roosevelt Academy', '321 Scholar Dr', 'Springfield', 'IL', '62704')`
    await sql`INSERT INTO schools (name, address, city, state, zip) VALUES ('Kennedy Charter School', '654 Student Way', 'Springfield', 'IL', '62705')`

    // Seed companies
    await sql`INSERT INTO companies (name, address, city, state, zip, website, is_donor) VALUES ('Tech Solutions Inc', '100 Tech Park', 'Springfield', 'IL', '62701', 'https://techsolutions.example.com', 1)`
    await sql`INSERT INTO companies (name, address, city, state, zip, website, is_donor) VALUES ('Community Foundation', '200 Main St', 'Springfield', 'IL', '62702', 'https://communityfound.example.com', 1)`
    await sql`INSERT INTO companies (name, address, city, state, zip, website, is_donor) VALUES ('Local Business Group', '300 Commerce Dr', 'Springfield', 'IL', '62703', 'https://localbiz.example.com', 0)`
    await sql`INSERT INTO companies (name, address, city, state, zip, website, is_donor) VALUES ('Education Partners LLC', '400 Partnership Way', 'Springfield', 'IL', '62704', 'https://edupartners.example.com', 1)`

    // Seed people
    await sql`INSERT INTO people (first_name, middle_name, last_name, email, phone, title, is_donor, is_fc_certified, is_board_member) VALUES ('John', 'Robert', 'Smith', 'john.smith@example.com', '555-0101', 'Program Director', 1, 1, 1)`
    await sql`INSERT INTO people (first_name, middle_name, last_name, email, phone, title, is_donor, is_fc_certified, is_board_member) VALUES ('Sarah', 'Jane', 'Johnson', 'sarah.johnson@example.com', '555-0102', 'Volunteer Coordinator', 0, 1, 0)`
    await sql`INSERT INTO people (first_name, last_name, email, phone, title, is_donor, is_fc_certified, is_board_member) VALUES ('Michael', 'Williams', 'michael.w@example.com', '555-0103', 'Teacher', 1, 0, 0)`
    await sql`INSERT INTO people (first_name, middle_name, last_name, email, phone, title, is_donor, is_fc_certified, is_board_member) VALUES ('Emily', 'Grace', 'Brown', 'emily.brown@example.com', '555-0104', 'Parent Volunteer', 0, 1, 0)`
    await sql`INSERT INTO people (first_name, middle_name, last_name, email, phone, title, is_donor, is_fc_certified, is_board_member) VALUES ('David', 'Lee', 'Davis', 'david.davis@example.com', '555-0105', 'Business Owner', 1, 0, 1)`
    await sql`INSERT INTO people (first_name, last_name, email, phone, title, is_donor, is_fc_certified, is_board_member) VALUES ('Jennifer', 'Miller', 'jennifer.m@example.com', '555-0106', 'School Principal', 0, 0, 0)`
    await sql`INSERT INTO people (first_name, middle_name, last_name, email, phone, title, is_donor, is_fc_certified, is_board_member) VALUES ('Robert', 'James', 'Wilson', 'robert.wilson@example.com', '555-0107', 'Community Leader', 1, 0, 1)`

    // Seed person type assignments
    await sql`INSERT INTO person_type_assignments (person_id, type_id) VALUES (1, 1)`
    await sql`INSERT INTO person_type_assignments (person_id, type_id) VALUES (2, 1)`
    await sql`INSERT INTO person_type_assignments (person_id, type_id) VALUES (3, 2)`
    await sql`INSERT INTO person_type_assignments (person_id, type_id) VALUES (4, 1)`
    await sql`INSERT INTO person_type_assignments (person_id, type_id) VALUES (4, 2)`
    await sql`INSERT INTO person_type_assignments (person_id, type_id) VALUES (6, 2)`

    // Seed person-company relationships
    await sql`INSERT INTO person_companies (person_id, company_id, is_primary) VALUES (1, 1, 1)`
    await sql`INSERT INTO person_companies (person_id, company_id, is_primary) VALUES (5, 3, 1)`
    await sql`INSERT INTO person_companies (person_id, company_id, is_primary) VALUES (5, 4, 0)`
    await sql`INSERT INTO person_companies (person_id, company_id, is_primary) VALUES (7, 2, 1)`

    // Seed person-school relationships
    await sql`INSERT INTO person_schools (person_id, school_id) VALUES (2, 1)`
    await sql`INSERT INTO person_schools (person_id, school_id) VALUES (3, 2)`
    await sql`INSERT INTO person_schools (person_id, school_id) VALUES (4, 1)`
    await sql`INSERT INTO person_schools (person_id, school_id) VALUES (6, 3)`

    // Seed certifications
    await sql`INSERT INTO certifications (person_id, background_check_status, application_received, training_complete) VALUES (1, 'approved', 1, 1)`
    await sql`INSERT INTO certifications (person_id, background_check_status, application_received, training_complete) VALUES (2, 'approved', 1, 1)`
    await sql`INSERT INTO certifications (person_id, background_check_status, application_received, training_complete) VALUES (4, 'pending', 1, 0)`

    // Seed donations
    await sql`INSERT INTO donations (amount, date, note, company_id) VALUES (5000, '2024-01-15', 'Annual corporate donation', 1)`
    await sql`INSERT INTO donations (amount, date, note, company_id) VALUES (10000, '2024-02-20', 'Foundation grant', 2)`
    await sql`INSERT INTO donations (amount, date, note, person_id) VALUES (500, '2024-03-10', 'Personal contribution', 1)`
    await sql`INSERT INTO donations (amount, date, note, company_id) VALUES (2500, '2024-04-05', 'Quarterly donation', 4)`
    await sql`INSERT INTO donations (amount, date, note, person_id) VALUES (250, '2024-05-15', 'Monthly giving', 3)`
    await sql`INSERT INTO donations (amount, date, note, person_id) VALUES (1000, '2024-06-01', 'Summer program support', 5)`
    await sql`INSERT INTO donations (amount, date, note, person_id) VALUES (750, '2024-07-20', 'Event sponsorship', 7)`
    await sql`INSERT INTO donations (amount, date, note, company_id) VALUES (3000, '2024-08-10', 'Back to school drive', 1)`

    // Seed notes
    await sql`INSERT INTO notes (title, content, date, entity_type, entity_id) VALUES ('Initial Contact', 'Met at community event, very interested in volunteering.', '2024-01-20', 'person', 1)`
    await sql`INSERT INTO notes (title, content, date, entity_type, entity_id) VALUES ('Follow-up Call', 'Discussed program details and certification process.', '2024-02-15', 'person', 2)`
    await sql`INSERT INTO notes (title, content, date, entity_type, entity_id) VALUES ('Partnership Discussion', 'Potential for increased support next fiscal year.', '2024-03-05', 'company', 1)`
    await sql`INSERT INTO notes (title, content, date, entity_type, entity_id) VALUES ('Grant Application', 'Submitted grant application for education programs.', '2024-04-10', 'company', 2)`
    await sql`INSERT INTO notes (title, content, date, entity_type, entity_id) VALUES ('Volunteer Interest', 'Expressed interest in weekend tutoring sessions.', '2024-05-20', 'person', 4)`

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully with sample data!'
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
