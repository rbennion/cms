import { NextResponse } from 'next/server'
import { all } from '@/lib/db'

export async function GET(request, { params }) {
  try {
    const { id } = await params

    const notes = await all(`
      SELECT * FROM notes
      WHERE entity_type = 'company' AND entity_id = ?
      ORDER BY date DESC
    `, [id])

    return NextResponse.json(notes)
  } catch (error) {
    console.error('Error fetching company notes:', error)
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
  }
}
