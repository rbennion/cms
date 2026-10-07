import { NextResponse } from 'next/server'
import { all, run, get } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'
import { searchClause, SEARCH_FIELDS } from '@/lib/search'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { session, error } = await requireAuth()
    if (error) return error

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')

    let query = `
      SELECT s.*,
        (SELECT COUNT(*) FROM groups g WHERE g.school_id = s.id) as group_count
      FROM schools s
      WHERE 1=1
    `
    const params = []

    const matching = searchClause(search, SEARCH_FIELDS.schools)
    query += matching.sql
    params.push(...matching.params)

    query += ' ORDER BY s.name'

    const schools = await all(query, params)
    return NextResponse.json(schools)
  } catch (error) {
    console.error('Error fetching schools:', error)
    return NextResponse.json({ error: 'Failed to fetch schools' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { session, error } = await requireAuth()
    if (error) return error

    const body = await request.json()
    const { name, address, city, state, zip } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const result = await run(
      'INSERT INTO schools (name, address, city, state, zip) VALUES (?, ?, ?, ?, ?)',
      [name, address || null, city || null, state || null, zip || null]
    )

    const school = await get('SELECT * FROM schools WHERE id = ?', [result.lastInsertRowid])

    return NextResponse.json(school, { status: 201 })
  } catch (error) {
    console.error('Error creating school:', error)
    return NextResponse.json({ error: 'Failed to create school' }, { status: 500 })
  }
}
