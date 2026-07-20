import { NextResponse } from 'next/server'
import { all, run, get } from '@/lib/db'
import { attachBgExpiry } from '@/lib/certifications-server'
import { requireAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { session, error } = await requireAuth()
    if (error) return error

    const { searchParams } = new URL(request.url)
    const backgroundCheckStatus = searchParams.get('background_check_status')
    const qprTraining = searchParams.get('qpr_gatekeeper_training')
    const search = searchParams.get('search')

    let query = `
      SELECT c.*, p.first_name, p.last_name, p.email, p.phone
      FROM certifications c
      JOIN people p ON c.person_id = p.id
      WHERE 1=1
    `
    const params = []

    if (search) {
      query += ' AND (p.first_name ILIKE ? OR p.last_name ILIKE ? OR p.email ILIKE ?)'
      const searchTerm = `%${search}%`
      params.push(searchTerm, searchTerm, searchTerm)
    }

    if (backgroundCheckStatus) {
      query += ' AND c.background_check_status = ?'
      params.push(backgroundCheckStatus)
    }

    if (qprTraining !== null && qprTraining !== undefined) {
      query += ' AND c.qpr_gatekeeper_training = ?'
      params.push(qprTraining === 'true' ? 1 : 0)
    }

    query += ' ORDER BY p.last_name, p.first_name'

    const certifications = await attachBgExpiry(await all(query, params))

    return NextResponse.json(certifications)
  } catch (error) {
    console.error('Error fetching certifications:', error)
    return NextResponse.json({ error: 'Failed to fetch certifications' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { session, error } = await requireAuth()
    if (error) return error

    const body = await request.json()
    const { person_id, background_check_status, background_check_date, application_received, qpr_gatekeeper_training, qpr_training_date, qpr_training_renewal_date } = body

    if (!person_id) {
      return NextResponse.json({ error: 'Person ID is required' }, { status: 400 })
    }

    const person = await get('SELECT id FROM people WHERE id = ?', [person_id])
    if (!person) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 })
    }

    // Upsert: one certification checklist per person. Fields left undefined
    // keep their existing values. background_check_passed is derived from the
    // status so the two columns can never disagree.
    const existing = await get('SELECT * FROM certifications WHERE person_id = ?', [person_id])

    if (existing) {
      const status = background_check_status || existing.background_check_status || 'pending'
      await run(
        `UPDATE certifications SET
          background_check_status = ?,
          background_check_passed = ?,
          background_check_date = ?,
          application_received = ?,
          qpr_gatekeeper_training = ?,
          qpr_training_date = ?,
          qpr_training_renewal_date = ?,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          status,
          status === 'approved',
          background_check_date !== undefined ? background_check_date : existing.background_check_date,
          application_received !== undefined ? (application_received ? 1 : 0) : existing.application_received,
          qpr_gatekeeper_training !== undefined ? (qpr_gatekeeper_training ? 1 : 0) : existing.qpr_gatekeeper_training,
          qpr_training_date !== undefined ? qpr_training_date : existing.qpr_training_date,
          qpr_training_renewal_date !== undefined ? qpr_training_renewal_date : existing.qpr_training_renewal_date,
          existing.id
        ]
      )
      const certification = await attachBgExpiry(await get('SELECT * FROM certifications WHERE id = ?', [existing.id]))
      return NextResponse.json(certification)
    }

    const status = background_check_status || 'pending'
    const result = await run(
      `INSERT INTO certifications (person_id, background_check_status, background_check_passed, background_check_date, application_received, qpr_gatekeeper_training, qpr_training_date, qpr_training_renewal_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [person_id, status, status === 'approved', background_check_date || null, application_received ? 1 : 0, qpr_gatekeeper_training ? 1 : 0, qpr_training_date || null, qpr_training_renewal_date || null]
    )

    const certification = await attachBgExpiry(await get('SELECT * FROM certifications WHERE id = ?', [result.lastInsertRowid]))

    return NextResponse.json(certification, { status: 201 })
  } catch (error) {
    console.error('Error creating certification:', error)
    return NextResponse.json({ error: 'Failed to create certification' }, { status: 500 })
  }
}
