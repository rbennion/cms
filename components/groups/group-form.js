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
import { Checkbox } from '@/components/ui/checkbox'

export function GroupForm({ open, onOpenChange, schoolId, group, people, onSaved }) {
  const [formData, setFormData] = useState({
    name: '',
    gender: 'Girls',
    year: '',
    meeting_location: '',
    notes: '',
    leader_ids: []
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (group) {
      setFormData({
        name: group.name || '',
        gender: group.gender || 'Girls',
        year: group.year || '',
        meeting_location: group.meeting_location || '',
        notes: group.notes || '',
        leader_ids: group.leaders ? group.leaders.map(l => l.id) : []
      })
    } else {
      setFormData({
        name: '',
        gender: 'Girls',
        year: '',
        meeting_location: '',
        notes: '',
        leader_ids: []
      })
    }
  }, [group, open])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)

    try {
      const url = group ? `/api/groups/${group.id}` : '/api/groups'
      const method = group ? 'PUT' : 'POST'

      const body = { ...formData }
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

  function toggleLeader(personId) {
    setFormData(prev => ({
      ...prev,
      leader_ids: prev.leader_ids.includes(personId)
        ? prev.leader_ids.filter(id => id !== personId)
        : [...prev.leader_ids, personId]
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
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
                value={formData.year}
                onChange={(e) => setFormData(prev => ({ ...prev, year: e.target.value }))}
                placeholder="e.g., 2024-2025"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meeting_location">Meeting Location</Label>
              <Input
                id="meeting_location"
                value={formData.meeting_location}
                onChange={(e) => setFormData(prev => ({ ...prev, meeting_location: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Leaders</Label>
              <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                {people && people.length > 0 ? (
                  people.map((person) => (
                    <div key={person.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`leader-${person.id}`}
                        checked={formData.leader_ids.includes(person.id)}
                        onCheckedChange={() => toggleLeader(person.id)}
                      />
                      <label
                        htmlFor={`leader-${person.id}`}
                        className="text-sm cursor-pointer"
                      >
                        {person.first_name} {person.last_name}
                        {person.email && (
                          <span className="text-muted-foreground ml-1">({person.email})</span>
                        )}
                      </label>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No people available to assign as leaders</p>
                )}
              </div>
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
