import { NextResponse } from 'next/server'
import { all, run, get } from '@/lib/db'

export async function GET() {
  try {
    const types = await all('SELECT * FROM person_types ORDER BY name')
    return NextResponse.json(types)
  } catch (error) {
    console.error('Error fetching person types:', error)
    return NextResponse.json({ error: 'Failed to fetch person types' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { name } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Check for duplicate
    const existing = await get('SELECT * FROM person_types WHERE name = ?', [name])
    if (existing) {
      return NextResponse.json({ error: 'A type with this name already exists' }, { status: 400 })
    }

    const result = await run('INSERT INTO person_types (name) VALUES (?)', [name])

    const type = await get('SELECT * FROM person_types WHERE id = ?', [result.lastInsertRowid])

    return NextResponse.json(type, { status: 201 })
  } catch (error) {
    console.error('Error creating person type:', error)
    return NextResponse.json({ error: 'Failed to create person type' }, { status: 500 })
  }
}
