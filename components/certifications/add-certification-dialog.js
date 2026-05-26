'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
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

const DEFAULT_FORM = {
  background_check_status: 'pending',
  background_check_passed: false,
  application_received: false,
  qpr_gatekeeper_training: false,
  qpr_training_date: '',
  qpr_training_renewal_date: '',
}

export function AddCertificationDialog({ open, onOpenChange, personId, personName, onSaved }) {
  const { toast } = useToast()
  const [formData, setFormData] = useState(DEFAULT_FORM)
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

      if (!res.ok) {
        let serverMessage = `Create failed (HTTP ${res.status})`
        try {
          const body = await res.json()
          if (body?.error) serverMessage = body.error
        } catch {}
        throw new Error(serverMessage)
      }

      setFormData(DEFAULT_FORM)
      onSaved()
    } catch (error) {
      toast({
        title: 'Could not create certification',
        description: error.message,
        variant: 'destructive',
      })
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
              <Label htmlFor="background_check_status">Background Check Status</Label>
              <Select
                value={formData.background_check_status}
                onValueChange={(value) => setFormData(prev => ({ ...prev, background_check_status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="denied">Denied</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="background_check_passed"
                checked={formData.background_check_passed}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, background_check_passed: checked }))}
              />
              <Label htmlFor="background_check_passed" className="cursor-pointer">
                Background Check Passed
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="application_received"
                checked={formData.application_received}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, application_received: checked }))}
              />
              <Label htmlFor="application_received" className="cursor-pointer">
                Application Received
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="qpr_gatekeeper_training"
                checked={formData.qpr_gatekeeper_training}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, qpr_gatekeeper_training: checked }))}
              />
              <Label htmlFor="qpr_gatekeeper_training" className="cursor-pointer">
                QPR Training Complete
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="qpr_training_date">QPR Training Date</Label>
              <Input
                type="date"
                id="qpr_training_date"
                value={formData.qpr_training_date}
                onChange={(e) => setFormData(prev => ({ ...prev, qpr_training_date: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="qpr_training_renewal_date">QPR Training Renewal Date</Label>
              <Input
                type="date"
                id="qpr_training_renewal_date"
                value={formData.qpr_training_renewal_date}
                onChange={(e) => setFormData(prev => ({ ...prev, qpr_training_renewal_date: e.target.value }))}
              />
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
