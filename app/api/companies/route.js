import { NextResponse } from 'next/server'
import { all, run, get } from '@/lib/db'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const isDonor = searchParams.get('is_donor')
    const sortBy = searchParams.get('sort_by') || 'name'
    const sortOrder = searchParams.get('sort_order') || 'asc'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    let query = 'SELECT * FROM companies WHERE 1=1'
    const params = []

    if (search) {
      query += ' AND name LIKE ?'
      params.push(`%${search}%`)
    }

    if (isDonor !== null && isDonor !== undefined) {
      query += ' AND is_donor = ?'
      params.push(isDonor === 'true' ? 1 : 0)
    }

    // Get total count
    const countResult = await get(query.replace('SELECT *', 'SELECT COUNT(*) as count'), params)
    const total = countResult?.count || 0

    const validSortColumns = ['name', 'created_at', 'updated_at']
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'name'
    const order = sortOrder.toLowerCase() === 'desc' ? 'DESC' : 'ASC'
    query += ` ORDER BY ${sortColumn} ${order}`
    query += ' LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const companies = await all(query, params)

    return NextResponse.json({
      data: companies,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching companies:', error)
    return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { name, address, city, state, zip, website, is_donor } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const result = await run(
      'INSERT INTO companies (name, address, city, state, zip, website, is_donor) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, address || null, city || null, state || null, zip || null, website || null, is_donor ? 1 : 0]
    )

    const company = await get('SELECT * FROM companies WHERE id = ?', [result.lastInsertRowid])

    return NextResponse.json(company, { status: 201 })
  } catch (error) {
    console.error('Error creating company:', error)
    return NextResponse.json({ error: 'Failed to create company' }, { status: 500 })
  }
}
