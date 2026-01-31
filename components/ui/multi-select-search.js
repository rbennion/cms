"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function MultiSelectSearch({
  options = [],
  selected = [],
  onChange,
  placeholder = "Search...",
  label,
  renderOption,
  singleSelect = false,
}) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter((option) => {
    const label = renderOption ? renderOption(option) : option.name;
    return label?.toLowerCase().includes(search.toLowerCase());
  });

  const handleSelect = (option) => {
    const isSelected = selected.some((s) => s.id === option.id);
    if (singleSelect) {
      onChange([option]);
      setIsOpen(false);
      setSearch("");
    } else {
      if (isSelected) {
        onChange(selected.filter((s) => s.id !== option.id));
      } else {
        onChange([...selected, option]);
      }
    }
  };

  const handleRemove = (option) => {
    onChange(selected.filter((s) => s.id !== option.id));
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Selected items */}
      {!singleSelect && selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {selected.map((item) => (
            <Badge key={item.id} variant="secondary" className="gap-1">
              {renderOption ? renderOption(item) : item.name}
              <button
                type="button"
                onClick={() => handleRemove(item)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="pl-9"
        />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
          {filteredOptions.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground text-center">
              {search ? "No results found" : "No options available"}
            </div>
          ) : (
            <>
              {filteredOptions.slice(0, 50).map((option) => {
                const isSelected = selected.some((s) => s.id === option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSelect(option)}
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center justify-between",
                      isSelected && "bg-accent"
                    )}
                  >
                    <span>
                      {renderOption ? renderOption(option) : option.name}
                    </span>
                    {isSelected && <Check className="h-4 w-4 text-primary" />}
                  </button>
                );
              })}
              {filteredOptions.length > 50 && (
                <div className="p-2 text-xs text-muted-foreground text-center border-t">
                  Showing first 50 results. Type to narrow search.
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
