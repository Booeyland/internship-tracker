"use client";

import * as React from "react";
import { addMonths, addWeeks, isAfter, startOfDay, subMonths, subWeeks } from "date-fns";
import { CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataGuard } from "@/components/common/data-guard";
import { PageHeader } from "@/components/common/page-header";
import { AgendaView, MonthView, WeekView } from "@/components/calendar/calendar-views";
import { EventDialog } from "@/components/calendar/event-dialog";
import { useTracker } from "@/hooks/use-tracker";
import { buildCalendarItems, monthLabel, weekLabel } from "@/lib/calendar";
import { todayIso } from "@/lib/dates";

type ViewMode = "month" | "week" | "agenda";

export default function CalendarPage() {
  return (
    <DataGuard skeleton={<CalendarSkeleton />}>
      <CalendarScreen />
    </DataGuard>
  );
}

function CalendarScreen() {
  const { dataset } = useTracker();
  const [mode, setMode] = React.useState<ViewMode>("month");
  const [anchor, setAnchor] = React.useState(() => new Date());
  const [includeTasks, setIncludeTasks] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const items = React.useMemo(
    () => buildCalendarItems(dataset, { includeTasks }),
    [dataset, includeTasks],
  );

  // The agenda only looks forward — history lives on each application's timeline.
  const agendaItems = React.useMemo(() => {
    const from = startOfDay(new Date());
    return items.filter((item) => isAfter(item.date, from) || item.date >= from);
  }, [items]);

  const step = (direction: -1 | 1) => {
    setAnchor((current) =>
      mode === "week"
        ? direction === 1
          ? addWeeks(current, 1)
          : subWeeks(current, 1)
        : direction === 1
          ? addMonths(current, 1)
          : subMonths(current, 1),
    );
  };

  const label = mode === "week" ? weekLabel(anchor) : mode === "month" ? monthLabel(anchor) : "Upcoming";

  return (
    <>
      <PageHeader
        title="Calendar"
        description="Deadlines, interviews, assessments and networking in one place."
        actions={
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <CalendarPlus />
            Add event
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5 lg:px-6">
        {mode !== "agenda" && (
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon-sm" onClick={() => step(-1)} aria-label="Previous">
              <ChevronLeft />
            </Button>
            <Button variant="outline" size="icon-sm" onClick={() => step(1)} aria-label="Next">
              <ChevronRight />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAnchor(new Date())}>
              Today
            </Button>
          </div>
        )}

        <span className="text-sm font-medium">{label}</span>

        <div className="ml-auto flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
            <Checkbox
              checked={includeTasks}
              onCheckedChange={(checked) => setIncludeTasks(checked === true)}
            />
            Show tasks
          </label>
          <Tabs value={mode} onValueChange={(value) => setMode(value as ViewMode)}>
            <TabsList>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="agenda">Agenda</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="p-4 lg:p-6">
        {mode === "month" && <MonthView month={anchor} items={items} />}
        {mode === "week" && <WeekView anchor={anchor} items={items} />}
        {mode === "agenda" && <AgendaView items={agendaItems} />}
      </div>

      <EventDialog open={dialogOpen} onOpenChange={setDialogOpen} defaultDate={todayIso()} />
    </>
  );
}

function CalendarSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      <Skeleton className="h-8 w-36" />
      <Skeleton className="h-[520px] w-full" />
    </div>
  );
}
