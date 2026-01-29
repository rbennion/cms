"use client"

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { PersonForm } from '@/components/people/person-form'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'

export default function EditPersonPage({ params }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const [person, setPerson] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPerson()
  }, [resolvedParams.id])

  const fetchPerson = async () => {
    try {
      const res = await fetch(`/api/people/${resolvedParams.id}`)
      if (!res.ok) throw new Error('Person not found')
      const data = await res.json()
      setPerson(data)
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      router.push('/people')
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

  if (!person) return null

  return (
    <div className="flex flex-col">
      <Header
        title={`Edit ${person.first_name} ${person.last_name}`}
        description="Update contact information"
      />
      <div className="p-6">
        <PersonForm person={person} isEdit />
      </div>
    </div>
  )
}
