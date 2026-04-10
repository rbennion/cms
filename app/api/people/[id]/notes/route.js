import { NextResponse } from 'next/server'
import { all } from '@/lib/db'
import { requireAuth } from "@/lib/api-auth"

export const dynamic = 'force-dynamic'

export async function GET(request, { params }) {
  try {
    const { session, error } = await requireAuth()
    if (error) return error

    const { id } = await params

    const notes = await all(`
      SELECT * FROM notes
      WHERE entity_type = 'person' AND entity_id = ?
      ORDER BY date DESC
    `, [id])

    return NextResponse.json(notes)
  } catch (error) {
    console.error('Error fetching person notes:', error)
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
  }
}
