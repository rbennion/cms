'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { ArrowLeft, Plus, Pencil, Trash2, Users } from 'lucide-react'
import { GroupForm } from '@/components/groups/group-form'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export default function SchoolDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [school, setSchool] = useState(null)
  const [groups, setGroups] = useState([])
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(true)
  const [genderFilter, setGenderFilter] = useState('all')
  const [showGroupForm, setShowGroupForm] = useState(false)
  const [editingGroup, setEditingGroup] = useState(null)
  const [deleteGroup, setDeleteGroup] = useState(null)

  useEffect(() => {
    fetchSchool()
    fetchGroups()
    fetchPeople()
  }, [params.id])

  useEffect(() => {
    fetchGroups()
  }, [genderFilter])

  async function fetchSchool() {
    try {
      const res = await fetch(`/api/schools/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setSchool(data)
      }
    } catch (error) {
      console.error('Error fetching school:', error)
    }
  }

  async function fetchGroups() {
    try {
      let url = `/api/schools/${params.id}/groups`
      if (genderFilter !== 'all') {
        url += `?gender=${genderFilter}`
      }
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setGroups(data)
      }
    } catch (error) {
      console.error('Error fetching groups:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchPeople() {
    try {
      const res = await fetch(`/api/people?school_id=${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setPeople(data)
      }
    } catch (error) {
      console.error('Error fetching people:', error)
    }
  }

  async function handleDeleteGroup() {
    if (!deleteGroup) return

    try {
      const res = await fetch(`/api/groups/${deleteGroup.id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        setDeleteGroup(null)
        fetchGroups()
      }
    } catch (error) {
      console.error('Error deleting group:', error)
    }
  }

  function handleGroupSaved() {
    setShowGroupForm(false)
    setEditingGroup(null)
    fetchGroups()
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  if (!school) {
    return <div className="p-8">School not found</div>
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/settings/schools" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Schools
        </Link>
        <h1 className="text-3xl font-bold">{school.name}</h1>
        {school.address && (
          <p className="text-muted-foreground mt-1">{school.address}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Groups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{groups.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Girls Groups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{groups.filter(g => g.gender === 'Girls').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Boys Groups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{groups.filter(g => g.gender === 'Boys').length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Groups
            </CardTitle>
            <div className="flex items-center gap-4">
              <Select value={genderFilter} onValueChange={setGenderFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Girls">Girls</SelectItem>
                  <SelectItem value="Boys">Boys</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => setShowGroupForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Group
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {groups.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No groups found. Create your first group to get started.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Leaders</TableHead>
                  <TableHead>Meeting Location</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell className="font-medium">{group.name}</TableCell>
                    <TableCell>
                      <Badge variant={group.gender === 'Girls' ? 'default' : 'secondary'}>
                        {group.gender}
                      </Badge>
                    </TableCell>
                    <TableCell>{group.year || '-'}</TableCell>
                    <TableCell>
                      {group.leaders && group.leaders.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {group.leaders.map((leader) => (
                            <Link
                              key={leader.id}
                              href={`/people/${leader.id}`}
                              className="text-sm text-primary hover:underline"
                            >
                              {leader.first_name} {leader.last_name}
                            </Link>
                          )).reduce((prev, curr, i) => [prev, <span key={`sep-${i}`} className="text-muted-foreground">, </span>, curr])}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{group.meeting_location || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingGroup(group)
                            setShowGroupForm(true)
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteGroup(group)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <GroupForm
        open={showGroupForm}
        onOpenChange={(open) => {
          setShowGroupForm(open)
          if (!open) setEditingGroup(null)
        }}
        schoolId={params.id}
        group={editingGroup}
        people={people}
        onSaved={handleGroupSaved}
      />

      <AlertDialog open={!!deleteGroup} onOpenChange={() => setDeleteGroup(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteGroup?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGroup}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
