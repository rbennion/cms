import { NextResponse } from 'next/server'
import { get as blobGet } from '@/lib/storage'
import { get } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

// The Training document slot was removed from the certification checklist in
// v0.9.0, so nothing uploads here any more and the upload handler has been
// removed with it. The reader stays: a small number of records still carry a
// training document from before the change, and those files must remain
// openable.

export async function GET(request, { params }) {
  const { error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const row = await get(
    'SELECT qpr_training_attachment_path FROM certifications WHERE id = ?',
    [id]
  )
  if (!row?.qpr_training_attachment_path) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const path = row.qpr_training_attachment_path
  if (path.startsWith('http')) {
    return NextResponse.redirect(path, 302)
  }

  const { stream, headers } = await blobGet(path, { access: 'private' })
  return new Response(stream, {
    headers: {
      'Content-Type': headers?.['content-type'] || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${path.split('/').pop()}"`,
      'Cache-Control': 'private, max-age=0, no-cache',
      ...(headers?.['content-length'] ? { 'Content-Length': headers['content-length'] } : {}),
    },
  })
}
