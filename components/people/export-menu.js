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

  function buildQueryString() {
    const params = new URLSearchParams()
    if (filters.search) params.set('search', filters.search)
    if (filters.type && filters.type !== 'all') params.set('type', filters.type)
    if (filters.schoolId && filters.schoolId !== 'all') params.set('school_id', filters.schoolId)
    if (filters.companyId && filters.companyId !== 'all') params.set('company_id', filters.companyId)
    if (filters.isFcCertified && filters.isFcCertified !== 'all') params.set('is_fc_certified', filters.isFcCertified)
    return params.toString()
  }

  async function handleExportCSV() {
    const queryString = buildQueryString()
    const url = `/api/people/export?format=csv${queryString ? '&' + queryString : ''}`

    const res = await fetch(url)
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
    const queryString = buildQueryString()
    const url = `/api/people/export?format=email${queryString ? '&' + queryString : ''}`

    const res = await fetch(url)
    if (res.ok) {
      const data = await res.json()
      setEmails(data.emails || [])
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
