"use client"

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { CompanyForm } from '@/components/companies/company-form'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'

export default function EditCompanyPage({ params }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCompany()
  }, [resolvedParams.id])

  const fetchCompany = async () => {
    try {
      const res = await fetch(`/api/companies/${resolvedParams.id}`)
      if (!res.ok) throw new Error('Company not found')
      const data = await res.json()
      setCompany(data)
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      router.push('/companies')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col">
        <Header title="Loading..." />
        <div className="p-6">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  if (!company) return null

  return (
    <div className="flex flex-col">
      <Header
        title={`Edit ${company.name}`}
        description="Update company information"
      />
      <div className="p-6">
        <CompanyForm company={company} isEdit />
      </div>
    </div>
  )
}
