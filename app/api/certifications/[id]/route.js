import { NextResponse } from 'next/server'
import { get, run } from '@/lib/db'

export async function GET(request, { params }) {
  try {
    const { id } = await params

    // Check if id is a certification ID or person ID
    let certification = await get(`
      SELECT c.*, p.first_name, p.last_name, p.email, p.phone
      FROM certifications c
      JOIN people p ON c.person_id = p.id
      WHERE c.id = ? OR c.person_id = ?
    `, [id, id])

    if (!certification) {
      return NextResponse.json({ error: 'Certification not found' }, { status: 404 })
    }

    return NextResponse.json(certification)
  } catch (error) {
    console.error('Error fetching certification:', error)
    return NextResponse.json({ error: 'Failed to fetch certification' }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { background_check_status, application_received, training_complete } = body

    const existing = await get('SELECT * FROM certifications WHERE id = ?', [id])
    if (!existing) {
      return NextResponse.json({ error: 'Certification not found' }, { status: 404 })
    }

    await run(
      `UPDATE certifications SET
        background_check_status = ?,
        application_received = ?,
        training_complete = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        background_check_status || existing.background_check_status,
        application_received !== undefined ? (application_received ? 1 : 0) : existing.application_received,
        training_complete !== undefined ? (training_complete ? 1 : 0) : existing.training_complete,
        id
      ]
    )

    const certification = await get('SELECT * FROM certifications WHERE id = ?', [id])

    return NextResponse.json(certification)
  } catch (error) {
    console.error('Error updating certification:', error)
    return NextResponse.json({ error: 'Failed to update certification' }, { status: 500 })
  }
}
