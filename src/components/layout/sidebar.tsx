"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  CalendarDays,
  KanbanSquare,
  LayoutDashboard,
  Plus,
  Settings,
  Table2,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTracker } from "@/hooks/use-tracker";
import { useUi } from "@/hooks/use-ui";
import { ACTIVE_STATUSES } from "@/lib/status";
import { isOverdue } from "@/lib/dates";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Which live count to show as a trailing badge, if any. */
  badge?: "active" | "tasks" | "upcoming" | "companies" | "contacts";
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/applications", label: "Applications", icon: Table2, badge: "active" },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/calendar", label: "Calendar", icon: CalendarDays, badge: "upcoming" },
  { href: "/companies", label: "Companies", icon: Building2, badge: "companies" },
  { href: "/contacts", label: "Contacts", icon: Users, badge: "contacts" },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { applications, dataset } = useTracker();
  const { openComposer } = useUi();

  const counts = React.useMemo(() => {
    const openTasks = dataset.tasks.filter((task) => !task.completed);
    return {
      active: applications.filter((a) => ACTIVE_STATUSES.includes(a.status)).length,
      tasks: openTasks.length,
      overdueTasks: openTasks.filter((task) => isOverdue(task.dueDate)).length,
      upcoming: dataset.recruitingEvents.filter((event) => {
        const start = new Date(event.startsAt).getTime();
        const in14Days = Date.now() + 14 * 24 * 60 * 60 * 1000;
        return start >= Date.now() - 12 * 60 * 60 * 1000 && start <= in14Days;
      }).length,
      companies: dataset.companies.length,
      contacts: dataset.contacts.length,
    };
  }, [applications, dataset]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <Button
        size="sm"
        className="w-full justify-start gap-2"
        onClick={() => {
          openComposer();
          onNavigate?.();
        }}
      >
        <Plus />
        Add application
        <kbd className="ml-auto rounded border border-primary-foreground/25 px-1 text-[10px] font-medium opacity-70">
          N
        </kbd>
      </Button>

      <nav className="flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          const count = item.badge ? counts[item.badge] : undefined;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              )}
            >
              <item.icon className="size-4 shrink-0" />
              <span className="truncate">{item.label}</span>
              {count !== undefined && count > 0 && (
                <span className="ml-auto tabular text-xs text-muted-foreground">{count}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-md border border-sidebar-border bg-background/50 p-3">
        <p className="text-xs font-medium">Open tasks</p>
        <p className="mt-1 text-2xl font-semibold tabular leading-none">{counts.tasks}</p>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {counts.overdueTasks > 0
            ? `${counts.overdueTasks} overdue`
            : counts.tasks > 0
              ? "Nothing overdue"
              : "You are all caught up"}
        </p>
      </div>
    </div>
  );
}
