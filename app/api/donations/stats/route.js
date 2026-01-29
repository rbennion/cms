import { NextResponse } from 'next/server'
import { get, all } from '@/lib/db'

export async function GET() {
  try {
    const currentYear = new Date().getFullYear()
    const yearStart = `${currentYear}-01-01`

    // Total donations all time
    const totalAll = await get('SELECT COALESCE(SUM(amount), 0) as total FROM donations')

    // Total donations YTD
    const totalYtd = await get('SELECT COALESCE(SUM(amount), 0) as total FROM donations WHERE date >= ?', [yearStart])

    // Donations count
    const countAll = await get('SELECT COUNT(*) as count FROM donations')
    const countYtd = await get('SELECT COUNT(*) as count FROM donations WHERE date >= ?', [yearStart])

    // Monthly donations for current year
    const monthlyDonations = await all(`
      SELECT
        strftime('%Y-%m', date) as month,
        SUM(amount) as total,
        COUNT(*) as count
      FROM donations
      WHERE date >= ?
      GROUP BY strftime('%Y-%m', date)
      ORDER BY month
    `, [yearStart])

    // Top donors (people)
    const topPeopleDonors = await all(`
      SELECT
        p.id, p.first_name, p.last_name,
        SUM(d.amount) as total_donated,
        COUNT(d.id) as donation_count
      FROM donations d
      JOIN people p ON d.person_id = p.id
      GROUP BY p.id
      ORDER BY total_donated DESC
      LIMIT 10
    `)

    // Top donors (companies)
    const topCompanyDonors = await all(`
      SELECT
        c.id, c.name,
        SUM(d.amount) as total_donated,
        COUNT(d.id) as donation_count
      FROM donations d
      JOIN companies c ON d.company_id = c.id
      GROUP BY c.id
      ORDER BY total_donated DESC
      LIMIT 10
    `)

    // Recent donations
    const recentDonations = await all(`
      SELECT d.*,
        p.first_name, p.last_name,
        c.name as company_name
      FROM donations d
      LEFT JOIN people p ON d.person_id = p.id
      LEFT JOIN companies c ON d.company_id = c.id
      ORDER BY d.date DESC, d.created_at DESC
      LIMIT 10
    `)

    return NextResponse.json({
      totalAll: totalAll?.total || 0,
      totalYtd: totalYtd?.total || 0,
      countAll: countAll?.count || 0,
      countYtd: countYtd?.count || 0,
      monthlyDonations,
      topPeopleDonors,
      topCompanyDonors,
      recentDonations
    })
  } catch (error) {
    console.error('Error fetching donation stats:', error)
    return NextResponse.json({ error: 'Failed to fetch donation statistics' }, { status: 500 })
  }
}
