import { NextResponse } from 'next/server'
import { get, run } from '@/lib/db'

export async function GET(request, { params }) {
  try {
    const { id } = await params

    const type = await get('SELECT * FROM person_types WHERE id = ?', [id])

    if (!type) {
      return NextResponse.json({ error: 'Person type not found' }, { status: 404 })
    }

    return NextResponse.json(type)
  } catch (error) {
    console.error('Error fetching person type:', error)
    return NextResponse.json({ error: 'Failed to fetch person type' }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const existing = await get('SELECT * FROM person_types WHERE id = ?', [id])
    if (!existing) {
      return NextResponse.json({ error: 'Person type not found' }, { status: 404 })
    }

    // Check for duplicate name
    const duplicate = await get('SELECT * FROM person_types WHERE name = ? AND id != ?', [name, id])
    if (duplicate) {
      return NextResponse.json({ error: 'A type with this name already exists' }, { status: 400 })
    }

    await run('UPDATE person_types SET name = ? WHERE id = ?', [name, id])

    const type = await get('SELECT * FROM person_types WHERE id = ?', [id])

    return NextResponse.json(type)
  } catch (error) {
    console.error('Error updating person type:', error)
    return NextResponse.json({ error: 'Failed to update person type' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params

    const existing = await get('SELECT * FROM person_types WHERE id = ?', [id])
    if (!existing) {
      return NextResponse.json({ error: 'Person type not found' }, { status: 404 })
    }

    await run('DELETE FROM person_types WHERE id = ?', [id])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting person type:', error)
    return NextResponse.json({ error: 'Failed to delete person type' }, { status: 500 })
  }
}
