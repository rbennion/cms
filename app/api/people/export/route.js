import { NextResponse } from 'next/server'
import { all } from '@/lib/db'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'csv'
    const search = searchParams.get('search')
    const type = searchParams.get('type')
    const schoolId = searchParams.get('school_id')
    const companyId = searchParams.get('company_id')
    const isFcCertified = searchParams.get('is_fc_certified')

    let query = `
      SELECT p.*, s.name as school_name, c.name as company_name
      FROM people p
      LEFT JOIN schools s ON p.school_id = s.id
      LEFT JOIN companies c ON p.company_id = c.id
      WHERE 1=1
    `
    const params = []

    if (search) {
      query += ` AND (p.first_name ILIKE $${params.length + 1} OR p.last_name ILIKE $${params.length + 1} OR p.email ILIKE $${params.length + 1})`
      params.push(`%${search}%`)
    }

    if (type && type !== 'all') {
      query += ` AND p.type = $${params.length + 1}`
      params.push(type)
    }

    if (schoolId && schoolId !== 'all') {
      query += ` AND p.school_id = $${params.length + 1}`
      params.push(schoolId)
    }

    if (companyId && companyId !== 'all') {
      query += ` AND p.company_id = $${params.length + 1}`
      params.push(companyId)
    }

    if (isFcCertified === 'true') {
      query += ' AND p.is_fc_certified = true'
    } else if (isFcCertified === 'false') {
      query += ' AND p.is_fc_certified = false'
    }

    query += ' ORDER BY p.last_name, p.first_name'

    const people = await all(query, params)

    if (format === 'email') {
      const emails = people
        .filter(p => p.email)
        .map(p => p.email)
      return NextResponse.json({ emails })
    }

    // CSV format
    const headers = [
      'ID',
      'First Name',
      'Last Name',
      'Email',
      'Phone',
      'Type',
      'School',
      'Company',
      'Is FC Certified',
      'Notes',
      'Created At'
    ]

    const rows = people.map(p => [
      p.id,
      p.first_name || '',
      p.last_name || '',
      p.email || '',
      p.phone || '',
      p.type || '',
      p.school_name || '',
      p.company_name || '',
      p.is_fc_certified ? 'Yes' : 'No',
      (p.notes || '').replace(/"/g, '""'),
      p.created_at || ''
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="people-export-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })
  } catch (error) {
    console.error('Error exporting people:', error)
    return NextResponse.json({ error: 'Failed to export people' }, { status: 500 })
  }
}
