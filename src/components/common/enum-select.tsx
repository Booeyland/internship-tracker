"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** Radix Select rejects "" as a value, so unset is modelled with a sentinel. */
const NONE = "__none__";

export function EnumSelect<T extends string>({
  id,
  options,
  value,
  onChange,
  placeholder = "Select…",
  allowEmpty = false,
  emptyLabel = "Not set",
  className,
  disabled,
}: {
  id?: string;
  options: readonly T[];
  value: T | null;
  onChange: (value: T | null) => void;
  placeholder?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <Select
      value={value ?? (allowEmpty ? NONE : undefined)}
      onValueChange={(next) => onChange(next === NONE ? null : (next as T))}
      disabled={disabled}
    >
      <SelectTrigger id={id} className={cn(className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowEmpty && (
          <SelectItem value={NONE} className="text-muted-foreground">
            {emptyLabel}
          </SelectItem>
        )}
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Same control shape, but for arbitrary id/label pairs (resumes, companies). */
export function OptionSelect({
  id,
  options,
  value,
  onChange,
  placeholder = "Select…",
  allowEmpty = false,
  emptyLabel = "Not set",
  className,
}: {
  id?: string;
  options: { value: string; label: string }[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
  className?: string;
}) {
  return (
    <Select
      value={value ?? (allowEmpty ? NONE : undefined)}
      onValueChange={(next) => onChange(next === NONE ? null : next)}
    >
      <SelectTrigger id={id} className={cn(className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowEmpty && (
          <SelectItem value={NONE} className="text-muted-foreground">
            {emptyLabel}
          </SelectItem>
        )}
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
