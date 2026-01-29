"use client"

import { Suspense } from 'react'
import { Header } from '@/components/layout/header'
import { DonationForm } from '@/components/donations/donation-form'

function NewDonationContent() {
  return <DonationForm />
}

export default function NewDonationPage() {
  return (
    <div className="flex flex-col">
      <Header title="Add Donation" description="Record a new contribution" />
      <div className="p-6">
        <Suspense fallback={<div>Loading...</div>}>
          <NewDonationContent />
        </Suspense>
      </div>
    </div>
  )
}
