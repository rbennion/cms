import { NextResponse } from 'next/server'
import { get, run } from '@/lib/db'

export async function GET(request, { params }) {
  try {
    const { id } = await params

    const note = await get('SELECT * FROM notes WHERE id = ?', [id])

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    return NextResponse.json(note)
  } catch (error) {
    console.error('Error fetching note:', error)
    return NextResponse.json({ error: 'Failed to fetch note' }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { title, content, date } = body

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    const existing = await get('SELECT * FROM notes WHERE id = ?', [id])
    if (!existing) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    await run(
      'UPDATE notes SET title = ?, content = ?, date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [title || null, content, date || existing.date, id]
    )

    const note = await get('SELECT * FROM notes WHERE id = ?', [id])

    return NextResponse.json(note)
  } catch (error) {
    console.error('Error updating note:', error)
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params

    const existing = await get('SELECT * FROM notes WHERE id = ?', [id])
    if (!existing) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    await run('DELETE FROM notes WHERE id = ?', [id])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting note:', error)
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 })
  }
}
