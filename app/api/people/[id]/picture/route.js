import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { get, run } from '@/lib/db'
import { generateUniqueFilename } from '@/lib/utils'

export async function POST(request, { params }) {
  try {
    const { id } = await params

    const person = await get('SELECT * FROM people WHERE id = ?', [id])
    if (!person) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Check file size (5MB limit)
    if (buffer.length > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum size is 5MB' }, { status: 400 })
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP' }, { status: 400 })
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'pictures')
    await mkdir(uploadDir, { recursive: true })

    const filename = generateUniqueFilename(file.name)
    const filepath = path.join(uploadDir, filename)

    await writeFile(filepath, buffer)

    const picturePath = `/uploads/pictures/${filename}`

    await run('UPDATE people SET picture_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [picturePath, id])

    return NextResponse.json({ picture_path: picturePath })
  } catch (error) {
    console.error('Error uploading picture:', error)
    return NextResponse.json({ error: 'Failed to upload picture' }, { status: 500 })
  }
}
