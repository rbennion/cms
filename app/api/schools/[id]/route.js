import { NextResponse } from 'next/server'
import { get, run } from '@/lib/db'

export async function GET(request, { params }) {
  try {
    const { id } = await params

    const school = await get('SELECT * FROM schools WHERE id = ?', [id])

    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 })
    }

    return NextResponse.json(school)
  } catch (error) {
    console.error('Error fetching school:', error)
    return NextResponse.json({ error: 'Failed to fetch school' }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, address, city, state, zip } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const existing = await get('SELECT * FROM schools WHERE id = ?', [id])
    if (!existing) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 })
    }

    await run(
      'UPDATE schools SET name = ?, address = ?, city = ?, state = ?, zip = ? WHERE id = ?',
      [name, address || null, city || null, state || null, zip || null, id]
    )

    const school = await get('SELECT * FROM schools WHERE id = ?', [id])

    return NextResponse.json(school)
  } catch (error) {
    console.error('Error updating school:', error)
    return NextResponse.json({ error: 'Failed to update school' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params

    const existing = await get('SELECT * FROM schools WHERE id = ?', [id])
    if (!existing) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 })
    }

    await run('DELETE FROM schools WHERE id = ?', [id])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting school:', error)
    return NextResponse.json({ error: 'Failed to delete school' }, { status: 500 })
  }
}
