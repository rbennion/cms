import { NextResponse } from 'next/server'
import { get, run, all } from '@/lib/db'

export async function GET(request, { params }) {
  try {
    const { id } = await params

    const company = await get('SELECT * FROM companies WHERE id = ?', [id])

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Get associated people
    const people = await all(`
      SELECT p.*, pc.is_primary
      FROM people p
      JOIN person_companies pc ON p.id = pc.person_id
      WHERE pc.company_id = ?
      ORDER BY pc.is_primary DESC, p.last_name
    `, [id])

    // Get recent donations
    const donations = await all(`
      SELECT * FROM donations
      WHERE company_id = ?
      ORDER BY date DESC
      LIMIT 10
    `, [id])

    // Get notes
    const notes = await all(`
      SELECT * FROM notes
      WHERE entity_type = 'company' AND entity_id = ?
      ORDER BY date DESC
    `, [id])

    return NextResponse.json({
      ...company,
      people,
      donations,
      notes
    })
  } catch (error) {
    console.error('Error fetching company:', error)
    return NextResponse.json({ error: 'Failed to fetch company' }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, address, city, state, zip, website, is_donor } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const existing = await get('SELECT * FROM companies WHERE id = ?', [id])
    if (!existing) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    await run(
      `UPDATE companies SET name = ?, address = ?, city = ?, state = ?, zip = ?, website = ?, is_donor = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [name, address || null, city || null, state || null, zip || null, website || null, is_donor ? 1 : 0, id]
    )

    const company = await get('SELECT * FROM companies WHERE id = ?', [id])

    return NextResponse.json(company)
  } catch (error) {
    console.error('Error updating company:', error)
    return NextResponse.json({ error: 'Failed to update company' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params

    const existing = await get('SELECT * FROM companies WHERE id = ?', [id])
    if (!existing) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    await run('DELETE FROM companies WHERE id = ?', [id])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting company:', error)
    return NextResponse.json({ error: 'Failed to delete company' }, { status: 500 })
  }
}
