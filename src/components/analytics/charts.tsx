"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Shared chart chrome                                                       */
/* -------------------------------------------------------------------------- */

const AXIS_TICK = { fontSize: 11, fill: "var(--viz-muted)" } as const;

/** Tooltip surface shared by every chart, so hover reads the same everywhere. */
function TooltipCard({
  label,
  rows,
}: {
  label: string;
  rows: { name: string; value: React.ReactNode; color?: string }[];
}) {
  return (
    <div className="rounded-md border border-border bg-popover px-2.5 py-2 text-xs shadow-md">
      <p className="font-medium text-popover-foreground">{label}</p>
      <div className="mt-1 flex flex-col gap-1">
        {rows.map((row) => (
          <div key={row.name} className="flex items-center gap-2">
            {row.color && (
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-[2px]"
                style={{ backgroundColor: row.color }}
              />
            )}
            <span className="text-muted-foreground">{row.name}</span>
            <span className="ml-auto tabular font-medium text-popover-foreground">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface TooltipPayloadEntry {
  payload?: Record<string, unknown>;
  value?: number | string;
}

/* -------------------------------------------------------------------------- */
/*  Time series                                                               */
/* -------------------------------------------------------------------------- */

export interface TimePoint {
  label: string;
  applications: number;
}

/**
 * Applications submitted per bucket. One series, so no legend is needed — the
 * panel title names it. Bars carry rounded data-ends anchored to the baseline.
 */
export function ApplicationsOverTime({
  data,
  height = 200,
}: {
  data: TimePoint[];
  height?: number;
}) {
  const total = data.reduce((sum, point) => sum + point.applications, 0);
  const showEveryTick = data.length <= 10;

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -18 }} barCategoryGap={2}>
          <CartesianGrid vertical={false} stroke="var(--viz-grid)" strokeDasharray="0" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: "var(--viz-axis)" }}
            tick={AXIS_TICK}
            interval={showEveryTick ? 0 : "preserveStartEnd"}
            minTickGap={16}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={AXIS_TICK}
            allowDecimals={false}
            width={40}
          />
          <Tooltip
            cursor={{ fill: "var(--viz-grid)", fillOpacity: 0.45 }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const value = (payload[0] as TooltipPayloadEntry).value ?? 0;
              return (
                <TooltipCard
                  label={String(label)}
                  rows={[
                    {
                      name: "Applications",
                      value: `${value}`,
                      color: "var(--viz-series-1)",
                    },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="applications" fill="var(--viz-series-1)" radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
      <p className="sr-only">{`${total} applications submitted across ${data.length} periods.`}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Horizontal category bars                                                  */
/* -------------------------------------------------------------------------- */

export interface CategoryPoint {
  key: string;
  value: number;
  /** Optional secondary figure shown in the tooltip (e.g. interview rate). */
  secondary?: { name: string; value: string };
}

/**
 * One measure across categories, so every bar is the same hue — colour is not
 * carrying identity here, position and the axis label are.
 */
export function CategoryBars({
  data,
  valueLabel,
  height,
}: {
  data: CategoryPoint[];
  valueLabel: string;
  height?: number;
}) {
  const computedHeight = height ?? Math.max(120, data.length * 28 + 24);

  return (
    <div style={{ height: computedHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
          barCategoryGap={2}
        >
          <CartesianGrid horizontal={false} stroke="var(--viz-grid)" />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            tick={AXIS_TICK}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="key"
            tickLine={false}
            axisLine={false}
            tick={AXIS_TICK}
            width={128}
          />
          <Tooltip
            cursor={{ fill: "var(--viz-grid)", fillOpacity: 0.45 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const point = (payload[0] as TooltipPayloadEntry).payload as CategoryPoint | undefined;
              if (!point) return null;
              return (
                <TooltipCard
                  label={point.key}
                  rows={[
                    { name: valueLabel, value: point.value, color: "var(--viz-series-1)" },
                    ...(point.secondary
                      ? [{ name: point.secondary.name, value: point.secondary.value }]
                      : []),
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="value" fill="var(--viz-series-1)" radius={[0, 4, 4, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Funnel                                                                    */
/* -------------------------------------------------------------------------- */

/** Ordinal ramp: one hue, light → dark as the funnel narrows. */
const FUNNEL_STEPS = [
  "var(--viz-step-1)",
  "var(--viz-step-2)",
  "var(--viz-step-3)",
  "var(--viz-step-4)",
  "var(--viz-step-5)",
];

export interface FunnelPoint {
  label: string;
  count: number;
  fromPrevious: number;
  fromStart: number;
}

export function FunnelBars({ data }: { data: FunnelPoint[] }) {
  return (
    <div style={{ height: Math.max(160, data.length * 34 + 16) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 40, bottom: 0, left: 0 }}
          barCategoryGap={2}
        >
          <CartesianGrid horizontal={false} stroke="var(--viz-grid)" />
          <XAxis type="number" tickLine={false} axisLine={false} tick={AXIS_TICK} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={AXIS_TICK}
            width={96}
          />
          <Tooltip
            cursor={{ fill: "var(--viz-grid)", fillOpacity: 0.45 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const point = (payload[0] as TooltipPayloadEntry).payload as FunnelPoint | undefined;
              if (!point) return null;
              return (
                <TooltipCard
                  label={point.label}
                  rows={[
                    { name: "Applications", value: point.count },
                    { name: "From previous stage", value: `${point.fromPrevious}%` },
                    { name: "From all applications", value: `${point.fromStart}%` },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={22}>
            {data.map((point, index) => (
              <Cell key={point.label} fill={FUNNEL_STEPS[Math.min(index, FUNNEL_STEPS.length - 1)]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Inline meter                                                              */
/* -------------------------------------------------------------------------- */

/** A single-value bar used inside tables, where a full chart would be noise. */
export function Meter({
  value,
  max,
  className,
  tone = "series",
}: {
  value: number;
  max: number;
  className?: string;
  tone?: "series" | "muted";
}) {
  const width = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className="h-full rounded-full"
        style={{
          width: `${width}%`,
          backgroundColor: tone === "series" ? "var(--viz-series-1)" : "var(--viz-axis)",
        }}
      />
    </div>
  );
}
