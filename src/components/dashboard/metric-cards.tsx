"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarCheck,
  Clock,
  FileCheck2,
  Minus,
  Percent,
  Trophy,
  UserRoundCheck,
  XCircle,
} from "lucide-react";

import { Hint } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { HeadlineMetrics } from "@/lib/analytics";

interface MetricDefinition {
  key: string;
  label: string;
  value: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  delta?: { value: number; label: string };
  caption?: string;
}

export function MetricCards({ metrics }: { metrics: HeadlineMetrics }) {
  const weekDelta = metrics.thisWeek - metrics.lastWeek;

  const cards: MetricDefinition[] = [
    {
      key: "total",
      label: "Total applications",
      value: String(metrics.total),
      hint: "Every application in the tracker, including saved roles you have not submitted yet.",
      icon: FileCheck2,
      href: "/applications",
      caption: `${metrics.submitted} submitted`,
    },
    {
      key: "week",
      label: "Applications this week",
      value: String(metrics.thisWeek),
      hint: "Applications with an applied date in the last 7 days, compared with the 7 days before.",
      icon: CalendarCheck,
      href: "/applications?view=recently-applied",
      delta: { value: weekDelta, label: "vs previous week" },
    },
    {
      key: "interviews",
      label: "Interviews",
      value: String(metrics.interviews),
      hint: "Applications that reached at least a first-round interview, including ones that later ended.",
      icon: UserRoundCheck,
      href: "/applications?view=interviews",
      caption: `${metrics.interviewRate}% of submitted`,
    },
    {
      key: "offers",
      label: "Offers",
      value: String(metrics.offers),
      hint: "Applications that reached an offer, whether or not you accepted.",
      icon: Trophy,
      href: "/applications?view=offers",
      caption: `${metrics.offerRate}% of submitted`,
    },
    {
      key: "rejections",
      label: "Rejections",
      value: String(metrics.rejections),
      hint: "Applications currently marked as rejected.",
      icon: XCircle,
      href: "/applications?view=rejected",
    },
    {
      key: "awaiting",
      label: "Awaiting response",
      value: String(metrics.awaitingResponse),
      hint: "Submitted, still open, and the company has not replied yet.",
      icon: Clock,
      href: "/applications?view=need-follow-up",
    },
    {
      key: "responseRate",
      label: "Response rate",
      value: `${metrics.responseRate}%`,
      hint: "Applications that received any response — assessment, interview, offer or rejection — divided by submitted applications.",
      icon: Percent,
      href: "/analytics",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
      {cards.map(({ key, ...card }) => (
        <MetricCard key={key} {...card} />
      ))}
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  href,
  delta,
  caption,
}: Omit<MetricDefinition, "key">) {
  const DeltaIcon = !delta ? null : delta.value > 0 ? ArrowUpRight : delta.value < 0 ? ArrowDownRight : Minus;

  return (
    <Hint label={hint}>
      <Link
        href={href}
        className="group flex flex-col gap-1 rounded-lg border border-border bg-card p-3 transition-colors hover:border-foreground/20 hover:bg-accent/40"
      >
        <div className="flex items-center gap-1.5">
          <Icon className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate text-xs text-muted-foreground">{label}</span>
          <ArrowRight className="ml-auto size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
        <p className="text-2xl font-semibold leading-none tracking-tight">{value}</p>
        {delta && DeltaIcon ? (
          <p
            className={cn(
              "flex items-center gap-0.5 text-xs",
              delta.value > 0
                ? "text-emerald-600 dark:text-emerald-400"
                : delta.value < 0
                  ? "text-muted-foreground"
                  : "text-muted-foreground",
            )}
          >
            <DeltaIcon className="size-3" />
            {delta.value > 0 ? `+${delta.value}` : delta.value} {delta.label}
          </p>
        ) : (
          <p className="truncate text-xs text-muted-foreground">{caption ?? " "}</p>
        )}
      </Link>
    </Hint>
  );
}
