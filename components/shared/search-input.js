"use client"

import { useState, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function SearchInput({ 
  placeholder = "Search...", 
  value, 
  onChange, 
  className,
  debounceMs = 300 
}) {
  const [localValue, setLocalValue] = useState(value || "")

  // Sync local value when external value changes
  useEffect(() => {
    setLocalValue(value || "")
  }, [value])

  // Debounced onChange
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue)
      }
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [localValue, debounceMs])

  const handleClear = useCallback(() => {
    setLocalValue("")
    onChange("")
  }, [onChange])

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        placeholder={placeholder}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        className="pl-9 pr-8"
      />
      {localValue && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
          onClick={handleClear}
        >
          <X className="h-3 w-3" />
          <span className="sr-only">Clear search</span>
        </Button>
      )}
    </div>
  )
}
