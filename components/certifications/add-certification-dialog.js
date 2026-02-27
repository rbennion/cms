'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
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

export function AddCertificationDialog({ open, onOpenChange, personId, personName, onSaved }) {
  const [formData, setFormData] = useState({
    status: 'Pending',
    background_check: false,
    qpr_gatekeeper_training: false
  })
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch('/api/certifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          person_id: personId,
          ...formData
        })
      })

      if (res.ok) {
        setFormData({
          status: 'Pending',
          background_check: false,
          qpr_gatekeeper_training: false
        })
        onSaved()
      }
    } catch (error) {
      console.error('Error creating certification:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Certification for {personName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="status">Initial Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="background_check"
                checked={formData.background_check}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, background_check: checked }))}
              />
              <Label htmlFor="background_check" className="cursor-pointer">
                Background Check Complete
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="qpr_gatekeeper_training"
                checked={formData.qpr_gatekeeper_training}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, qpr_gatekeeper_training: checked }))}
              />
              <Label htmlFor="qpr_gatekeeper_training" className="cursor-pointer">
                QPR Gatekeeper Training Complete
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Creating...' : 'Create Certification'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
