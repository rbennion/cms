"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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

export function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  className,
  allLabel = "All",
  renderOption,
  showSearch = true,
}) {
  const [open, setOpen] = React.useState(false);

  const selectedOption = options.find(
    (opt) => opt.id?.toString() === value || opt.value === value
  );

  const displayValue = selectedOption
    ? renderOption
      ? renderOption(selectedOption)
      : selectedOption.name || selectedOption.label
    : value
    ? value
    : allLabel;

  // Simple list without search
  const renderSimpleList = () => (
    <div className="max-h-[300px] overflow-y-auto p-1" role="listbox">
      <button
        type="button"
        role="option"
        aria-selected={!value}
        className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
        onClick={() => {
          onChange("");
          setOpen(false);
        }}
      >
        <Check
          className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")}
        />
        {allLabel}
      </button>
      {options.map((option) => {
        const optValue = option.id?.toString() || option.value;
        const optLabel = renderOption
          ? renderOption(option)
          : option.name || option.label;
        return (
          <button
            key={optValue}
            type="button"
            role="option"
            aria-selected={value === optValue}
            className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
            onClick={() => {
              onChange(optValue);
              setOpen(false);
            }}
          >
            <Check
              className={cn(
                "mr-2 h-4 w-4",
                value === optValue ? "opacity-100" : "opacity-0"
              )}
            />
            {optLabel}
          </button>
        );
      })}
    </div>
  );

  // Command-based list with search
  const renderCommandList = () => (
    <Command>
      <CommandInput placeholder={searchPlaceholder} />
      <CommandList>
        <CommandEmpty>{emptyText}</CommandEmpty>
        <CommandGroup>
          <CommandItem
            value="_all"
            onSelect={() => {
              onChange("");
              setOpen(false);
            }}
          >
            <Check
              className={cn(
                "mr-2 h-4 w-4",
                !value ? "opacity-100" : "opacity-0"
              )}
            />
            {allLabel}
          </CommandItem>
          {options.map((option) => {
            const optValue = option.id?.toString() || option.value;
            const optLabel = renderOption
              ? renderOption(option)
              : option.name || option.label;
            return (
              <CommandItem
                key={optValue}
                value={optLabel}
                onSelect={() => {
                  onChange(optValue);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === optValue ? "opacity-100" : "opacity-0"
                  )}
                />
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
            "justify-between font-normal",
            value && "border-primary bg-primary/5",
            className
          )}
        >
          <span className="truncate">{displayValue}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0" align="start">
        {showSearch ? renderCommandList() : renderSimpleList()}
      </PopoverContent>
    </Popover>
  );
}
