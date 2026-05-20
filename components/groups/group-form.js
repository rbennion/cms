'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { MultiSelectSearch } from '@/components/ui/multi-select-search'

export function GroupForm({ open, onOpenChange, schoolId, group, people, onSaved }) {
  const [formData, setFormData] = useState({
    name: '',
    gender: 'Girls',
    year: '',
    meeting_location: '',
    notes: '',
    leader_ids: [],
    primary_leader_id: null,
    status: 'Active'
  })
  const [saving, setSaving] = useState(false)

  // Sort people alphabetically by first name
  const sortedPeople = (people || []).slice().sort((a, b) => {
    const nameA = (a.first_name || '').toLowerCase()
    const nameB = (b.first_name || '').toLowerCase()
    if (nameA < nameB) return -1
    if (nameA > nameB) return 1
    const lastA = (a.last_name || '').toLowerCase()
    const lastB = (b.last_name || '').toLowerCase()
    return lastA.localeCompare(lastB)
  })

  useEffect(() => {
    if (group) {
      setFormData({
        name: group.name || '',
        gender: group.gender || 'Girls',
        year: group.year || '',
        meeting_location: group.meeting_location || '',
        notes: group.notes || '',
        leader_ids: group.leaders ? group.leaders.map(l => l.id) : [],
        primary_leader_id: group.primary_leader_id || null,
        status: group.status || 'Active'
      })
    } else {
      setFormData({
        name: '',
        gender: 'Girls',
        year: '',
        meeting_location: '',
        notes: '',
        leader_ids: [],
        primary_leader_id: null,
        status: 'Active'
      })
    }
  }, [group, open])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)

    try {
      const url = group ? `/api/groups/${group.id}` : '/api/groups'
      const method = group ? 'PUT' : 'POST'

      const body = {
        ...formData,
        year: formData.year ? parseInt(formData.year, 10) : null
      }
      if (!group) {
        body.school_id = schoolId
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (res.ok) {
        onSaved()
      }
    } catch (error) {
      console.error('Error saving group:', error)
    } finally {
      setSaving(false)
    }
  }

  // Convert leader_ids to person objects for MultiSelectSearch
  const selectedLeaders = sortedPeople.filter(p => formData.leader_ids.includes(p.id))

  // Convert primary_leader_id to person object for MultiSelectSearch
  const selectedPrimaryLeader = formData.primary_leader_id
    ? sortedPeople.filter(p => p.id === formData.primary_leader_id)
    : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{group ? 'Edit Group' : 'Add Group'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Gender *</Label>
              <Select
                value={formData.gender}
                onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Girls">Girls</SelectItem>
                  <SelectItem value="Boys">Boys</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                min="2000"
                max="2099"
                value={formData.year}
                onChange={(e) => setFormData(prev => ({ ...prev, year: e.target.value }))}
                placeholder="e.g., 2026"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="Alumni">Alumni</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Primary Leader</Label>
              <MultiSelectSearch
                options={sortedPeople}
                selected={selectedPrimaryLeader}
                onChange={(selected) => {
                  setFormData(prev => ({
                    ...prev,
                    primary_leader_id: selected.length > 0 ? selected[0].id : null
                  }))
                }}
                placeholder="Search for primary leader..."
                renderOption={(p) => `${p.first_name} ${p.last_name}`}
                singleSelect
              />
              {formData.primary_leader_id && (
                <div className="text-sm text-muted-foreground">
                  Selected: {sortedPeople.find(p => p.id === formData.primary_leader_id)?.first_name}{' '}
                  {sortedPeople.find(p => p.id === formData.primary_leader_id)?.last_name}
                  <button
                    type="button"
                    className="ml-2 text-destructive hover:underline"
                    onClick={() => setFormData(prev => ({ ...prev, primary_leader_id: null }))}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Support Leaders</Label>
              <MultiSelectSearch
                options={sortedPeople.filter(p => p.id !== formData.primary_leader_id)}
                selected={selectedLeaders}
                onChange={(selected) => {
                  setFormData(prev => ({
                    ...prev,
                    leader_ids: selected.map(s => s.id)
                  }))
                }}
                placeholder="Search for leaders..."
                renderOption={(p) => `${p.first_name} ${p.last_name}`}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : (group ? 'Update' : 'Create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
