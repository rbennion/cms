import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'
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

    // Check file size (10MB limit)
    if (buffer.length > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB' }, { status: 400 })
    }

    const filename = generateUniqueFilename(file.name)
    const blob = await put(`documents/${filename}`, buffer, { access: 'public' })

    await run(
      'UPDATE certifications SET qpr_training_attachment_path = ?, qpr_gatekeeper_training = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [blob.url, id]
    )

    return NextResponse.json({ qpr_training_attachment_path: blob.url })
  } catch (error) {
    console.error('Error uploading training document:', error)
    return NextResponse.json({ error: 'Failed to upload training document' }, { status: 500 })
  }
}
