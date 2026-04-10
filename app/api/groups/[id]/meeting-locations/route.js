import { NextResponse } from 'next/server'
import { all, run, get } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function GET(request, { params }) {
  try {
    const { session, error } = await requireAuth()
    if (error) return error

    const { id } = await params

    // Verify group exists
    const group = await get('SELECT * FROM groups WHERE id = ?', [id])
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    const locations = await all(`
      SELECT * FROM group_meeting_locations
      WHERE group_id = ?
      ORDER BY is_primary DESC, name
    `, [id])

    return NextResponse.json(locations)
  } catch (error) {
    console.error('Error fetching meeting locations:', error)
    return NextResponse.json({ error: 'Failed to fetch meeting locations' }, { status: 500 })
  }
}

export async function POST(request, { params }) {
  try {
    const { session, error } = await requireAuth()
    if (error) return error

    const { id } = await params
    const body = await request.json()
    const { name, address, city, state, zip, is_primary } = body

    // Verify group exists
    const group = await get('SELECT * FROM groups WHERE id = ?', [id])
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    // If setting as primary, unset any existing primary
    if (is_primary) {
      await run(
        'UPDATE group_meeting_locations SET is_primary = FALSE WHERE group_id = ?',
        [id]
      )
    }

    const result = await run(
      `INSERT INTO group_meeting_locations (group_id, name, address, city, state, zip, is_primary)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, name || null, address || null, city || null, state || null, zip || null, is_primary || false]
    )

    const location = await get('SELECT * FROM group_meeting_locations WHERE id = ?', [result.lastInsertRowid])

    return NextResponse.json(location, { status: 201 })
  } catch (error) {
    console.error('Error adding meeting location:', error)
    return NextResponse.json({ error: 'Failed to add meeting location' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { session, error } = await requireAuth()
    if (error) return error

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const locationId = searchParams.get('location_id')

    if (!locationId) {
      return NextResponse.json({ error: 'location_id is required' }, { status: 400 })
    }

    const location = await get(
      'SELECT * FROM group_meeting_locations WHERE id = ? AND group_id = ?',
      [locationId, id]
    )
    if (!location) {
      return NextResponse.json({ error: 'Meeting location not found' }, { status: 404 })
    }

    await run('DELETE FROM group_meeting_locations WHERE id = ?', [locationId])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing meeting location:', error)
    return NextResponse.json({ error: 'Failed to remove meeting location' }, { status: 500 })
  }
}
