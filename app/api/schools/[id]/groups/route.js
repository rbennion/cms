import { NextResponse } from 'next/server'
import { all, get } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function GET(request, { params }) {
  try {
    const { session, error } = await requireAuth()
    if (error) return error

    const { id } = await params

    // Verify school exists
    const school = await get('SELECT * FROM schools WHERE id = ?', [id])
    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 })
    }

    const groups = await all(`
      SELECT g.*,
        pl.first_name as primary_leader_first_name,
        pl.last_name as primary_leader_last_name,
        (
          (SELECT COUNT(*) FROM group_leaders gl WHERE gl.group_id = g.id)
          + (CASE WHEN g.primary_leader_id IS NOT NULL THEN 1 ELSE 0 END)
        ) as leader_count
      FROM groups g
      LEFT JOIN people pl ON pl.id = g.primary_leader_id
      WHERE g.school_id = ?
      ORDER BY g.gender, g.name
    `, [id])

    // Get support leaders for each group
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
    console.error('Error fetching school groups:', error)
    return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 })
  }
}
