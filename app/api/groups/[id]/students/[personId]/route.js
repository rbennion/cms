import { NextResponse } from 'next/server'
import { run } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function DELETE(request, { params }) {
  try {
    const { session, error } = await requireAuth()
    if (error) return error

    const { id, personId } = await params

    await run(
      'DELETE FROM group_students WHERE group_id = ? AND person_id = ?',
      [id, personId]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing group student:', error)
    return NextResponse.json({ error: 'Failed to remove student' }, { status: 500 })
  }
}
