import { NextResponse } from 'next/server'
import { get, run, all } from '@/lib/db'

export async function GET(request, { params }) {
  try {
    const { id } = await params

    const group = await get(`
      SELECT g.*, s.name as school_name
      FROM groups g
      JOIN schools s ON g.school_id = s.id
      WHERE g.id = ?
    `, [id])

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    // Get leaders
    const leaders = await all(`
      SELECT p.id, p.first_name, p.last_name, p.email, p.phone
      FROM people p
      JOIN group_leaders gl ON p.id = gl.person_id
      WHERE gl.group_id = ?
    `, [id])

    return NextResponse.json({ ...group, leaders })
  } catch (error) {
    console.error('Error fetching group:', error)
    return NextResponse.json({ error: 'Failed to fetch group' }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, gender, year, meeting_location, notes, leader_ids } = body

    const existing = await get('SELECT * FROM groups WHERE id = ?', [id])
    if (!existing) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    if (gender && !['Girls', 'Boys'].includes(gender)) {
      return NextResponse.json({ error: 'Gender must be "Girls" or "Boys"' }, { status: 400 })
    }

    await run(
      `UPDATE groups SET
        name = ?,
        gender = ?,
        year = ?,
        meeting_location = ?,
        notes = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        name || existing.name,
        gender || existing.gender,
        year !== undefined ? year : existing.year,
        meeting_location !== undefined ? meeting_location : existing.meeting_location,
        notes !== undefined ? notes : existing.notes,
        id
      ]
    )

    // Update leaders if provided
    if (leader_ids !== undefined) {
      await run('DELETE FROM group_leaders WHERE group_id = ?', [id])
      if (leader_ids.length > 0) {
        for (const leaderId of leader_ids) {
          await run(
            'INSERT INTO group_leaders (group_id, person_id) VALUES (?, ?)',
            [id, leaderId]
          )
        }
      }
    }

    const group = await get('SELECT * FROM groups WHERE id = ?', [id])

    return NextResponse.json(group)
  } catch (error) {
    console.error('Error updating group:', error)
    return NextResponse.json({ error: 'Failed to update group' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params

    const existing = await get('SELECT * FROM groups WHERE id = ?', [id])
    if (!existing) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    await run('DELETE FROM groups WHERE id = ?', [id])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting group:', error)
    return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 })
  }
}
