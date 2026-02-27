import { NextResponse } from 'next/server'
import { get, run, all } from '@/lib/db'

export async function GET(request, { params }) {
  try {
    const { id } = await params

    const person = await get('SELECT * FROM people WHERE id = ?', [id])

    if (!person) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 })
    }

    // Get associated companies
    const companies = await all(`
      SELECT c.*, pc.is_primary
      FROM companies c
      JOIN person_companies pc ON c.id = pc.company_id
      WHERE pc.person_id = ?
      ORDER BY pc.is_primary DESC, c.name
    `, [id])

    // Get associated types
    const types = await all(`
      SELECT pt.*
      FROM person_types pt
      JOIN person_type_assignments pta ON pt.id = pta.type_id
      WHERE pta.person_id = ?
    `, [id])

    // Get associated schools
    const schools = await all(`
      SELECT s.*
      FROM schools s
      JOIN person_schools ps ON s.id = ps.school_id
      WHERE ps.person_id = ?
    `, [id])

    // Get certification if FC certified
    let certification = null
    if (person.is_fc_certified) {
      certification = await get('SELECT * FROM certifications WHERE person_id = ?', [id])
    }

    // Get recent donations
    const donations = await all(`
      SELECT * FROM donations
      WHERE person_id = ?
      ORDER BY date DESC
      LIMIT 10
    `, [id])

    // Get notes
    const notes = await all(`
      SELECT * FROM notes
      WHERE entity_type = 'person' AND entity_id = ?
      ORDER BY date DESC
    `, [id])

    // Get family members (bidirectional relationship)
    const family_members = await all(`
      SELECT p.id, p.first_name, p.last_name, p.email, p.phone
      FROM people p
      WHERE p.id IN (
        SELECT related_person_id FROM family_relationships WHERE person_id = ?
        UNION
        SELECT person_id FROM family_relationships WHERE related_person_id = ?
      )
      ORDER BY p.last_name, p.first_name
    `, [id, id])

    return NextResponse.json({
      ...person,
      companies,
      types,
      schools,
      certification,
      donations,
      notes,
      family_members
    })
  } catch (error) {
    console.error('Error fetching person:', error)
    return NextResponse.json({ error: 'Failed to fetch person' }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
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
      family_member_ids
    } = body

    if (!first_name || !last_name) {
      return NextResponse.json({ error: 'First name and last name are required' }, { status: 400 })
    }

    const existing = await get('SELECT * FROM people WHERE id = ?', [id])
    if (!existing) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 })
    }

    await run(
      `UPDATE people SET
        first_name = ?, middle_name = ?, last_name = ?, email = ?, phone = ?,
        title = ?, address = ?, city = ?, state = ?, zip = ?,
        is_donor = ?, is_fc_certified = ?, is_board_member = ?, children = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [first_name, middle_name || null, last_name, email || null, phone || null, title || null, address || null, city || null, state || null, zip || null, is_donor ? 1 : 0, is_fc_certified ? 1 : 0, is_board_member ? 1 : 0, children || null, id]
    )

    // Update company associations
    if (company_ids !== undefined) {
      await run('DELETE FROM person_companies WHERE person_id = ?', [id])
      if (company_ids.length > 0) {
        for (let i = 0; i < company_ids.length; i++) {
          await run(
            'INSERT INTO person_companies (person_id, company_id, is_primary) VALUES (?, ?, ?)',
            [id, company_ids[i], i === 0 ? 1 : 0]
          )
        }
      }
    }

    // Update type associations
    if (type_ids !== undefined) {
      await run('DELETE FROM person_type_assignments WHERE person_id = ?', [id])
      if (type_ids.length > 0) {
        for (const typeId of type_ids) {
          await run(
            'INSERT INTO person_type_assignments (person_id, type_id) VALUES (?, ?)',
            [id, typeId]
          )
        }
      }
    }

    // Update school associations
    if (school_ids !== undefined) {
      await run('DELETE FROM person_schools WHERE person_id = ?', [id])
      if (school_ids.length > 0) {
        for (const schoolId of school_ids) {
          await run(
            'INSERT INTO person_schools (person_id, school_id) VALUES (?, ?)',
            [id, schoolId]
          )
        }
      }
    }

    // Handle certification status change
    if (is_fc_certified && !existing.is_fc_certified) {
      // Newly certified - create certification record
      const existingCert = await get('SELECT * FROM certifications WHERE person_id = ?', [id])
      if (!existingCert) {
        await run(
          'INSERT INTO certifications (person_id, background_check_status) VALUES (?, ?)',
          [id, 'pending']
        )
      }
    }

    // Update family relationships
    if (family_member_ids !== undefined) {
      // Delete existing relationships where this person is person_id
      await run('DELETE FROM family_relationships WHERE person_id = ?', [id])
      // Also delete reverse relationships where this person is related_person_id
      await run('DELETE FROM family_relationships WHERE related_person_id = ?', [id])

      if (family_member_ids.length > 0) {
        for (const memberId of family_member_ids) {
          // Only insert if not linking to self
          if (memberId !== parseInt(id)) {
            await run(
              'INSERT INTO family_relationships (person_id, related_person_id) VALUES (?, ?) ON CONFLICT DO NOTHING',
              [id, memberId]
            )
          }
        }
      }
    }

    const person = await get('SELECT * FROM people WHERE id = ?', [id])

    return NextResponse.json(person)
  } catch (error) {
    console.error('Error updating person:', error)
    return NextResponse.json({ error: 'Failed to update person' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params

    const existing = await get('SELECT * FROM people WHERE id = ?', [id])
    if (!existing) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 })
    }

    await run('DELETE FROM people WHERE id = ?', [id])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting person:', error)
    return NextResponse.json({ error: 'Failed to delete person' }, { status: 500 })
  }
}
