import { NextResponse } from 'next/server'
import { get, run } from '@/lib/db'

export async function GET(request, { params }) {
  try {
    const { id } = await params

    const donation = await get(`
      SELECT d.*,
        p.first_name, p.last_name, p.email as person_email,
        c.name as company_name
      FROM donations d
      LEFT JOIN people p ON d.person_id = p.id
      LEFT JOIN companies c ON d.company_id = c.id
      WHERE d.id = ?
    `, [id])

    if (!donation) {
      return NextResponse.json({ error: 'Donation not found' }, { status: 404 })
    }

    return NextResponse.json(donation)
  } catch (error) {
    console.error('Error fetching donation:', error)
    return NextResponse.json({ error: 'Failed to fetch donation' }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { amount, date, note, person_id, company_id } = body

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 })
    }

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 })
    }

    const existing = await get('SELECT * FROM donations WHERE id = ?', [id])
    if (!existing) {
      return NextResponse.json({ error: 'Donation not found' }, { status: 404 })
    }

    await run(
      `UPDATE donations SET amount = ?, date = ?, note = ?, person_id = ?, company_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [amount, date, note || null, person_id || null, company_id || null, id]
    )

    // Update donor status if donor changed
    if (person_id) {
      await run('UPDATE people SET is_donor = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [person_id])
    }
    if (company_id) {
      await run('UPDATE companies SET is_donor = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [company_id])
    }

    const donation = await get('SELECT * FROM donations WHERE id = ?', [id])

    return NextResponse.json(donation)
  } catch (error) {
    console.error('Error updating donation:', error)
    return NextResponse.json({ error: 'Failed to update donation' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params

    const existing = await get('SELECT * FROM donations WHERE id = ?', [id])
    if (!existing) {
      return NextResponse.json({ error: 'Donation not found' }, { status: 404 })
    }

    await run('DELETE FROM donations WHERE id = ?', [id])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting donation:', error)
    return NextResponse.json({ error: 'Failed to delete donation' }, { status: 500 })
  }
}
