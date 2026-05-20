import { NextResponse } from 'next/server'
import { all, get, run } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

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

    const parents = await all(`
      SELECT p.id, p.first_name, p.last_name, p.email, p.phone
      FROM people p
      JOIN group_parents gp ON p.id = gp.person_id
      WHERE gp.group_id = ?
      ORDER BY p.first_name, p.last_name
    `, [id])

    return NextResponse.json(parents)
  } catch (error) {
    console.error('Error fetching group parents:', error)
    return NextResponse.json({ error: 'Failed to fetch parents' }, { status: 500 })
  }
}

export async function POST(request, { params }) {
  try {
    const { session, error } = await requireAuth()
    if (error) return error

    const { id } = await params
    const body = await request.json()
    const { person_id } = body

    if (!person_id) {
      return NextResponse.json({ error: 'person_id is required' }, { status: 400 })
    }

    const group = await get('SELECT id FROM groups WHERE id = ?', [id])
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    const person = await get('SELECT id FROM people WHERE id = ?', [person_id])
    if (!person) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 })
    }

    const existing = await get(
      'SELECT id FROM group_parents WHERE group_id = ? AND person_id = ?',
      [id, person_id]
    )
    if (existing) {
      return NextResponse.json({ error: 'Person is already a parent in this group' }, { status: 400 })
    }

    await run(
      'INSERT INTO group_parents (group_id, person_id) VALUES (?, ?)',
      [id, person_id]
    )

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('Error adding group parent:', error)
    return NextResponse.json({ error: 'Failed to add parent' }, { status: 500 })
  }
}
