import { NextResponse } from 'next/server'
import { get, all } from '@/lib/db'

export async function GET() {
  try {
    const currentYear = new Date().getFullYear()
    const yearStart = `${currentYear}-01-01`

    // People stats
    const totalPeople = await get('SELECT COUNT(*) as count FROM people')
    const totalDonors = await get('SELECT COUNT(*) as count FROM people WHERE is_donor = 1')
    const totalCertified = await get('SELECT COUNT(*) as count FROM people WHERE is_fc_certified = 1')
    const totalBoardMembers = await get('SELECT COUNT(*) as count FROM people WHERE is_board_member = 1')

    // Company stats
    const totalCompanies = await get('SELECT COUNT(*) as count FROM companies')
    const donorCompanies = await get('SELECT COUNT(*) as count FROM companies WHERE is_donor = 1')

    // Donation stats
    const totalDonationsAll = await get('SELECT COALESCE(SUM(amount), 0) as total FROM donations')
    const totalDonationsYtd = await get('SELECT COALESCE(SUM(amount), 0) as total FROM donations WHERE date >= ?', [yearStart])
    const donationCountYtd = await get('SELECT COUNT(*) as count FROM donations WHERE date >= ?', [yearStart])

    // Recent donations
    const recentDonations = await all(`
      SELECT d.*,
        p.first_name, p.last_name,
        c.name as company_name
      FROM donations d
      LEFT JOIN people p ON d.person_id = p.id
      LEFT JOIN companies c ON d.company_id = c.id
      ORDER BY d.date DESC, d.created_at DESC
      LIMIT 5
    `)

    // Recent notes
    const recentNotes = await all(`
      SELECT n.*,
        CASE
          WHEN n.entity_type = 'person' THEN (SELECT first_name || ' ' || last_name FROM people WHERE id = n.entity_id)
          WHEN n.entity_type = 'company' THEN (SELECT name FROM companies WHERE id = n.entity_id)
        END as entity_name
      FROM notes n
      ORDER BY n.date DESC, n.created_at DESC
      LIMIT 5
    `)

    // Recent people
    const recentPeople = await all(`
      SELECT * FROM people
      ORDER BY created_at DESC
      LIMIT 5
    `)

    // Certification status summary
    const certificationStats = await all(`
      SELECT
        background_check_status,
        COUNT(*) as count
      FROM certifications
      GROUP BY background_check_status
    `)

    return NextResponse.json({
      people: {
        total: totalPeople?.count || 0,
        donors: totalDonors?.count || 0,
        certified: totalCertified?.count || 0,
        boardMembers: totalBoardMembers?.count || 0
      },
      companies: {
        total: totalCompanies?.count || 0,
        donors: donorCompanies?.count || 0
      },
      donations: {
        totalAll: totalDonationsAll?.total || 0,
        totalYtd: totalDonationsYtd?.total || 0,
        countYtd: donationCountYtd?.count || 0
      },
      recentDonations,
      recentNotes,
      recentPeople,
      certificationStats
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard statistics' }, { status: 500 })
  }
}
