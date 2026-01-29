"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Users,
  Building2,
  DollarSign,
  Award,
  TrendingUp,
  ArrowRight,
  FileText
} from 'lucide-react'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/dashboard/stats')
      const data = await res.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col">
        <Header title="Dashboard" description="Overview of your CRM data" />
        <div className="p-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <Header title="Dashboard" description="Overview of your CRM data" />
      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.people?.total || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.people?.donors || 0} donors, {stats?.people?.certified || 0} certified
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Companies</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.companies?.total || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.companies?.donors || 0} donor companies
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Donations (YTD)</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats?.donations?.totalYtd || 0)}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.donations?.countYtd || 0} donations this year
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">All-Time Donations</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats?.donations?.totalAll || 0)}</div>
              <p className="text-xs text-muted-foreground">
                Total contributions received
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/people/new">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Add Person</h3>
                  <p className="text-sm text-muted-foreground">Create a new contact</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/companies/new">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Add Company</h3>
                  <p className="text-sm text-muted-foreground">Register a new organization</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/donations/new">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Add Donation</h3>
                  <p className="text-sm text-muted-foreground">Record a new contribution</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Recent Donations */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Donations</CardTitle>
                <CardDescription>Latest contributions received</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/donations">
                  View all
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {stats?.recentDonations?.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No donations yet</p>
              ) : (
                <div className="space-y-4">
                  {stats?.recentDonations?.map((donation) => (
                    <div key={donation.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {donation.first_name
                            ? `${donation.first_name} ${donation.last_name}`
                            : donation.company_name}
                        </p>
                        <p className="text-sm text-muted-foreground">{formatDate(donation.date)}</p>
                      </div>
                      <span className="font-semibold text-green-600">
                        {formatCurrency(donation.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Notes */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest notes and updates</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {stats?.recentNotes?.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No recent activity</p>
              ) : (
                <div className="space-y-4">
                  {stats?.recentNotes?.map((note) => (
                    <div key={note.id} className="flex items-start gap-3">
                      <FileText className="h-4 w-4 mt-1 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {note.title || 'Note'}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {note.entity_name} - {formatDate(note.date)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Certification Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Certification Status
            </CardTitle>
            <CardDescription>Overview of FC certification progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {stats?.certificationStats?.map((stat) => (
                <div key={stat.background_check_status} className="flex items-center gap-2">
                  <Badge
                    variant={
                      stat.background_check_status === 'approved' ? 'success' :
                      stat.background_check_status === 'pending' ? 'warning' :
                      stat.background_check_status === 'denied' ? 'destructive' :
                      'secondary'
                    }
                  >
                    {stat.background_check_status}
                  </Badge>
                  <span className="text-sm font-medium">{stat.count}</span>
                </div>
              ))}
              {(!stats?.certificationStats || stats.certificationStats.length === 0) && (
                <p className="text-muted-foreground">No certifications yet</p>
              )}
            </div>
            <Button variant="outline" className="mt-4" asChild>
              <Link href="/certifications">
                Manage Certifications
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
