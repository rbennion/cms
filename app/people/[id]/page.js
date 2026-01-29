"use client"

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { NotesList } from '@/components/notes/notes-list'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Pencil,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Building2,
  GraduationCap,
  DollarSign,
  Award
} from 'lucide-react'

export default function PersonDetailPage({ params }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const [person, setPerson] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showDelete, setShowDelete] = useState(false)

  useEffect(() => {
    fetchPerson()
  }, [resolvedParams.id])

  const fetchPerson = async () => {
    try {
      const res = await fetch(`/api/people/${resolvedParams.id}`)
      if (!res.ok) throw new Error('Person not found')
      const data = await res.json()
      setPerson(data)
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      router.push('/people')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/people/${resolvedParams.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast({ title: 'Person deleted successfully' })
      router.push('/people')
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

  if (!person) return null

  const initials = `${person.first_name[0]}${person.last_name[0]}`.toUpperCase()

  return (
    <div className="flex flex-col">
      <Header
        title={`${person.first_name} ${person.last_name}`}
        description={person.title}
      >
        <Button variant="outline" asChild>
          <Link href={`/people/${person.id}/edit`}>
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
          {/* Profile Card */}
          <Card className="md:col-span-1">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={person.picture_path} />
                  <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
                </Avatar>
                <h2 className="mt-4 text-xl font-semibold">
                  {person.first_name} {person.middle_name} {person.last_name}
                </h2>
                {person.title && (
                  <p className="text-muted-foreground">{person.title}</p>
                )}

                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {person.is_donor ? <Badge variant="success">Donor</Badge> : null}
                  {person.is_fc_certified ? <Badge variant="info">FC Certified</Badge> : null}
                  {person.is_board_member ? <Badge>Board Member</Badge> : null}
                </div>

                {person.types?.length > 0 && (
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {person.types.map((type) => (
                      <Badge key={type.id} variant="secondary">{type.name}</Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 space-y-4">
                {person.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${person.email}`} className="text-sm hover:underline">
                      {person.email}
                    </a>
                  </div>
                )}
                {person.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${person.phone}`} className="text-sm hover:underline">
                      {person.phone}
                    </a>
                  </div>
                )}
                {(person.address || person.city) && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="text-sm">
                      {person.address && <div>{person.address}</div>}
                      {(person.city || person.state || person.zip) && (
                        <div>
                          {person.city}{person.city && person.state ? ', ' : ''}{person.state} {person.zip}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {person.children && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium mb-2">Children</h4>
                  <p className="text-sm text-muted-foreground">{person.children}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Details Tabs */}
          <div className="md:col-span-2">
            <Tabs defaultValue="companies" className="space-y-4">
              <TabsList>
                <TabsTrigger value="companies">
                  <Building2 className="mr-2 h-4 w-4" />
                  Companies ({person.companies?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="schools">
                  <GraduationCap className="mr-2 h-4 w-4" />
                  Schools ({person.schools?.length || 0})
                </TabsTrigger>
                {person.is_donor && (
                  <TabsTrigger value="donations">
                    <DollarSign className="mr-2 h-4 w-4" />
                    Donations ({person.donations?.length || 0})
                  </TabsTrigger>
                )}
                {person.is_fc_certified && (
                  <TabsTrigger value="certification">
                    <Award className="mr-2 h-4 w-4" />
                    Certification
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="companies">
                <Card>
                  <CardHeader>
                    <CardTitle>Associated Companies</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {person.companies?.length === 0 ? (
                      <p className="text-muted-foreground">No companies associated</p>
                    ) : (
                      <div className="space-y-4">
                        {person.companies?.map((company) => (
                          <div key={company.id} className="flex items-center justify-between">
                            <div>
                              <Link
                                href={`/companies/${company.id}`}
                                className="font-medium hover:underline"
                              >
                                {company.name}
                              </Link>
                              {company.is_primary ? (
                                <Badge variant="outline" className="ml-2">Primary</Badge>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="schools">
                <Card>
                  <CardHeader>
                    <CardTitle>Associated Schools</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {person.schools?.length === 0 ? (
                      <p className="text-muted-foreground">No schools associated</p>
                    ) : (
                      <div className="space-y-4">
                        {person.schools?.map((school) => (
                          <div key={school.id}>
                            <p className="font-medium">{school.name}</p>
                            {school.city && (
                              <p className="text-sm text-muted-foreground">
                                {school.city}, {school.state}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {person.is_donor && (
                <TabsContent value="donations">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle>Donations</CardTitle>
                      <Button size="sm" asChild>
                        <Link href={`/donations/new?person_id=${person.id}`}>
                          Add Donation
                        </Link>
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {person.donations?.length === 0 ? (
                        <p className="text-muted-foreground">No donations yet</p>
                      ) : (
                        <div className="space-y-4">
                          {person.donations?.map((donation) => (
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

              {person.is_fc_certified && (
                <TabsContent value="certification">
                  <Card>
                    <CardHeader>
                      <CardTitle>Certification Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {person.certification ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span>Background Check</span>
                            <Badge
                              variant={
                                person.certification.background_check_status === 'approved' ? 'success' :
                                person.certification.background_check_status === 'pending' ? 'warning' :
                                person.certification.background_check_status === 'denied' ? 'destructive' :
                                'secondary'
                              }
                            >
                              {person.certification.background_check_status || 'Not Started'}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Application Received</span>
                            <Badge variant={person.certification.application_received ? 'success' : 'secondary'}>
                              {person.certification.application_received ? 'Yes' : 'No'}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Training Complete</span>
                            <Badge variant={person.certification.training_complete ? 'success' : 'secondary'}>
                              {person.certification.training_complete ? 'Yes' : 'No'}
                            </Badge>
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No certification record</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </Tabs>

            {/* Notes Section */}
            <div className="mt-6">
              <NotesList
                notes={person.notes || []}
                entityType="person"
                entityId={person.id}
                onRefresh={fetchPerson}
              />
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete Person"
        description="Are you sure you want to delete this person? This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDelete}
      />
    </div>
  )
}
