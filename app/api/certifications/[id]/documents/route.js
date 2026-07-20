import { NextResponse } from 'next/server'
import { head } from '@vercel/blob'
import { get } from '@/lib/db'
import { parseAttachmentName } from '@/lib/utils'
import { requireAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

const DOC_COLUMNS = {
  application: 'application_attachment_path',
  training: 'qpr_training_attachment_path',
  'qpr-certificate': 'qpr_certificate_attachment_path',
}

// Returns display metadata (name, size, upload date) for each certification
// document. Size and date come from blob storage, so they are accurate even
// for files uploaded before original names were preserved.
export async function GET(request, { params }) {
  try {
    const { error } = await requireAuth()
    if (error) return error

    const { id } = await params

    const certification = await get('SELECT * FROM certifications WHERE id = ?', [id])
    if (!certification) {
      return NextResponse.json({ error: 'Certification not found' }, { status: 404 })
    }

    const documents = {}
    await Promise.all(
      Object.entries(DOC_COLUMNS).map(async ([type, column]) => {
        const path = certification[column]
        if (!path) {
          documents[type] = null
          return
        }
        const doc = { name: parseAttachmentName(path), size: null, uploadedAt: null }
        try {
          const meta = await head(path)
          doc.size = meta.size
          doc.uploadedAt = meta.uploadedAt
        } catch (headError) {
          console.error(`Failed to read blob metadata for ${type}:`, headError)
        }
        documents[type] = doc
      })
    )

    return NextResponse.json(documents)
  } catch (error) {
    console.error('Error fetching certification documents:', error)
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
  }
}
