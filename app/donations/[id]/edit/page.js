"use client"

import { useState, useEffect, use, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { DonationForm } from '@/components/donations/donation-form'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'

function EditDonationContent({ id }) {
  const router = useRouter()
  const { toast } = useToast()
  const [donation, setDonation] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDonation()
  }, [id])

  const fetchDonation = async () => {
    try {
      const res = await fetch(`/api/donations/${id}`)
      if (!res.ok) throw new Error('Donation not found')
      const data = await res.json()
      setDonation(data)
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      router.push('/donations')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <Skeleton className="h-96 w-full" />
  }

  if (!donation) return null

  return <DonationForm donation={donation} isEdit />
}

export default function EditDonationPage({ params }) {
  const resolvedParams = use(params)

  return (
    <div className="flex flex-col">
      <Header title="Edit Donation" description="Update donation details" />
      <div className="p-6">
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
          <EditDonationContent id={resolvedParams.id} />
        </Suspense>
      </div>
    </div>
  )
}
