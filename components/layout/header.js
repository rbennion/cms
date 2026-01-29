"use client"

import { Button } from '@/components/ui/button'
import { Plus, Users, Building2, DollarSign } from 'lucide-react'
import Link from 'next/link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function Header({ title, description, children }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-6">
      <div className="flex flex-1 items-center gap-4">
        {title && (
          <div>
            <h1 className="text-lg font-semibold">{title}</h1>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {children}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Quick Add
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href="/people/new" className="flex items-center">
                <Users className="mr-2 h-4 w-4" />
                New Person
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/companies/new" className="flex items-center">
                <Building2 className="mr-2 h-4 w-4" />
                New Company
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/donations/new" className="flex items-center">
                <DollarSign className="mr-2 h-4 w-4" />
                New Donation
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
