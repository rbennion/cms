'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Download, Mail, FileSpreadsheet } from 'lucide-react'
import { EmailExportDialog } from './email-export-dialog'

export function ExportMenu({ filters }) {
  const [showEmailDialog, setShowEmailDialog] = useState(false)
  const [emails, setEmails] = useState([])

  function buildExportUrl(format) {
    const params = new URLSearchParams({ entityType: 'people', format })
    const filterObj = {}
    if (filters.search) filterObj.search = filters.search
    if (Object.keys(filterObj).length > 0) {
      params.set('filters', JSON.stringify(filterObj))
    }
    return `/api/export?${params.toString()}`
  }

  async function handleExportCSV() {
    const res = await fetch(buildExportUrl('csv'))
    if (res.ok) {
      const blob = await res.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = `people-export-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(downloadUrl)
    }
  }

  async function handleExportEmails() {
    const res = await fetch(buildExportUrl('email'))
    if (res.ok) {
      const text = await res.text()
      const parsed = text.split('; ').filter(Boolean)
      setEmails(parsed)
      setShowEmailDialog(true)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleExportCSV}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export to CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportEmails}>
            <Mail className="h-4 w-4 mr-2" />
            Export Email List
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EmailExportDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        emails={emails}
      />
    </>
  )
}
