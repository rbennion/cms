import { NextResponse } from 'next/server'
import { all, run, get } from '@/lib/db'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const backgroundCheckStatus = searchParams.get('background_check_status')
    const qprTraining = searchParams.get('qpr_gatekeeper_training')

    let query = `
      SELECT c.*, p.first_name, p.last_name, p.email, p.phone
      FROM certifications c
      JOIN people p ON c.person_id = p.id
      WHERE 1=1
    `
    const params = []

    if (backgroundCheckStatus) {
      query += ' AND c.background_check_status = ?'
      params.push(backgroundCheckStatus)
    }

    if (qprTraining !== null && qprTraining !== undefined) {
      query += ' AND c.qpr_gatekeeper_training = ?'
      params.push(qprTraining === 'true' ? 1 : 0)
    }

    query += ' ORDER BY p.last_name, p.first_name'

    const certifications = await all(query, params)

    return NextResponse.json(certifications)
  } catch (error) {
    console.error('Error fetching certifications:', error)
    return NextResponse.json({ error: 'Failed to fetch certifications' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { person_id, background_check_status, application_received, qpr_gatekeeper_training, qpr_training_date } = body

    if (!person_id) {
      return NextResponse.json({ error: 'Person ID is required' }, { status: 400 })
    }

    // Check if certification already exists
    const existing = await get('SELECT * FROM certifications WHERE person_id = ?', [person_id])
    if (existing) {
      return NextResponse.json({ error: 'Certification already exists for this person' }, { status: 400 })
    }

    const result = await run(
      `INSERT INTO certifications (person_id, background_check_status, application_received, qpr_gatekeeper_training, qpr_training_date)
       VALUES (?, ?, ?, ?, ?)`,
      [person_id, background_check_status || 'pending', application_received ? 1 : 0, qpr_gatekeeper_training ? 1 : 0, qpr_training_date || null]
    )

    // Mark person as FC certified
    await run('UPDATE people SET is_fc_certified = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [person_id])

    const certification = await get('SELECT * FROM certifications WHERE id = ?', [result.lastInsertRowid])

    return NextResponse.json(certification, { status: 201 })
  } catch (error) {
    console.error('Error creating certification:', error)
    return NextResponse.json({ error: 'Failed to create certification' }, { status: 500 })
  }
}
