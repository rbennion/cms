"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Users, Building2, DollarSign, Menu, X, LayoutDashboard, GraduationCap, Award, Settings } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/people', label: 'People', icon: Users },
  { href: '/companies', label: 'Companies', icon: Building2 },
  { href: '/schools', label: 'Schools', icon: GraduationCap },
  { href: '/donations', label: 'Donations', icon: DollarSign },
  { href: '/certifications', label: 'Certifications', icon: Award },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function Header({ title, description, children }) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle menu</span>
      </Button>

      <div className="flex flex-1 items-center gap-4">
        {title && (
          <div className="min-w-0">
            <h1 className="text-lg font-semibold truncate">{title}</h1>
            {description && (
              <p className="text-sm text-muted-foreground truncate hidden sm:block">{description}</p>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {children}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Quick Add</span>
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

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div 
            className="fixed inset-0 bg-black/50" 
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed left-0 top-0 h-full w-64 bg-sidebar border-r border-sidebar-border">
            <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <span className="font-semibold">Fight Club CRM</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="p-4 space-y-1">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/' && pathname?.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      )}
    </header>
  )
}
