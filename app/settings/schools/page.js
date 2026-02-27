"use client"

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Pencil, Trash2, Upload, Users } from 'lucide-react'
import Link from 'next/link'
import { ImportDialog } from '@/components/shared/import-dialog'
import { ExportButton } from '@/components/shared/export-button'
import { SavedViewsDropdown } from '@/components/shared/saved-views-dropdown'
import { SearchInput } from '@/components/shared/search-input'

export default function SchoolsSettingsPage() {
  const { toast } = useToast()
  const [schools, setSchools] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editSchool, setEditSchool] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [filters, setFilters] = useState({ search: '' })
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
  })

  useEffect(() => {
    fetchSchools()
  }, [filters])

  const fetchSchools = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.search) params.set('search', filters.search)
      const res = await fetch(`/api/schools?${params}`)
      const data = await res.json()
      setSchools(data)
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch schools', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleApplyView = (filterState) => {
    setFilters(filterState)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const url = editSchool ? `/api/schools/${editSchool.id}` : '/api/schools'
      const method = editSchool ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) throw new Error('Failed to save school')

      toast({ title: editSchool ? 'School updated' : 'School created' })
      resetForm()
      fetchSchools()
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  }

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/schools/${deleteId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete school')
      toast({ title: 'School deleted' })
      setDeleteId(null)
      fetchSchools()
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  }

  const resetForm = () => {
    setFormData({ name: '', address: '', city: '', state: '', zip: '' })
    setEditSchool(null)
    setShowForm(false)
  }

  const openEdit = (school) => {
    setEditSchool(school)
    setFormData({
      name: school.name,
      address: school.address || '',
      city: school.city || '',
      state: school.state || '',
      zip: school.zip || '',
    })
    setShowForm(true)
  }

  return (
    <div className="flex flex-col">
      <Header title="Schools" description="Manage schools">
        <div className="flex gap-2">
          <ExportButton entityType="schools" filters={filters} />
          <Button variant="outline" onClick={() => setShowImportDialog(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add School
          </Button>
        </div>
      </Header>

      <div className="p-6">
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <SavedViewsDropdown
            entityType="schools"
            currentFilters={filters}
            onApplyView={handleApplyView}
          />
          <SearchInput
            placeholder="Search schools..."
            value={filters.search}
            onChange={(value) => handleFilterChange('search', value)}
            className="w-64"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Schools</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Groups</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : schools.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No schools found
                    </TableCell>
                  </TableRow>
                ) : (
                  schools.map((school) => (
                    <TableRow key={school.id}>
                      <TableCell className="font-medium">
                        <Link href={`/settings/schools/${school.id}`} className="hover:underline">
                          {school.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/settings/schools/${school.id}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                          <Users className="h-4 w-4" />
                          {school.group_count || 0} groups
                        </Link>
                      </TableCell>
                      <TableCell>{school.address || '-'}</TableCell>
                      <TableCell>{school.city || '-'}</TableCell>
                      <TableCell>{school.state || '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEdit(school)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeleteId(school.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={() => resetForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editSchool ? 'Edit School' : 'Add School'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP</Label>
                  <Input
                    id="zip"
                    value={formData.zip}
                    onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button type="submit">
                {editSchool ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete School"
        description="Are you sure you want to delete this school? This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDelete}
      />

      <ImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        entityType="schools"
        onSuccess={fetchSchools}
      />
    </div>
  )
}
