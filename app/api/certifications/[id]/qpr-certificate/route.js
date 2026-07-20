import { NextResponse } from 'next/server'
import { put, del, get as blobGet } from '@vercel/blob'
import { get, run } from '@/lib/db'
import { generateUniqueFilename } from '@/lib/utils'
import { requireAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function POST(request, { params }) {
  try {
    const { session, error } = await requireAuth()
    if (error) return error

    const { id } = await params

    const certification = await get('SELECT * FROM certifications WHERE id = ?', [id])
    if (!certification) {
      return NextResponse.json({ error: 'Certification not found' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx']
    const ext = '.' + file.name.split('.').pop().toLowerCase()
    if (!allowedTypes.includes(file.type) || !allowedExtensions.includes(ext)) {
      return NextResponse.json({ error: 'Invalid file type. Allowed: PDF, JPG, PNG, DOC, DOCX' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    if (buffer.length > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB' }, { status: 400 })
    }

    const filename = generateUniqueFilename(file.name)
    const blob = await put(`documents/${filename}`, buffer, { access: 'private' })

    await run(
      'UPDATE certifications SET qpr_certificate_attachment_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [blob.pathname, id]
    )

    // Replacing a document deletes the old file from blob storage.
    // Legacy http(s) paths (public store) are left alone.
    const oldPath = certification.qpr_certificate_attachment_path
    if (oldPath && oldPath !== blob.pathname && !oldPath.startsWith('http')) {
      try {
        await del(oldPath)
      } catch (cleanupError) {
        console.error('Failed to delete replaced QPR certificate:', cleanupError)
      }
    }

    return NextResponse.json({ qpr_certificate_attachment_path: blob.pathname })
  } catch (error) {
    console.error('Error uploading QPR certificate:', error)
    return NextResponse.json({ error: 'Failed to upload QPR certificate' }, { status: 500 })
  }
}

export async function GET(request, { params }) {
  const { error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const row = await get(
    'SELECT qpr_certificate_attachment_path FROM certifications WHERE id = ?',
    [id]
  )
  if (!row?.qpr_certificate_attachment_path) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const path = row.qpr_certificate_attachment_path
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
