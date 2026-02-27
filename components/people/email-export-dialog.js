'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Copy, Check } from 'lucide-react'

export function EmailExportDialog({ open, onOpenChange, emails }) {
  const [copied, setCopied] = useState(false)

  const emailText = emails.join(', ')

  async function handleCopy() {
    await navigator.clipboard.writeText(emailText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Email List ({emails.length} emails)</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          {emails.length > 0 ? (
            <Textarea
              value={emailText}
              readOnly
              rows={10}
              className="font-mono text-sm"
            />
          ) : (
            <p className="text-muted-foreground text-center py-4">
              No email addresses found for the current filter.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {emails.length > 0 && (
            <Button onClick={handleCopy}>
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy to Clipboard
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
