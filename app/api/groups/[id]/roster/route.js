import { NextResponse } from 'next/server'
import { all, get } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'
import { buildRosterRows, rosterToCsv, rosterFilename } from '@/lib/group-roster'

export const dynamic = 'force-dynamic'

// The group's family roster as a CSV download.
export async function GET(request, { params }) {
  try {
    const { session, error } = await requireAuth()
    if (error) return error

    const { id } = await params

    const group = await get('SELECT id, name FROM groups WHERE id = ?', [id])
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    const students = await all(`
      SELECT p.id, p.first_name, p.last_name, p.email, p.phone
      FROM people p
      JOIN group_students gs ON p.id = gs.person_id
      WHERE gs.group_id = ?
    `, [id])

    const parents = await all(`
      SELECT p.id, p.first_name, p.last_name, p.email, p.phone
      FROM people p
      JOIN group_parents gp ON p.id = gp.person_id
      WHERE gp.group_id = ?
    `, [id])

    // A student's parents: links labeled parent (or child, read from the
    // parent's side). Links made before labels existed count too, when the
    // other person is one of this group's parents.
    const links = await all(`
      SELECT DISTINCT gs.person_id AS student_id,
             p.id, p.first_name, p.last_name, p.email, p.phone
      FROM group_students gs
      JOIN family_relationships fr
        ON fr.person_id = gs.person_id OR fr.related_person_id = gs.person_id
      JOIN people p
        ON p.id = CASE WHEN fr.person_id = gs.person_id THEN fr.related_person_id ELSE fr.person_id END
      WHERE gs.group_id = ?
        AND (
          (fr.person_id = gs.person_id AND fr.relationship = 'parent')
          OR (fr.related_person_id = gs.person_id AND fr.relationship = 'child')
          OR (fr.relationship IS NULL
              AND p.id IN (SELECT person_id FROM group_parents WHERE group_id = ?))
        )
    `, [id, id])

    const csv = rosterToCsv(buildRosterRows({ students, parents, links }))

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${rosterFilename(group.name)}"`,
      },
    })
  } catch (error) {
    console.error('Error exporting group roster:', error)
    return NextResponse.json({ error: 'Failed to export roster' }, { status: 500 })
  }
}
