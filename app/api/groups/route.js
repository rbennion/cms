import { NextResponse } from 'next/server'
import { all, run, get } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { session, error } = await requireAuth()
    if (error) return error

    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('school_id')
    const gender = searchParams.get('gender')
    const status = searchParams.get('status')
    const year = searchParams.get('year')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Build WHERE clause shared by count and data queries
    let whereClause = ' WHERE 1=1'
    const params = []

    if (schoolId) {
      whereClause += ' AND g.school_id = ?'
      params.push(schoolId)
    }

    if (gender) {
      whereClause += ' AND g.gender = ?'
      params.push(gender)
    }

    if (status) {
      whereClause += ' AND g.status = ?'
      params.push(status)
    }

    if (year) {
      whereClause += ' AND g.year = ?'
      params.push(parseInt(year, 10))
    }

    if (search) {
      whereClause += ` AND (
        g.name ILIKE ? OR
        s.name ILIKE ? OR
        pl.first_name ILIKE ? OR
        pl.last_name ILIKE ? OR
        CONCAT(pl.first_name, ' ', pl.last_name) ILIKE ?
      )`
      const searchTerm = `%${search}%`
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm)
    }

    const fromClause = `
      FROM groups g
      JOIN schools s ON g.school_id = s.id
      LEFT JOIN people pl ON g.primary_leader_id = pl.id
    `

    // Count query
    const countQuery = `SELECT COUNT(*) as total ${fromClause} ${whereClause}`
    const countResult = await all(countQuery, params)
    const total = parseInt(countResult[0]?.total || 0, 10)

    // Data query
    const dataQuery = `
      SELECT g.*, s.name as school_name,
        pl.first_name as primary_leader_first_name,
        pl.last_name as primary_leader_last_name,
        (SELECT COUNT(*) FROM group_leaders gl WHERE gl.group_id = g.id) as leader_count
      ${fromClause}
      ${whereClause}
      ORDER BY s.name, g.name
      LIMIT ? OFFSET ?
    `
    const dataParams = [...params, limit, offset]
    const groups = await all(dataQuery, dataParams)

    // Get leaders for each group
    for (const group of groups) {
      const leaders = await all(`
        SELECT p.id, p.first_name, p.last_name, p.email
        FROM people p
        JOIN group_leaders gl ON p.id = gl.person_id
        WHERE gl.group_id = ?
        ORDER BY p.first_name, p.last_name
      `, [group.id])
      group.leaders = leaders
    }

    return NextResponse.json({ data: groups, total, limit, offset })
  } catch (error) {
    console.error('Error fetching groups:', error)
    return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { session, error } = await requireAuth()
    if (error) return error

    const body = await request.json()
    const { school_id, name, gender, year, meeting_location, notes, leader_ids, primary_leader_id, status } = body

    if (!school_id || !name || !gender) {
      return NextResponse.json({ error: 'School, name, and gender are required' }, { status: 400 })
    }

    if (!['Girls', 'Boys'].includes(gender)) {
      return NextResponse.json({ error: 'Gender must be "Girls" or "Boys"' }, { status: 400 })
    }

    if (status && !['Active', 'Inactive', 'Alumni'].includes(status)) {
      return NextResponse.json({ error: 'Status must be "Active", "Inactive", or "Alumni"' }, { status: 400 })
    }

    // Verify school exists
    const school = await get('SELECT * FROM schools WHERE id = ?', [school_id])
    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 })
    }

    const yearInt = year ? parseInt(year, 10) : null

    const result = await run(
      `INSERT INTO groups (school_id, name, gender, year, meeting_location, notes, primary_leader_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [school_id, name, gender, yearInt, meeting_location || null, notes || null, primary_leader_id || null, status || 'Active']
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

    const group = await get(`
      SELECT g.*, s.name as school_name,
        pl.first_name as primary_leader_first_name,
        pl.last_name as primary_leader_last_name
      FROM groups g
      JOIN schools s ON g.school_id = s.id
      LEFT JOIN people pl ON g.primary_leader_id = pl.id
      WHERE g.id = ?
    `, [groupId])

    return NextResponse.json(group, { status: 201 })
  } catch (error) {
    console.error('Error creating group:', error)
    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 })
  }
}
