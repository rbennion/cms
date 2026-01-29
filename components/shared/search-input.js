"use client"

import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

export function SearchInput({ placeholder = "Search...", value, onChange, className }) {
  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9"
      />
    </div>
  )
}
