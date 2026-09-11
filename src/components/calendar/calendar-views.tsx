"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format, isSameDay, isSameMonth, isToday } from "date-fns";

import { EmptyState } from "@/components/common/empty-state";
import { ITEM_COLORS, itemsOnDay, monthGrid, weekGrid, type CalendarItem } from "@/lib/calendar";
import { cn } from "@/lib/utils";
import { CalendarDays } from "lucide-react";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Clicking an item opens its application when it has one. */
function useOpenItem() {
  const router = useRouter();
  return React.useCallback(
    (item: CalendarItem) => {
      if (item.applicationId) router.push(`/applications/${item.applicationId}`);
      else if (item.companyId) router.push(`/companies/${item.companyId}`);
    },
    [router],
  );
}

function ItemChip({
  item,
  onOpen,
  showTime = true,
}: {
  item: CalendarItem;
  onOpen: (item: CalendarItem) => void;
  showTime?: boolean;
}) {
  const clickable = Boolean(item.applicationId || item.companyId);
  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={() => onOpen(item)}
      title={`${item.title}${item.location ? ` · ${item.location}` : ""}`}
      className={cn(
        "flex w-full items-center gap-1 truncate rounded px-1.5 py-0.5 text-left text-[11px] leading-4 transition-opacity",
        ITEM_COLORS[item.kind],
        clickable ? "cursor-pointer hover:opacity-80" : "cursor-default",
        item.completed && "line-through opacity-60",
      )}
    >
      {showTime && !item.allDay && (
        <span className="shrink-0 font-medium tabular">{format(item.date, "h:mm a")}</span>
      )}
      <span className="truncate">{item.title}</span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  Month                                                                     */
/* -------------------------------------------------------------------------- */

export function MonthView({ month, items }: { month: Date; items: CalendarItem[] }) {
  const open = useOpenItem();
  const days = React.useMemo(() => monthGrid(month), [month]);

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="grid grid-cols-7 border-b border-border bg-muted/40">
        {WEEKDAYS.map((day) => (
          <div key={day} className="px-2 py-1.5 text-center text-xs font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayItems = itemsOnDay(items, day);
          const outside = !isSameMonth(day, month);
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-[104px] border-b border-r border-border p-1.5 last:border-r-0 [&:nth-child(7n)]:border-r-0",
                outside && "bg-muted/20",
              )}
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full text-xs tabular",
                    outside ? "text-muted-foreground/60" : "text-muted-foreground",
                    isToday(day) && "bg-primary font-semibold text-primary-foreground",
                  )}
                >
                  {format(day, "d")}
                </span>
                {dayItems.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">{dayItems.length}</span>
                )}
              </div>

              <div className="flex flex-col gap-0.5">
                {dayItems.slice(0, 3).map((item) => (
                  <ItemChip key={item.id} item={item} onOpen={open} showTime={false} />
                ))}
                {dayItems.length > 3 && (
                  <span className="px-1.5 text-[10px] text-muted-foreground">
                    +{dayItems.length - 3} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Week                                                                      */
/* -------------------------------------------------------------------------- */

export function WeekView({ anchor, items }: { anchor: Date; items: CalendarItem[] }) {
  const open = useOpenItem();
  const days = React.useMemo(() => weekGrid(anchor), [anchor]);

  return (
    <div className="grid gap-2 md:grid-cols-7">
      {days.map((day) => {
        const dayItems = itemsOnDay(items, day);
        return (
          <div
            key={day.toISOString()}
            className={cn(
              "flex min-h-[180px] flex-col rounded-lg border border-border",
              isToday(day) && "border-foreground/30",
            )}
          >
            <header
              className={cn(
                "flex items-baseline justify-between gap-1 border-b border-border px-2 py-1.5",
                isToday(day) && "bg-accent/50",
              )}
            >
              <span className="text-xs font-medium text-muted-foreground">{format(day, "EEE")}</span>
              <span className={cn("text-sm tabular", isToday(day) && "font-semibold")}>
                {format(day, "d")}
              </span>
            </header>
            <div className="flex flex-1 flex-col gap-1 p-1.5">
              {dayItems.length === 0 ? (
                <span className="mt-2 text-center text-[11px] text-muted-foreground/70">—</span>
              ) : (
                dayItems.map((item) => <ItemChip key={item.id} item={item} onOpen={open} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Agenda                                                                    */
/* -------------------------------------------------------------------------- */

export function AgendaView({ items }: { items: CalendarItem[] }) {
  const open = useOpenItem();

  const groups = React.useMemo(() => {
    const map: { day: Date; items: CalendarItem[] }[] = [];
    for (const item of items) {
      const last = map[map.length - 1];
      if (last && isSameDay(last.day, item.date)) last.items.push(item);
      else map.push({ day: item.date, items: [item] });
    }
    return map;
  }, [items]);

  if (groups.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Nothing scheduled"
        description="Interviews, deadlines and events you add show up here in date order."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {groups.map((group) => (
        <li key={group.day.toISOString()} className="grid gap-2 sm:grid-cols-[120px_1fr]">
          <div className="pt-0.5">
            <p className={cn("text-sm font-medium", isToday(group.day) && "text-foreground")}>
              {format(group.day, "EEE, MMM d")}
            </p>
            <p className="text-xs text-muted-foreground">
              {isToday(group.day) ? "Today" : format(group.day, "yyyy")}
            </p>
          </div>
          <ul className="flex flex-col gap-1.5">
            {group.items.map((item) => (
              <li key={item.id} className="rounded-md border border-border p-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn("rounded px-1.5 py-0.5 text-[11px] font-medium", ITEM_COLORS[item.kind])}
                  >
                    {item.kind}
                  </span>
                  <button
                    type="button"
                    onClick={() => open(item)}
                    disabled={!item.applicationId && !item.companyId}
                    className={cn(
                      "truncate text-sm font-medium",
                      (item.applicationId || item.companyId) && "hover:underline",
                      item.completed && "text-muted-foreground line-through",
                    )}
                  >
                    {item.title}
                  </button>
                  {!item.allDay && (
                    <span className="text-xs text-muted-foreground tabular">
                      {format(item.date, "h:mm a")}
                    </span>
                  )}
                </div>
                {(item.location || item.notes) && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {[item.location, item.notes].filter(Boolean).join(" · ")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
