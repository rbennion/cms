"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function MultiSelectFilter({
  options = [],
  value, // array of selected ids
  onChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  className,
  renderOption,
  getBadgeVariant,
  showSearch = true,
}) {
  const [open, setOpen] = React.useState(false);

  // Ensure value is always an array
  const safeValue = Array.isArray(value) ? value : [];

  const selectedOptions = options.filter((opt) =>
    safeValue.includes(opt.id?.toString() || opt.value)
  );

  const handleSelect = (optValue) => {
    const newValue = safeValue.includes(optValue)
      ? safeValue.filter((v) => v !== optValue)
      : [...safeValue, optValue];
    onChange(newValue);
  };

  const handleRemove = (optValue, e) => {
    e.stopPropagation();
    onChange(safeValue.filter((v) => v !== optValue));
  };

  // Simple list without search (for small lists like roles)
  const renderSimpleList = () => (
    <div
      className="max-h-[300px] overflow-y-auto p-1"
      role="listbox"
      aria-multiselectable="true"
    >
      {options.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {emptyText}
        </p>
      ) : (
        options.map((option) => {
          const optValue = option.id?.toString() || option.value;
          const optLabel = renderOption
            ? renderOption(option)
            : option.name || option.label;
          const isSelected = safeValue.includes(optValue);
          return (
            <button
              key={optValue}
              type="button"
              role="option"
              aria-selected={isSelected}
              className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
              onClick={() => handleSelect(optValue)}
            >
              <div
                className={cn(
                  "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "opacity-50 [&_svg]:invisible"
                )}
              >
                <Check className="h-4 w-4" />
              </div>
              {optLabel}
            </button>
          );
        })
      )}
    </div>
  );

  // Command-based list with search (for larger lists)
  const renderCommandList = () => (
    <Command>
      <CommandInput placeholder={searchPlaceholder} />
      <CommandList>
        <CommandEmpty>{emptyText}</CommandEmpty>
        <CommandGroup>
          {options.map((option) => {
            const optValue = option.id?.toString() || option.value;
            const optLabel = renderOption
              ? renderOption(option)
              : option.name || option.label;
            const isSelected = safeValue.includes(optValue);
            return (
              <CommandItem
                key={optValue}
                value={optLabel}
                onSelect={() => handleSelect(optValue)}
              >
                <div
                  className={cn(
                    "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "opacity-50 [&_svg]:invisible"
                  )}
                >
                  <Check className="h-4 w-4" />
                </div>
                {optLabel}
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </Command>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "justify-between font-normal min-w-[140px]",
            safeValue.length > 0 && "border-primary bg-primary/5",
            className
          )}
        >
          {selectedOptions.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : selectedOptions.length === 1 ? (
            <span className="truncate">
              {renderOption
                ? renderOption(selectedOptions[0])
                : selectedOptions[0].name || selectedOptions[0].label}
            </span>
          ) : (
            <span className="truncate">{selectedOptions.length} selected</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0" align="start">
        {showSearch ? renderCommandList() : renderSimpleList()}
        {selectedOptions.length > 0 && (
          <div className="border-t p-2">
            <div className="flex flex-wrap gap-1">
              {selectedOptions.map((option) => {
                const optValue = option.id?.toString() || option.value;
                const optLabel = renderOption
                  ? renderOption(option)
                  : option.name || option.label;
                const variant = getBadgeVariant
                  ? getBadgeVariant(optLabel)
                  : "secondary";
                return (
                  <Badge
                    key={optValue}
                    variant={variant}
                    className="gap-1 pr-1"
                  >
                    {optLabel}
                    <button
                      onClick={(e) => handleRemove(optValue, e)}
                      className="ml-1 rounded-full hover:bg-black/10"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 h-7 w-full text-xs"
              onClick={() => onChange([])}
            >
              Clear all
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
