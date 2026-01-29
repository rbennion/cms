import { NextResponse } from 'next/server'
import { all, run, get } from '@/lib/db'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('entity_type')
    const entityId = searchParams.get('entity_id')

    let query = 'SELECT * FROM notes WHERE 1=1'
    const params = []

    if (entityType) {
      query += ' AND entity_type = ?'
      params.push(entityType)
    }

    if (entityId) {
      query += ' AND entity_id = ?'
      params.push(entityId)
    }

    query += ' ORDER BY date DESC, created_at DESC'

    const notes = await all(query, params)

    return NextResponse.json(notes)
  } catch (error) {
    console.error('Error fetching notes:', error)
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { title, content, date, entity_type, entity_id } = body

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    if (!entity_type || !['person', 'company'].includes(entity_type)) {
      return NextResponse.json({ error: 'Valid entity type is required (person or company)' }, { status: 400 })
    }

    if (!entity_id) {
      return NextResponse.json({ error: 'Entity ID is required' }, { status: 400 })
    }

    const result = await run(
      'INSERT INTO notes (title, content, date, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)',
      [title || null, content, date || new Date().toISOString().split('T')[0], entity_type, entity_id]
    )

    const note = await get('SELECT * FROM notes WHERE id = ?', [result.lastInsertRowid])

    return NextResponse.json(note, { status: 201 })
  } catch (error) {
    console.error('Error creating note:', error)
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 })
  }
}
