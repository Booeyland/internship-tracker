"use client";

import * as React from "react";
import { BarChart3 } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataGuard } from "@/components/common/data-guard";
import { PageHeader } from "@/components/common/page-header";
import { Section } from "@/components/common/section";
import { EmptyState } from "@/components/common/empty-state";
import {
  ApplicationsOverTime,
  CategoryBars,
  FunnelBars,
  Meter,
} from "@/components/analytics/charts";
import { BreakdownTable } from "@/components/analytics/breakdown-table";
import { useTracker } from "@/hooks/use-tracker";
import {
  ACTIVITY_RANGES,
  activitySeries,
  breakdownBy,
  conversionFunnel,
  headlineMetrics,
  responseTimes,
  stageFlags,
  volumeStats,
  type ActivityRange,
} from "@/lib/analytics";

type OutcomeDimension = "industry" | "source" | "location" | "company" | "resume";

const OUTCOME_DIMENSIONS: { id: OutcomeDimension; label: string }[] = [
  { id: "industry", label: "Industry" },
  { id: "source", label: "Source" },
  { id: "location", label: "Location" },
  { id: "company", label: "Company" },
  { id: "resume", label: "Resume version" },
];

export default function AnalyticsPage() {
  return (
    <DataGuard skeleton={<AnalyticsSkeleton />}>
      <AnalyticsScreen />
    </DataGuard>
  );
}

function AnalyticsScreen() {
  const { applications } = useTracker();
  const [range, setRange] = React.useState<ActivityRange>("90d");
  const [dimension, setDimension] = React.useState<OutcomeDimension>("source");

  const metrics = React.useMemo(() => headlineMetrics(applications), [applications]);
  const funnel = React.useMemo(() => conversionFunnel(applications), [applications]);
  const volume = React.useMemo(() => volumeStats(applications), [applications]);
  const times = React.useMemo(() => responseTimes(applications), [applications]);
  const activity = React.useMemo(() => activitySeries(applications, range), [applications, range]);

  const bySource = React.useMemo(() => breakdownBy(applications, (a) => a.source), [applications]);
  const byIndustry = React.useMemo(
    () => breakdownBy(applications, (a) => a.industry),
    [applications],
  );

  const outcomeRows = React.useMemo(() => {
    switch (dimension) {
      case "industry":
        return byIndustry;
      case "source":
        return bySource;
      case "location":
        return breakdownBy(applications, (a) => a.location);
      case "company":
        return breakdownBy(applications, (a) => a.company.name);
      case "resume":
        return breakdownBy(applications, (a) => a.resumeVersion?.name ?? null, {
          fallback: "No resume tracked",
        });
    }
  }, [dimension, applications, byIndustry, bySource]);

  const interviewsByIndustry = React.useMemo(
    () =>
      byIndustry
        .filter((row) => row.interviews > 0)
        .map((row) => ({
          key: row.key,
          value: row.interviews,
          secondary: { name: "Interview rate", value: `${row.interviewRate}%` },
        })),
    [byIndustry],
  );

  const applicationsBySource = React.useMemo(
    () =>
      bySource.map((row) => ({
        key: row.key,
        value: row.applications,
        secondary: { name: "Interview rate", value: `${row.interviewRate}%` },
      })),
    [bySource],
  );

  if (applications.length === 0) {
    return (
      <>
        <PageHeader title="Analytics" description="Which recruiting strategies are actually working." />
        <div className="p-4 lg:p-6">
          <EmptyState
            icon={BarChart3}
            title="No data to analyse yet"
            description="Add a few applications and the funnel, conversion rates and response times will fill in automatically."
          />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Every figure is computed from the applications in your tracker."
      />

      <div className="flex flex-col gap-4 p-4 lg:p-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <StatTile label="Total applications" value={String(metrics.total)} caption={`${metrics.submitted} submitted`} />
          <StatTile
            label="Average per week"
            value={String(volume.averagePerWeek)}
            caption={`${volume.activeWeeks} active week${volume.activeWeeks === 1 ? "" : "s"}`}
          />
          <StatTile
            label="Response rate"
            value={`${metrics.responseRate}%`}
            caption="of submitted applications"
          />
          <StatTile
            label="Interview rate"
            value={`${metrics.interviewRate}%`}
            caption={`${metrics.interviews} reached an interview`}
          />
          <StatTile
            label="Offer rate"
            value={`${metrics.offerRate}%`}
            caption={`${metrics.offers} offer${metrics.offers === 1 ? "" : "s"}`}
          />
          <StatTile
            label="Still awaiting"
            value={String(metrics.awaitingResponse)}
            caption="no response yet"
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Section
            title="Applications over time"
            description="Submissions per period."
            actions={
              <Tabs value={range} onValueChange={(value) => setRange(value as ActivityRange)}>
                <TabsList>
                  {ACTIVITY_RANGES.map((option) => (
                    <TabsTrigger key={option.id} value={option.id}>
                      {option.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            }
          >
            <ApplicationsOverTime data={activity} height={220} />
          </Section>

          <Section
            title="Conversion funnel"
            description="Applications that reached each stage or went further, including ones that later closed."
          >
            <FunnelBars data={funnel.steps} />
            <ul className="mt-3 flex flex-col gap-1 border-t border-border pt-3">
              {funnel.steps.slice(1).map((step, index) => (
                <li key={step.label} className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-muted-foreground">
                    {funnel.steps[index].label} → {step.label}
                  </span>
                  <span className="tabular font-medium">
                    {step.fromPrevious}%
                    <span className="ml-1.5 font-normal text-muted-foreground">
                      ({step.count} of {funnel.steps[index].count})
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              Each stage counts applications that got at least that far, so the steps nest and the
              percentages compare like with like. Not every process has an assessment —{" "}
              <span className="font-medium text-foreground">
                {funnel.actualAssessments} application{funnel.actualAssessments === 1 ? "" : "s"}
              </span>{" "}
              actually sat one.
            </p>
          </Section>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Section
            title="Applications by source"
            description="Where your applications come from."
          >
            <CategoryBars data={applicationsBySource} valueLabel="Applications" />
          </Section>

          <Section title="Interviews by industry" description="Which industries convert to interviews.">
            {interviewsByIndustry.length === 0 ? (
              <EmptyState
                compact
                icon={BarChart3}
                title="No interviews yet"
                description="Once an application reaches an interview round it will appear here."
              />
            ) : (
              <CategoryBars data={interviewsByIndustry} valueLabel="Interviews" />
            )}
          </Section>
        </div>

        <Section
          title="Source effectiveness"
          description="Applications and interview conversion for each source."
          bodyClassName="px-4 pb-3 pt-0"
        >
          <BreakdownTable rows={bySource} dimensionLabel="Source" />
        </Section>

        <div className="grid gap-4 xl:grid-cols-3">
          <Section title="Response time" description="Averages across applications with dates.">
            <ul className="flex flex-col divide-y divide-border">
              <TimeRow
                label="Application → first response"
                days={times.toFirstResponse}
                sample={times.sampleSizes.firstResponse}
              />
              <TimeRow
                label="Application → interview"
                days={times.toInterview}
                sample={times.sampleSizes.interview}
              />
              <TimeRow
                label="Application → final decision"
                days={times.toDecision}
                sample={times.sampleSizes.decision}
              />
            </ul>
          </Section>

          <Section
            className="xl:col-span-2"
            title="Application volume"
            description="Per month, from the applied dates on record."
          >
            {volume.perMonth.length === 0 ? (
              <EmptyState
                compact
                icon={BarChart3}
                title="No applied dates yet"
                description="Set an applied date on an application to see volume over time."
              />
            ) : (
              <ul className="flex flex-col gap-2">
                {volume.perMonth.map((month) => {
                  const max = Math.max(...volume.perMonth.map((item) => item.count), 1);
                  return (
                    <li key={month.key} className="flex items-center gap-3">
                      <span className="w-20 shrink-0 text-xs text-muted-foreground">{month.label}</span>
                      <Meter value={month.count} max={max} className="flex-1" />
                      <span className="w-6 shrink-0 text-right tabular text-xs">{month.count}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>
        </div>

        <Section
          title="Outcome analysis"
          description="Compare where interviews and offers actually come from."
          actions={
            <Tabs value={dimension} onValueChange={(value) => setDimension(value as OutcomeDimension)}>
              <TabsList>
                {OUTCOME_DIMENSIONS.map((option) => (
                  <TabsTrigger key={option.id} value={option.id}>
                    {option.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          }
          bodyClassName="px-4 pb-3 pt-0"
        >
          <BreakdownTable
            rows={outcomeRows}
            dimensionLabel={OUTCOME_DIMENSIONS.find((d) => d.id === dimension)?.label ?? "Group"}
          />
        </Section>

        <Section title="Where every application stands" description="Furthest stage reached, per application.">
          <ul className="flex flex-col divide-y divide-border">
            {applications.map((application) => {
              const flags = stageFlags(application);
              const reached = flags.offer
                ? "Offer"
                : flags.finalRound
                  ? "Final round"
                  : flags.interview
                    ? "Interview"
                    : flags.assessment
                      ? "Assessment"
                      : flags.applied
                        ? "Applied"
                        : "Not applied";
              return (
                <li
                  key={application.id}
                  className="flex items-center justify-between gap-3 py-1.5 text-sm first:pt-0 last:pb-0"
                >
                  <span className="min-w-0 truncate">
                    <span className="font-medium">{application.company.name}</span>
                    <span className="text-muted-foreground"> · {application.position}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{reached}</span>
                </li>
              );
            })}
          </ul>
        </Section>
      </div>
    </>
  );
}

function StatTile({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3">
      <span className="truncate text-xs text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold leading-none tracking-tight">{value}</span>
      <span className="truncate text-xs text-muted-foreground">{caption}</span>
    </div>
  );
}

function TimeRow({
  label,
  days,
  sample,
}: {
  label: string;
  days: number | null;
  sample: number;
}) {
  return (
    <li className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="truncate text-sm">{label}</p>
        <p className="text-xs text-muted-foreground">
          {sample === 0 ? "No data yet" : `${sample} application${sample === 1 ? "" : "s"}`}
        </p>
      </div>
      <span className="shrink-0 text-lg font-semibold tabular">
        {days === null ? "—" : `${days}d`}
      </span>
    </li>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      <Skeleton className="h-8 w-36" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-[86px]" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
