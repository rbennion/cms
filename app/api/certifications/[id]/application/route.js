import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { get, run } from '@/lib/db'
import { generateUniqueFilename } from '@/lib/utils'

export async function POST(request, { params }) {
  try {
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

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Check file size (10MB limit)
    if (buffer.length > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB' }, { status: 400 })
    }

    const filename = generateUniqueFilename(file.name)
    const blob = await put(`documents/${filename}`, buffer, { access: 'public' })

    await run(
      'UPDATE certifications SET application_attachment_path = ?, application_received = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [blob.url, id]
    )

    return NextResponse.json({ application_attachment_path: blob.url })
  } catch (error) {
    console.error('Error uploading application:', error)
    return NextResponse.json({ error: 'Failed to upload application' }, { status: 500 })
  }
}
