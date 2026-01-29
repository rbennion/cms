"use client"

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DatePicker } from '@/components/shared/date-picker'
import { useToast } from '@/components/ui/use-toast'

export function DonationForm({ donation, isEdit = false }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [people, setPeople] = useState([])
  const [companies, setCompanies] = useState([])
  const [donorType, setDonorType] = useState(
    donation?.company_id ? 'company' :
    donation?.person_id ? 'person' :
    searchParams.get('company_id') ? 'company' :
    searchParams.get('person_id') ? 'person' : 'person'
  )

  const [formData, setFormData] = useState({
    amount: donation?.amount || '',
    date: donation?.date || new Date().toISOString().split('T')[0],
    note: donation?.note || '',
    person_id: donation?.person_id || searchParams.get('person_id') || '',
    company_id: donation?.company_id || searchParams.get('company_id') || '',
  })

  useEffect(() => {
    fetchOptions()
  }, [])

  const fetchOptions = async () => {
    try {
      const [peopleRes, companiesRes] = await Promise.all([
        fetch('/api/people?limit=100'),
        fetch('/api/companies?limit=100')
      ])
      const peopleData = await peopleRes.json()
      const companiesData = await companiesRes.json()
      setPeople(peopleData.data || [])
      setCompanies(companiesData.data || [])
    } catch (error) {
      console.error('Error fetching options:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const submitData = {
        amount: parseFloat(formData.amount),
        date: formData.date,
        note: formData.note,
        person_id: donorType === 'person' && formData.person_id ? parseInt(formData.person_id) : null,
        company_id: donorType === 'company' && formData.company_id ? parseInt(formData.company_id) : null,
      }

      const url = isEdit ? `/api/donations/${donation.id}` : '/api/donations'
      const method = isEdit ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save donation')
      }

      toast({ title: isEdit ? 'Donation updated successfully' : 'Donation recorded successfully' })
      router.push('/donations')
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Donation Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="pl-7"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Date *</Label>
            <DatePicker
              date={formData.date}
              onDateChange={(date) => setFormData({ ...formData, date })}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              placeholder="Add any notes about this donation..."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Donor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Donor Type</Label>
            <Select value={donorType} onValueChange={setDonorType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="person">Individual</SelectItem>
                <SelectItem value="company">Company/Organization</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {donorType === 'person' ? (
            <div className="space-y-2">
              <Label>Select Person *</Label>
              <Select
                value={formData.person_id?.toString() || ''}
                onValueChange={(value) => setFormData({ ...formData, person_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a person" />
                </SelectTrigger>
                <SelectContent>
                  {people.map((person) => (
                    <SelectItem key={person.id} value={person.id.toString()}>
                      {person.first_name} {person.last_name}
                      {person.email ? ` (${person.email})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Select Company *</Label>
              <Select
                value={formData.company_id?.toString() || ''}
                onValueChange={(value) => setFormData({ ...formData, company_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id.toString()}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : isEdit ? 'Update Donation' : 'Record Donation'}
        </Button>
      </div>
    </form>
  )
}
