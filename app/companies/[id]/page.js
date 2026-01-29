"use client"

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { NotesList } from '@/components/notes/notes-list'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Pencil,
  Trash2,
  MapPin,
  Globe,
  Users,
  DollarSign,
  ExternalLink
} from 'lucide-react'

export default function CompanyDetailPage({ params }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showDelete, setShowDelete] = useState(false)

  useEffect(() => {
    fetchCompany()
  }, [resolvedParams.id])

  const fetchCompany = async () => {
    try {
      const res = await fetch(`/api/companies/${resolvedParams.id}`)
      if (!res.ok) throw new Error('Company not found')
      const data = await res.json()
      setCompany(data)
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      router.push('/companies')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/companies/${resolvedParams.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast({ title: 'Company deleted successfully' })
      router.push('/companies')
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col">
        <Header title="Loading..." />
        <div className="p-6">
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    )
  }

  if (!company) return null

  return (
    <div className="flex flex-col">
      <Header title={company.name}>
        <Button variant="outline" asChild>
          <Link href={`/companies/${company.id}/edit`}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Link>
        </Button>
        <Button variant="destructive" onClick={() => setShowDelete(true)}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </Header>

      <div className="p-6">
        <div className="grid gap-6 md:grid-cols-3">
          {/* Company Info Card */}
          <Card className="md:col-span-1">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <span className="text-2xl font-bold text-primary">
                    {company.name[0].toUpperCase()}
                  </span>
                </div>
                <h2 className="mt-4 text-xl font-semibold">{company.name}</h2>

                {company.is_donor && (
                  <Badge variant="success" className="mt-2">Donor Organization</Badge>
                )}
              </div>

              <div className="mt-6 space-y-4">
                {company.website && (
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm hover:underline flex items-center gap-1"
                    >
                      {company.website.replace(/^https?:\/\//, '')}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
                {(company.address || company.city) && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="text-sm">
                      {company.address && <div>{company.address}</div>}
                      {(company.city || company.state || company.zip) && (
                        <div>
                          {company.city}{company.city && company.state ? ', ' : ''}{company.state} {company.zip}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Details Tabs */}
          <div className="md:col-span-2">
            <Tabs defaultValue="people" className="space-y-4">
              <TabsList>
                <TabsTrigger value="people">
                  <Users className="mr-2 h-4 w-4" />
                  People ({company.people?.length || 0})
                </TabsTrigger>
                {company.is_donor && (
                  <TabsTrigger value="donations">
                    <DollarSign className="mr-2 h-4 w-4" />
                    Donations ({company.donations?.length || 0})
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="people">
                <Card>
                  <CardHeader>
                    <CardTitle>Associated People</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {company.people?.length === 0 ? (
                      <p className="text-muted-foreground">No people associated</p>
                    ) : (
                      <div className="space-y-4">
                        {company.people?.map((person) => (
                          <div key={person.id} className="flex items-center justify-between">
                            <div>
                              <Link
                                href={`/people/${person.id}`}
                                className="font-medium hover:underline"
                              >
                                {person.first_name} {person.last_name}
                              </Link>
                              {person.is_primary ? (
                                <Badge variant="outline" className="ml-2">Primary Contact</Badge>
                              ) : null}
                              {person.title && (
                                <p className="text-sm text-muted-foreground">{person.title}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {company.is_donor && (
                <TabsContent value="donations">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle>Donations</CardTitle>
                      <Button size="sm" asChild>
                        <Link href={`/donations/new?company_id=${company.id}`}>
                          Add Donation
                        </Link>
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {company.donations?.length === 0 ? (
                        <p className="text-muted-foreground">No donations yet</p>
                      ) : (
                        <div className="space-y-4">
                          {company.donations?.map((donation) => (
                            <div key={donation.id} className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-muted-foreground">
                                  {formatDate(donation.date)}
                                </p>
                                {donation.note && (
                                  <p className="text-sm">{donation.note}</p>
                                )}
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
                </TabsContent>
              )}
            </Tabs>

            {/* Notes Section */}
            <div className="mt-6">
              <NotesList
                notes={company.notes || []}
                entityType="company"
                entityId={company.id}
                onRefresh={fetchCompany}
              />
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete Company"
        description="Are you sure you want to delete this company? This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDelete}
      />
    </div>
  )
}
