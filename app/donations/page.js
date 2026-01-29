"use client"

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SearchInput } from '@/components/shared/search-input'
import { Pagination } from '@/components/shared/pagination'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { DatePicker } from '@/components/shared/date-picker'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, MoreHorizontal, Pencil, Trash2, TrendingUp, DollarSign, Users } from 'lucide-react'

function DonationsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const [donations, setDonations] = useState([])
  const [stats, setStats] = useState(null)
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState(null)

  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    donor_type: searchParams.get('donor_type') || '',
    start_date: searchParams.get('start_date') || '',
    end_date: searchParams.get('end_date') || '',
  })

  useEffect(() => {
    fetchDonations()
    fetchStats()
  }, [filters, searchParams])

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/donations/stats')
      const data = await res.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const fetchDonations = async () => {
    setLoading(true)
    try {
      const page = searchParams.get('page') || 1
      const params = new URLSearchParams({
        page,
        limit: '20',
        ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
      })

      const res = await fetch(`/api/donations?${params}`)
      const data = await res.json()
      setDonations(data.data || [])
      setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 })
    } catch (error) {
      console.error('Error fetching donations:', error)
      toast({ title: 'Error', description: 'Failed to fetch donations', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    const params = new URLSearchParams(searchParams)
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.set('page', '1')
    router.push(`/donations?${params}`)
  }

  const handlePageChange = (page) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', page.toString())
    router.push(`/donations?${params}`)
  }

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/donations/${deleteId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast({ title: 'Donation deleted successfully' })
      setDeleteId(null)
      fetchDonations()
      fetchStats()
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  }

  return (
    <div className="flex flex-col">
      <Header title="Donations" description="Track and manage contributions">
        <Button asChild>
          <Link href="/donations/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Donation
          </Link>
        </Button>
      </Header>

      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total YTD</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats?.totalYtd || 0)}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.countYtd || 0} donations this year
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">All-Time Total</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats?.totalAll || 0)}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.countAll || 0} total donations
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Top Donors</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm space-y-1">
                {stats?.topPeopleDonors?.slice(0, 3).map((donor, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="truncate">{donor.first_name} {donor.last_name}</span>
                    <span className="font-medium">{formatCurrency(donor.total_donated)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <SearchInput
            placeholder="Search donations..."
            value={filters.search}
            onChange={(value) => handleFilterChange('search', value)}
            className="w-64"
          />

          <Select
            value={filters.donor_type}
            onValueChange={(value) => handleFilterChange('donor_type', value)}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Donor Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All</SelectItem>
              <SelectItem value="person">Individuals</SelectItem>
              <SelectItem value="company">Companies</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <DatePicker
              date={filters.start_date}
              onDateChange={(date) => handleFilterChange('start_date', date || '')}
              placeholder="Start date"
            />
            <span className="text-muted-foreground">to</span>
            <DatePicker
              date={filters.end_date}
              onDateChange={(date) => handleFilterChange('end_date', date || '')}
              placeholder="End date"
            />
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Donor</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Note</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : donations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No donations found
                  </TableCell>
                </TableRow>
              ) : (
                donations.map((donation) => (
                  <TableRow key={donation.id}>
                    <TableCell>{formatDate(donation.date)}</TableCell>
                    <TableCell>
                      {donation.first_name ? (
                        <Link
                          href={`/people/${donation.person_id}`}
                          className="font-medium hover:underline"
                        >
                          {donation.first_name} {donation.last_name}
                        </Link>
                      ) : (
                        <Link
                          href={`/companies/${donation.company_id}`}
                          className="font-medium hover:underline"
                        >
                          {donation.company_name}
                        </Link>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {donation.first_name ? 'Individual' : 'Company'}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {donation.note || '-'}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      {formatCurrency(donation.amount)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/donations/${donation.id}/edit`}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteId(donation.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          onPageChange={handlePageChange}
        />
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Donation"
        description="Are you sure you want to delete this donation? This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDelete}
      />
    </div>
  )
}

export default function DonationsPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <DonationsPageContent />
    </Suspense>
  )
}
