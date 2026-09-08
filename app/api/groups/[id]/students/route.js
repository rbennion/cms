import { NextResponse } from 'next/server'
import { all, get, run } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'
import { linkFamily } from '@/lib/family'
import { validateNewPerson, insertPerson } from '@/lib/people-server'

export const dynamic = 'force-dynamic'

export async function GET(request, { params }) {
  try {
    const { session, error } = await requireAuth()
    if (error) return error

    const { id } = await params

    const group = await get('SELECT id FROM groups WHERE id = ?', [id])
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    const students = await all(`
      SELECT p.id, p.first_name, p.last_name, p.email, p.phone
      FROM people p
      JOIN group_students gs ON p.id = gs.person_id
      WHERE gs.group_id = ?
      ORDER BY p.first_name, p.last_name
    `, [id])

    return NextResponse.json(students)
  } catch (error) {
    console.error('Error fetching group students:', error)
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 })
  }
}

export async function POST(request, { params }) {
  try {
    const { session, error } = await requireAuth()
    if (error) return error

    const { id } = await params
    const body = await request.json()
    const { new_person, parent_ids = [] } = body
    let { person_id } = body

    if (!person_id && !new_person) {
      return NextResponse.json({ error: 'person_id is required' }, { status: 400 })
    }

    const group = await get('SELECT id FROM groups WHERE id = ?', [id])
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    // Create-and-add: a brand new person, joined to this group and tied to
    // the parents chosen from the group page.
    if (!person_id) {
      const invalid = validateNewPerson(new_person)
      if (invalid) {
        return NextResponse.json({ error: invalid }, { status: 400 })
      }
      for (const otherId of parent_ids) {
        const exists = await get('SELECT id FROM people WHERE id = ?', [otherId])
        if (!exists) {
          return NextResponse.json({ error: 'Parent not found' }, { status: 404 })
        }
      }
      person_id = await insertPerson(new_person)
      for (const otherId of parent_ids) {
        await linkFamily(run, get, person_id, otherId, 'parent')
      }
    }

    const person = await get('SELECT id FROM people WHERE id = ?', [person_id])
    if (!person) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 })
    }

    const existing = await get(
      'SELECT id FROM group_students WHERE group_id = ? AND person_id = ?',
      [id, person_id]
    )
    if (existing) {
      return NextResponse.json({ error: 'Person is already a student in this group' }, { status: 400 })
    }

    await run(
      'INSERT INTO group_students (group_id, person_id) VALUES (?, ?)',
      [id, person_id]
    )

    return NextResponse.json({ success: true, person_id }, { status: 201 })
  } catch (error) {
    console.error('Error adding group student:', error)
    return NextResponse.json({ error: 'Failed to add student' }, { status: 500 })
  }
}
