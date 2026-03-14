const { sql } = require("@vercel/postgres");

async function seedDatabase() {
  console.log("Seeding database...");

  // Seed schools
  const schools = [
    {
      name: "Lincoln Elementary",
      address: "123 Education St",
      city: "Springfield",
      state: "IL",
      zip: "62701",
    },
    {
      name: "Washington Middle School",
      address: "456 Learning Ave",
      city: "Springfield",
      state: "IL",
      zip: "62702",
    },
    {
      name: "Jefferson High School",
      address: "789 Knowledge Blvd",
      city: "Springfield",
      state: "IL",
      zip: "62703",
    },
    {
      name: "Roosevelt Academy",
      address: "321 Scholar Dr",
      city: "Springfield",
      state: "IL",
      zip: "62704",
    },
    {
      name: "Kennedy Charter School",
      address: "654 Student Way",
      city: "Springfield",
      state: "IL",
      zip: "62705",
    },
  ];

  for (const school of schools) {
    await sql`INSERT INTO schools (name, address, city, state, zip) VALUES (${school.name}, ${school.address}, ${school.city}, ${school.state}, ${school.zip})`;
  }
  console.log("Schools seeded.");

  // Seed companies
  const companies = [
    {
      name: "Tech Solutions Inc",
      address: "100 Tech Park",
      city: "Springfield",
      state: "IL",
      zip: "62701",
      website: "https://techsolutions.example.com",
      is_donor: true,
    },
    {
      name: "Community Foundation",
      address: "200 Main St",
      city: "Springfield",
      state: "IL",
      zip: "62702",
      website: "https://communityfound.example.com",
      is_donor: true,
    },
    {
      name: "Local Business Group",
      address: "300 Commerce Dr",
      city: "Springfield",
      state: "IL",
      zip: "62703",
      website: "https://localbiz.example.com",
      is_donor: false,
    },
    {
      name: "Education Partners LLC",
      address: "400 Partnership Way",
      city: "Springfield",
      state: "IL",
      zip: "62704",
      website: "https://edupartners.example.com",
      is_donor: true,
    },
  ];

  for (const company of companies) {
    await sql`INSERT INTO companies (name, address, city, state, zip, website, is_donor) VALUES (${company.name}, ${company.address}, ${company.city}, ${company.state}, ${company.zip}, ${company.website}, ${company.is_donor})`;
  }
  console.log("Companies seeded.");

  // Seed people with stage_id (stages: 1=Lead, 2=Prospect, 3=Active, 4=Inactive)
  const people = [
    {
      first_name: "John",
      middle_name: "Robert",
      last_name: "Smith",
      email: "john.smith@example.com",
      phone: "555-0101",
      title: "Program Director",
      is_donor: true,
      is_fc_certified: true,
      stage_id: 3,
    },
    {
      first_name: "Sarah",
      middle_name: "Jane",
      last_name: "Johnson",
      email: "sarah.johnson@example.com",
      phone: "555-0102",
      title: "Volunteer Coordinator",
      is_donor: false,
      is_fc_certified: true,
      stage_id: 3,
    },
    {
      first_name: "Michael",
      middle_name: null,
      last_name: "Williams",
      email: "michael.w@example.com",
      phone: "555-0103",
      title: "Teacher",
      is_donor: true,
      is_fc_certified: false,
      stage_id: 2,
    },
    {
      first_name: "Emily",
      middle_name: "Grace",
      last_name: "Brown",
      email: "emily.brown@example.com",
      phone: "555-0104",
      title: "Parent Volunteer",
      is_donor: false,
      is_fc_certified: true,
      stage_id: 3,
    },
    {
      first_name: "David",
      middle_name: "Lee",
      last_name: "Davis",
      email: "david.davis@example.com",
      phone: "555-0105",
      title: "Business Owner",
      is_donor: true,
      is_fc_certified: false,
      stage_id: 3,
    },
    {
      first_name: "Jennifer",
      middle_name: null,
      last_name: "Miller",
      email: "jennifer.m@example.com",
      phone: "555-0106",
      title: "School Principal",
      is_donor: false,
      is_fc_certified: false,
      stage_id: 1,
    },
    {
      first_name: "Robert",
      middle_name: "James",
      last_name: "Wilson",
      email: "robert.wilson@example.com",
      phone: "555-0107",
      title: "Community Leader",
      is_donor: true,
      is_fc_certified: false,
      stage_id: 3,
    },
  ];

  for (const person of people) {
    await sql`INSERT INTO people (first_name, middle_name, last_name, email, phone, title, is_donor, is_fc_certified, stage_id)
      VALUES (${person.first_name}, ${person.middle_name}, ${person.last_name}, ${person.email}, ${person.phone}, ${person.title}, ${person.is_donor}, ${person.is_fc_certified}, ${person.stage_id})`;
  }
  console.log("People seeded.");

  // Seed person role assignments (roles: 1=Board Member, 2=Volunteer, 3=Staff, 4=Parent, 5=Teacher, 6=Community Partner)
  // John Smith - Board Member, Staff
  await sql`INSERT INTO person_roles (person_id, role_id) VALUES (1, 1)`;
  await sql`INSERT INTO person_roles (person_id, role_id) VALUES (1, 3)`;
  // Sarah Johnson - Volunteer, Staff
  await sql`INSERT INTO person_roles (person_id, role_id) VALUES (2, 2)`;
  await sql`INSERT INTO person_roles (person_id, role_id) VALUES (2, 3)`;
  // Michael Williams - Teacher
  await sql`INSERT INTO person_roles (person_id, role_id) VALUES (3, 5)`;
  // Emily Brown - Parent, Volunteer
  await sql`INSERT INTO person_roles (person_id, role_id) VALUES (4, 4)`;
  await sql`INSERT INTO person_roles (person_id, role_id) VALUES (4, 2)`;
  // David Davis - Board Member, Community Partner
  await sql`INSERT INTO person_roles (person_id, role_id) VALUES (5, 1)`;
  await sql`INSERT INTO person_roles (person_id, role_id) VALUES (5, 6)`;
  // Jennifer Miller - Teacher (principal)
  await sql`INSERT INTO person_roles (person_id, role_id) VALUES (6, 5)`;
  // Robert Wilson - Board Member, Community Partner
  await sql`INSERT INTO person_roles (person_id, role_id) VALUES (7, 1)`;
  await sql`INSERT INTO person_roles (person_id, role_id) VALUES (7, 6)`;
  console.log("Person role assignments seeded.");

  // Seed person-company relationships
  await sql`INSERT INTO person_companies (person_id, company_id, is_primary) VALUES (1, 1, true)`;
  await sql`INSERT INTO person_companies (person_id, company_id, is_primary) VALUES (5, 3, true)`;
  await sql`INSERT INTO person_companies (person_id, company_id, is_primary) VALUES (5, 4, false)`;
  await sql`INSERT INTO person_companies (person_id, company_id, is_primary) VALUES (7, 2, true)`;
  console.log("Person-company relationships seeded.");

  // Seed person-school relationships
  await sql`INSERT INTO person_schools (person_id, school_id) VALUES (2, 1)`;
  await sql`INSERT INTO person_schools (person_id, school_id) VALUES (3, 2)`;
  await sql`INSERT INTO person_schools (person_id, school_id) VALUES (4, 1)`;
  await sql`INSERT INTO person_schools (person_id, school_id) VALUES (6, 3)`;
  console.log("Person-school relationships seeded.");

  // Seed certifications for FC certified people
  await sql`INSERT INTO certifications (person_id, background_check_status, application_received, training_complete) VALUES (1, 'approved', true, true)`;
  await sql`INSERT INTO certifications (person_id, background_check_status, application_received, training_complete) VALUES (2, 'approved', true, true)`;
  await sql`INSERT INTO certifications (person_id, background_check_status, application_received, training_complete) VALUES (4, 'pending', true, false)`;
  console.log("Certifications seeded.");

  // Seed donations
  const donations = [
    {
      amount: 5000,
      date: "2024-01-15",
      note: "Annual corporate donation",
      person_id: null,
      company_id: 1,
    },
    {
      amount: 10000,
      date: "2024-02-20",
      note: "Foundation grant",
      person_id: null,
      company_id: 2,
    },
    {
      amount: 500,
      date: "2024-03-10",
      note: "Personal contribution",
      person_id: 1,
      company_id: null,
    },
    {
      amount: 2500,
      date: "2024-04-05",
      note: "Quarterly donation",
      person_id: null,
      company_id: 4,
    },
    {
      amount: 250,
      date: "2024-05-15",
      note: "Monthly giving",
      person_id: 3,
      company_id: null,
    },
    {
      amount: 1000,
      date: "2024-06-01",
      note: "Summer program support",
      person_id: 5,
      company_id: null,
    },
    {
      amount: 750,
      date: "2024-07-20",
      note: "Event sponsorship",
      person_id: 7,
      company_id: null,
    },
    {
      amount: 3000,
      date: "2024-08-10",
      note: "Back to school drive",
      person_id: null,
      company_id: 1,
    },
  ];

  for (const donation of donations) {
    await sql`INSERT INTO donations (amount, date, note, person_id, company_id) VALUES (${donation.amount}, ${donation.date}, ${donation.note}, ${donation.person_id}, ${donation.company_id})`;
  }
  console.log("Donations seeded.");

  // Seed notes
  const notes = [
    {
      title: "Initial Contact",
      content: "Met at community event, very interested in volunteering.",
      date: "2024-01-20",
      entity_type: "person",
      entity_id: 1,
    },
    {
      title: "Follow-up Call",
      content: "Discussed program details and certification process.",
      date: "2024-02-15",
      entity_type: "person",
      entity_id: 2,
    },
    {
      title: "Partnership Discussion",
      content: "Potential for increased support next fiscal year.",
      date: "2024-03-05",
      entity_type: "company",
      entity_id: 1,
    },
    {
      title: "Grant Application",
      content: "Submitted grant application for education programs.",
      date: "2024-04-10",
      entity_type: "company",
      entity_id: 2,
    },
    {
      title: "Volunteer Interest",
      content: "Expressed interest in weekend tutoring sessions.",
      date: "2024-05-20",
      entity_type: "person",
      entity_id: 4,
    },
  ];

  for (const note of notes) {
    await sql`INSERT INTO notes (title, content, date, entity_type, entity_id) VALUES (${note.title}, ${note.content}, ${note.date}, ${note.entity_type}, ${note.entity_id})`;
  }
  console.log("Notes seeded.");

  console.log("\nDatabase seeded successfully!");
}

seedDatabase().catch(console.error);
