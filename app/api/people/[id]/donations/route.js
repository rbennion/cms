import { NextResponse } from 'next/server'
import { all } from '@/lib/db'

export async function GET(request, { params }) {
  try {
    const { id } = await params

    const donations = await all(`
      SELECT * FROM donations
      WHERE person_id = ?
      ORDER BY date DESC
    `, [id])

    return NextResponse.json(donations)
  } catch (error) {
    console.error('Error fetching person donations:', error)
    return NextResponse.json({ error: 'Failed to fetch donations' }, { status: 500 })
  }
}
