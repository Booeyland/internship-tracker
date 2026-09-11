import {
  differenceInCalendarDays,
  format,
  isValid,
  parseISO,
  startOfDay,
} from "date-fns";

/**
 * Dates are stored two ways: calendar dates as `YYYY-MM-DD` (deadlines, applied
 * dates) and instants as full ISO strings (interviews, timeline entries).
 * Everything here accepts either and never throws on malformed input.
 */

export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
}

/** `YYYY-MM-DD` for today, in the user's local timezone. */
export function todayIso(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function toDateInputValue(value: string | null | undefined): string {
  const date = parseDate(value);
  return date ? format(date, "yyyy-MM-dd") : "";
}

export function toTimeInputValue(value: string | null | undefined): string {
  const date = parseDate(value);
  return date ? format(date, "HH:mm") : "";
}

/** Combines separate date and time inputs into a single ISO instant. */
export function combineDateTime(date: string, time: string): string | null {
  if (!date) return null;
  const combined = new Date(`${date}T${time || "09:00"}:00`);
  return isValid(combined) ? combined.toISOString() : null;
}

export function formatDate(value: string | null | undefined, pattern = "MMM d, yyyy"): string {
  const date = parseDate(value);
  return date ? format(date, pattern) : "—";
}

export function formatShortDate(value: string | null | undefined): string {
  return formatDate(value, "MMM d");
}

export function formatTime(value: string | null | undefined): string {
  const date = parseDate(value);
  return date ? format(date, "h:mm a") : "—";
}

export function formatDateTime(value: string | null | undefined): string {
  const date = parseDate(value);
  return date ? format(date, "MMM d, yyyy · h:mm a") : "—";
}

/** Whole calendar days between a date and today. Negative = in the past. */
export function daysFromToday(value: string | null | undefined): number | null {
  const date = parseDate(value);
  if (!date) return null;
  return differenceInCalendarDays(startOfDay(date), startOfDay(new Date()));
}

/** Calendar days elapsed since a date. Negative = still in the future. */
export function daysSince(value: string | null | undefined): number | null {
  const delta = daysFromToday(value);
  return delta === null ? null : -delta;
}

/**
 * Human phrasing for a date relative to today — "today", "tomorrow",
 * "in 5 days", "3 days ago". Used throughout the UI instead of raw dates.
 */
export function relativeDay(value: string | null | undefined): string {
  const delta = daysFromToday(value);
  if (delta === null) return "—";
  if (delta === 0) return "today";
  if (delta === 1) return "tomorrow";
  if (delta === -1) return "yesterday";
  if (delta > 0) return `in ${delta} days`;
  return `${Math.abs(delta)} days ago`;
}

/** "Applied 8 days ago" style phrasing; null when there is no date. */
export function appliedPhrase(dateApplied: string | null | undefined): string | null {
  const elapsed = daysSince(dateApplied);
  if (elapsed === null) return null;
  if (elapsed === 0) return "Applied today";
  if (elapsed === 1) return "Applied yesterday";
  return `Applied ${elapsed} days ago`;
}

/** "Due in 3 days" / "Overdue by 2 days" for tasks and deadlines. */
export function duePhrase(dueDate: string | null | undefined, noun = "Due"): string {
  const delta = daysFromToday(dueDate);
  if (delta === null) return "No due date";
  if (delta === 0) return `${noun} today`;
  if (delta === 1) return `${noun} tomorrow`;
  if (delta > 1) return `${noun} in ${delta} days`;
  if (delta === -1) return "Overdue by 1 day";
  return `Overdue by ${Math.abs(delta)} days`;
}

export function isOverdue(value: string | null | undefined): boolean {
  const delta = daysFromToday(value);
  return delta !== null && delta < 0;
}

export function isUpcoming(value: string | null | undefined, withinDays = 14): boolean {
  const delta = daysFromToday(value);
  return delta !== null && delta >= 0 && delta <= withinDays;
}

/** ISO week key (`2026-W07`) used to bucket applications per week. */
export function isoWeekKey(value: string | null | undefined): string | null {
  const date = parseDate(value);
  return date ? format(date, "RRRR-'W'II") : null;
}

export function monthKey(value: string | null | undefined): string | null {
  const date = parseDate(value);
  return date ? format(date, "yyyy-MM") : null;
}

export function formatMonthKey(key: string): string {
  const date = parseDate(`${key}-01`);
  return date ? format(date, "MMM yyyy") : key;
}
