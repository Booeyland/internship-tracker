import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";

import { parseDate } from "@/lib/dates";
import type { Dataset, EventType } from "@/types";

/** Everything that can land on the recruiting calendar. */
export interface CalendarItem {
  id: string;
  /** The instant (or midnight, for all-day items) the item sits at. */
  date: Date;
  title: string;
  kind: EventType | "Task";
  applicationId: string | null;
  companyId: string | null;
  location: string | null;
  meetingLink: string | null;
  notes: string | null;
  /** All-day items (deadlines, task due dates) show no time. */
  allDay: boolean;
  /** Only set for tasks, so the calendar can grey out completed ones. */
  completed?: boolean;
}

export const ITEM_COLORS: Record<CalendarItem["kind"], string> = {
  Interview: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300",
  Assessment: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  Deadline: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  "Follow-Up": "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300",
  "Networking Call": "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  "Career Fair": "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  "Info Session": "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300",
  Other: "bg-secondary text-secondary-foreground",
  Task: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

/** A `YYYY-MM-DD` string is a calendar date, not an instant. */
function isDateOnly(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * Flattens recruiting events and open task due-dates into one sorted list.
 * Interviews already produce recruiting events, so they are not added twice.
 */
export function buildCalendarItems(dataset: Dataset, options: { includeTasks: boolean }): CalendarItem[] {
  const items: CalendarItem[] = [];

  for (const event of dataset.recruitingEvents) {
    const date = parseDate(event.startsAt);
    if (!date) continue;
    items.push({
      id: `event-${event.id}`,
      date,
      title: event.title,
      kind: event.eventType,
      applicationId: event.applicationId,
      companyId: event.companyId,
      location: event.location,
      meetingLink: event.meetingLink,
      notes: event.notes,
      allDay: isDateOnly(event.startsAt),
    });
  }

  if (options.includeTasks) {
    for (const task of dataset.tasks) {
      if (!task.dueDate) continue;
      const date = parseDate(task.dueDate);
      if (!date) continue;
      items.push({
        id: `task-${task.id}`,
        date,
        title: task.title,
        kind: "Task",
        applicationId: task.applicationId,
        companyId: null,
        location: null,
        meetingLink: null,
        notes: task.notes,
        allDay: true,
        completed: task.completed,
      });
    }
  }

  return items.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function itemsOnDay(items: CalendarItem[], day: Date): CalendarItem[] {
  return items.filter((item) => isSameDay(item.date, day));
}

/** The six-week grid a month view renders, always starting on Sunday. */
export function monthGrid(month: Date): Date[] {
  const start = startOfWeek(startOfMonth(month));
  const end = endOfWeek(endOfMonth(month));
  const days: Date[] = [];
  for (let day = start; day <= end; day = addDays(day, 1)) days.push(day);
  return days;
}

export function weekGrid(anchor: Date): Date[] {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function monthLabel(month: Date): string {
  return format(month, "MMMM yyyy");
}

export function weekLabel(anchor: Date): string {
  const days = weekGrid(anchor);
  const first = days[0];
  const last = days[6];
  const sameMonth = first.getMonth() === last.getMonth();
  return sameMonth
    ? `${format(first, "MMM d")} – ${format(last, "d, yyyy")}`
    : `${format(first, "MMM d")} – ${format(last, "MMM d, yyyy")}`;
}
