"use client"

import { Header } from '@/components/layout/header'
import { CompanyForm } from '@/components/companies/company-form'

export default function NewCompanyPage() {
  return (
    <div className="flex flex-col">
      <Header title="Add Company" description="Create a new organization" />
      <div className="p-6">
        <CompanyForm />
      </div>
    </div>
  )
}
