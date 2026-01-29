import { NextResponse } from 'next/server'
import { all } from '@/lib/db'

export async function GET(request, { params }) {
  try {
    const { id } = await params

    const people = await all(`
      SELECT p.*, pc.is_primary
      FROM people p
      JOIN person_companies pc ON p.id = pc.person_id
      WHERE pc.company_id = ?
      ORDER BY pc.is_primary DESC, p.last_name
    `, [id])

    return NextResponse.json(people)
  } catch (error) {
    console.error('Error fetching company people:', error)
    return NextResponse.json({ error: 'Failed to fetch people' }, { status: 500 })
  }
}
