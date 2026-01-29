"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'

export function PersonForm({ person, isEdit = false }) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [schools, setSchools] = useState([])
  const [companies, setCompanies] = useState([])
  const [personTypes, setPersonTypes] = useState([])

  const [formData, setFormData] = useState({
    first_name: person?.first_name || '',
    middle_name: person?.middle_name || '',
    last_name: person?.last_name || '',
    email: person?.email || '',
    phone: person?.phone || '',
    title: person?.title || '',
    address: person?.address || '',
    city: person?.city || '',
    state: person?.state || '',
    zip: person?.zip || '',
    is_donor: person?.is_donor || false,
    is_fc_certified: person?.is_fc_certified || false,
    is_board_member: person?.is_board_member || false,
    children: person?.children || '',
    company_ids: person?.companies?.map(c => c.id) || [],
    type_ids: person?.types?.map(t => t.id) || [],
    school_ids: person?.schools?.map(s => s.id) || [],
  })

  useEffect(() => {
    fetchOptions()
  }, [])

  const fetchOptions = async () => {
    try {
      const [schoolsRes, companiesRes, typesRes] = await Promise.all([
        fetch('/api/schools'),
        fetch('/api/companies?limit=100'),
        fetch('/api/person-types')
      ])
      const schoolsData = await schoolsRes.json()
      const companiesData = await companiesRes.json()
      const typesData = await typesRes.json()
      setSchools(schoolsData)
      setCompanies(companiesData.data || [])
      setPersonTypes(typesData)
    } catch (error) {
      console.error('Error fetching options:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = isEdit ? `/api/people/${person.id}` : '/api/people'
      const method = isEdit ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save person')
      }

      const data = await res.json()
      toast({ title: isEdit ? 'Person updated successfully' : 'Person created successfully' })
      router.push(`/people/${data.id}`)
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const toggleArrayValue = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(v => v !== value)
        : [...prev[field], value]
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="first_name">First Name *</Label>
            <Input
              id="first_name"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="middle_name">Middle Name</Label>
            <Input
              id="middle_name"
              value={formData.middle_name}
              onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_name">Last Name *</Label>
            <Input
              id="last_name"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Address</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address">Street Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_donor"
              checked={formData.is_donor}
              onCheckedChange={(checked) => setFormData({ ...formData, is_donor: checked })}
            />
            <Label htmlFor="is_donor">Donor</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_fc_certified"
              checked={formData.is_fc_certified}
              onCheckedChange={(checked) => setFormData({ ...formData, is_fc_certified: checked })}
            />
            <Label htmlFor="is_fc_certified">FC Certified</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_board_member"
              checked={formData.is_board_member}
              onCheckedChange={(checked) => setFormData({ ...formData, is_board_member: checked })}
            />
            <Label htmlFor="is_board_member">Board Member</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {personTypes.map((type) => (
              <div key={type.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`type-${type.id}`}
                  checked={formData.type_ids.includes(type.id)}
                  onCheckedChange={() => toggleArrayValue('type_ids', type.id)}
                />
                <Label htmlFor={`type-${type.id}`}>{type.name}</Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Companies</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {companies.map((company) => (
              <div key={company.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`company-${company.id}`}
                  checked={formData.company_ids.includes(company.id)}
                  onCheckedChange={() => toggleArrayValue('company_ids', company.id)}
                />
                <Label htmlFor={`company-${company.id}`}>{company.name}</Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Schools</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {schools.map((school) => (
              <div key={school.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`school-${school.id}`}
                  checked={formData.school_ids.includes(school.id)}
                  onCheckedChange={() => toggleArrayValue('school_ids', school.id)}
                />
                <Label htmlFor={`school-${school.id}`}>{school.name}</Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="children">Children (names, ages)</Label>
            <Textarea
              id="children"
              value={formData.children}
              onChange={(e) => setFormData({ ...formData, children: e.target.value })}
              placeholder="e.g., Emma (8), Jack (12)"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : isEdit ? 'Update Person' : 'Create Person'}
        </Button>
      </div>
    </form>
  )
}
