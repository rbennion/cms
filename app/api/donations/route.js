import { NextResponse } from 'next/server'
import { all, run, get } from '@/lib/db'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const minAmount = searchParams.get('min_amount')
    const maxAmount = searchParams.get('max_amount')
    const donorType = searchParams.get('donor_type')
    const sortBy = searchParams.get('sort_by') || 'date'
    const sortOrder = searchParams.get('sort_order') || 'desc'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    let query = `
      SELECT d.*,
        p.first_name, p.last_name, p.email as person_email,
        c.name as company_name
      FROM donations d
      LEFT JOIN people p ON d.person_id = p.id
      LEFT JOIN companies c ON d.company_id = c.id
      WHERE 1=1
    `
    const params = []

    if (search) {
      query += ` AND (d.note LIKE ? OR p.first_name LIKE ? OR p.last_name LIKE ? OR c.name LIKE ?)`
      const searchTerm = `%${search}%`
      params.push(searchTerm, searchTerm, searchTerm, searchTerm)
    }

    if (startDate) {
      query += ' AND d.date >= ?'
      params.push(startDate)
    }

    if (endDate) {
      query += ' AND d.date <= ?'
      params.push(endDate)
    }

    if (minAmount) {
      query += ' AND d.amount >= ?'
      params.push(parseFloat(minAmount))
    }

    if (maxAmount) {
      query += ' AND d.amount <= ?'
      params.push(parseFloat(maxAmount))
    }

    if (donorType === 'person') {
      query += ' AND d.person_id IS NOT NULL'
    } else if (donorType === 'company') {
      query += ' AND d.company_id IS NOT NULL'
    }

    // Get total count
    const countResult = await get(query.replace(/SELECT d\.\*,[\s\S]*?FROM/, 'SELECT COUNT(*) as count FROM'), params)
    const total = countResult?.count || 0

    const validSortColumns = ['date', 'amount', 'created_at']
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'date'
    const order = sortOrder.toLowerCase() === 'desc' ? 'DESC' : 'ASC'
    query += ` ORDER BY d.${sortColumn} ${order}`
    query += ' LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const donations = await all(query, params)

    return NextResponse.json({
      data: donations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching donations:', error)
    return NextResponse.json({ error: 'Failed to fetch donations' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { amount, date, note, person_id, company_id } = body

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 })
    }

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 })
    }

    if (!person_id && !company_id) {
      return NextResponse.json({ error: 'Either person or company must be specified' }, { status: 400 })
    }

    const result = await run(
      'INSERT INTO donations (amount, date, note, person_id, company_id) VALUES (?, ?, ?, ?, ?)',
      [amount, date, note || null, person_id || null, company_id || null]
    )

    // Mark the person/company as a donor
    if (person_id) {
      await run('UPDATE people SET is_donor = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [person_id])
    }
    if (company_id) {
      await run('UPDATE companies SET is_donor = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [company_id])
    }

    const donation = await get('SELECT * FROM donations WHERE id = ?', [result.lastInsertRowid])

    return NextResponse.json(donation, { status: 201 })
  } catch (error) {
    console.error('Error creating donation:', error)
    return NextResponse.json({ error: 'Failed to create donation' }, { status: 500 })
  }
}
