import { NextResponse } from 'next/server'
import { all, run, get } from '@/lib/db'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('school_id')
    const gender = searchParams.get('gender')

    let query = `
      SELECT g.*, s.name as school_name,
        (SELECT COUNT(*) FROM group_leaders gl WHERE gl.group_id = g.id) as leader_count
      FROM groups g
      JOIN schools s ON g.school_id = s.id
      WHERE 1=1
    `
    const params = []

    if (schoolId) {
      query += ' AND g.school_id = ?'
      params.push(schoolId)
    }

    if (gender) {
      query += ' AND g.gender = ?'
      params.push(gender)
    }

    query += ' ORDER BY s.name, g.name'

    const groups = await all(query, params)

    // Get leaders for each group
    for (const group of groups) {
      const leaders = await all(`
        SELECT p.id, p.first_name, p.last_name, p.email
        FROM people p
        JOIN group_leaders gl ON p.id = gl.person_id
        WHERE gl.group_id = ?
      `, [group.id])
      group.leaders = leaders
    }

    return NextResponse.json(groups)
  } catch (error) {
    console.error('Error fetching groups:', error)
    return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { school_id, name, gender, year, meeting_location, notes, leader_ids } = body

    if (!school_id || !name || !gender) {
      return NextResponse.json({ error: 'School, name, and gender are required' }, { status: 400 })
    }

    if (!['Girls', 'Boys'].includes(gender)) {
      return NextResponse.json({ error: 'Gender must be "Girls" or "Boys"' }, { status: 400 })
    }

    // Verify school exists
    const school = await get('SELECT * FROM schools WHERE id = ?', [school_id])
    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 })
    }

    const result = await run(
      `INSERT INTO groups (school_id, name, gender, year, meeting_location, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [school_id, name, gender, year || null, meeting_location || null, notes || null]
    )

    const groupId = result.lastInsertRowid

    // Add leaders
    if (leader_ids && leader_ids.length > 0) {
      for (const leaderId of leader_ids) {
        await run(
          'INSERT INTO group_leaders (group_id, person_id) VALUES (?, ?)',
          [groupId, leaderId]
        )
      }
    }

    const group = await get('SELECT * FROM groups WHERE id = ?', [groupId])

    return NextResponse.json(group, { status: 201 })
  } catch (error) {
    console.error('Error creating group:', error)
    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 })
  }
}
