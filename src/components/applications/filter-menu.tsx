"use client";

import * as React from "react";
import { Check, ChevronDown, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface FilterOption {
  value: string;
  label: string;
  /** Optional colour dot, used for statuses. */
  color?: string;
  count?: number;
}

/**
 * Multi-select filter with a search box. Used for every dimension on the
 * applications table so the filter bar behaves consistently.
 */
export function FilterMenu({
  label,
  options,
  selected,
  onChange,
  searchable = true,
  align = "start",
}: {
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  searchable?: boolean;
  align?: "start" | "end";
}) {
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    return term ? options.filter((option) => option.label.toLowerCase().includes(term)) : options;
  }, [options, query]);

  const toggle = (value: string) => {
    onChange(
      selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value],
    );
  };

  return (
    <Popover onOpenChange={(open) => !open && setQuery("")}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("gap-1.5 border-dashed", selected.length > 0 && "border-solid")}
        >
          {label}
          {selected.length > 0 && (
            <span className="rounded bg-secondary px-1 text-[11px] font-medium tabular">
              {selected.length}
            </span>
          )}
          <ChevronDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-60 p-0">
        {searchable && options.length > 8 && (
          <div className="flex items-center gap-2 border-b border-border px-2.5">
            <Search className="size-3.5 shrink-0 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Filter ${label.toLowerCase()}…`}
              className="h-8 border-0 px-0 shadow-none focus-visible:ring-0"
            />
          </div>
        )}

        <div className="max-h-64 overflow-y-auto p-1">
          {filtered.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">No matches</p>
          )}
          {filtered.map((option) => {
            const active = selected.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggle(option.value)}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
              >
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-[4px] border",
                    active ? "border-primary bg-primary text-primary-foreground" : "border-input",
                  )}
                >
                  {active && <Check className="size-3" />}
                </span>
                {option.color && (
                  <span
                    aria-hidden
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: option.color }}
                  />
                )}
                <span className="flex-1 truncate">{option.label}</span>
                {option.count !== undefined && (
                  <span className="tabular text-xs text-muted-foreground">{option.count}</span>
                )}
              </button>
            );
          })}
        </div>

        {selected.length > 0 && (
          <div className="border-t border-border p-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center text-xs"
              onClick={() => onChange([])}
            >
              Clear {label.toLowerCase()}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
