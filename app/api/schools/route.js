import { NextResponse } from 'next/server'
import { all, run, get } from '@/lib/db'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')

    let query = 'SELECT * FROM schools WHERE 1=1'
    const params = []

    if (search) {
      query += ' AND (name ILIKE ? OR city ILIKE ?)'
      const searchTerm = `%${search}%`
      params.push(searchTerm, searchTerm)
    }

    query += ' ORDER BY name'

    const schools = await all(query, params)
    return NextResponse.json(schools)
  } catch (error) {
    console.error('Error fetching schools:', error)
    return NextResponse.json({ error: 'Failed to fetch schools' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { name, address, city, state, zip } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const result = await run(
      'INSERT INTO schools (name, address, city, state, zip) VALUES (?, ?, ?, ?, ?)',
      [name, address || null, city || null, state || null, zip || null]
    )

    const school = await get('SELECT * FROM schools WHERE id = ?', [result.lastInsertRowid])

    return NextResponse.json(school, { status: 201 })
  } catch (error) {
    console.error('Error creating school:', error)
    return NextResponse.json({ error: 'Failed to create school' }, { status: 500 })
  }
}
