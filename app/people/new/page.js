"use client"

import { Header } from '@/components/layout/header'
import { PersonForm } from '@/components/people/person-form'

export default function NewPersonPage() {
  return (
    <div className="flex flex-col">
      <Header title="Add Person" description="Create a new contact" />
      <div className="p-6">
        <PersonForm />
      </div>
    </div>
  )
}
