"use client";

import * as React from "react";
import { Building2, Check } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Company } from "@/types";

/**
 * Type-ahead over existing companies that still accepts a brand new name.
 * Selecting a suggestion reports its id so the application links to the
 * existing company instead of creating a duplicate.
 */
export function CompanyCombobox({
  id,
  companies,
  value,
  onChange,
  autoFocus,
  placeholder = "Start typing a company…",
}: {
  id?: string;
  companies: Company[];
  value: { name: string; companyId: string | null };
  onChange: (next: { name: string; companyId: string | null }) => void;
  autoFocus?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [highlighted, setHighlighted] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const suggestions = React.useMemo(() => {
    const term = value.name.trim().toLowerCase();
    const pool = term
      ? companies.filter((company) => company.name.toLowerCase().includes(term))
      : companies;
    return pool.slice(0, 8);
  }, [companies, value.name]);

  React.useEffect(() => setHighlighted(0), [value.name]);

  React.useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const exactMatch = companies.find(
    (company) => company.name.toLowerCase() === value.name.trim().toLowerCase(),
  );

  const select = (company: Company) => {
    onChange({ name: company.name, companyId: company.id });
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        id={id}
        autoFocus={autoFocus}
        autoComplete="off"
        placeholder={placeholder}
        value={value.name}
        onChange={(event) => {
          const name = event.target.value;
          const match = companies.find((c) => c.name.toLowerCase() === name.trim().toLowerCase());
          onChange({ name, companyId: match?.id ?? null });
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (!open || suggestions.length === 0) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setHighlighted((index) => (index + 1) % suggestions.length);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setHighlighted((index) => (index - 1 + suggestions.length) % suggestions.length);
          } else if (event.key === "Enter" && suggestions[highlighted]) {
            // Only intercept Enter while a suggestion is actively highlighted.
            event.preventDefault();
            select(suggestions[highlighted]);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
      />

      {open && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md"
        >
          {suggestions.map((company, index) => (
            <li key={company.id}>
              <button
                type="button"
                role="option"
                aria-selected={index === highlighted}
                onMouseEnter={() => setHighlighted(index)}
                onClick={() => select(company)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm",
                  index === highlighted && "bg-accent text-accent-foreground",
                )}
              >
                <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{company.name}</span>
                {company.industry && (
                  <span className="shrink-0 text-xs text-muted-foreground">{company.industry}</span>
                )}
                {value.companyId === company.id && <Check className="size-3.5 shrink-0" />}
              </button>
            </li>
          ))}
        </ul>
      )}

      {value.name.trim() && !exactMatch && (
        <p className="mt-1 text-xs text-muted-foreground">
          “{value.name.trim()}” will be created as a new company.
        </p>
      )}
    </div>
  );
}
