import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
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

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'documents')
    await mkdir(uploadDir, { recursive: true })

    const filename = generateUniqueFilename(file.name)
    const filepath = path.join(uploadDir, filename)

    await writeFile(filepath, buffer)

    const attachmentPath = `/uploads/documents/${filename}`

    await run(
      'UPDATE certifications SET training_attachment_path = ?, training_complete = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [attachmentPath, id]
    )

    return NextResponse.json({ training_attachment_path: attachmentPath })
  } catch (error) {
    console.error('Error uploading training document:', error)
    return NextResponse.json({ error: 'Failed to upload training document' }, { status: 500 })
  }
}
