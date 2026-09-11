"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, ListTodo, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { DataGuard } from "@/components/common/data-guard";
import { PageHeader } from "@/components/common/page-header";
import { Section } from "@/components/common/section";
import { TaskList } from "@/components/common/task-list";
import { TaskDialog } from "@/components/common/task-dialog";
import { MetricCards } from "@/components/dashboard/metric-cards";
import { PipelineStrip } from "@/components/dashboard/pipeline-strip";
import { RecentApplications } from "@/components/dashboard/recent-applications";
import { UpcomingInterviews } from "@/components/dashboard/upcoming-interviews";
import { NeedsAttention } from "@/components/dashboard/needs-attention";
import { ApplicationsOverTime } from "@/components/analytics/charts";
import { useTracker } from "@/hooks/use-tracker";
import { useUi } from "@/hooks/use-ui";
import {
  ACTIVITY_RANGES,
  activitySeries,
  headlineMetrics,
  pipelineCounts,
  type ActivityRange,
} from "@/lib/analytics";
import { followUpSuggestions } from "@/lib/follow-ups";
import { compareValues } from "@/lib/utils";

export default function DashboardPage() {
  return (
    <DataGuard skeleton={<DashboardSkeleton />}>
      <Dashboard />
    </DataGuard>
  );
}

function Dashboard() {
  const { applications, dataset } = useTracker();
  const { openComposer } = useUi();
  const [range, setRange] = React.useState<ActivityRange>("30d");
  const [taskOpen, setTaskOpen] = React.useState(false);

  const metrics = React.useMemo(() => headlineMetrics(applications), [applications]);
  const stages = React.useMemo(() => pipelineCounts(applications), [applications]);
  const activity = React.useMemo(() => activitySeries(applications, range), [applications, range]);

  const suggestions = React.useMemo(
    () => followUpSuggestions(applications, dataset.dismissedSuggestions),
    [applications, dataset.dismissedSuggestions],
  );

  const recent = React.useMemo(
    () => [...applications].sort((a, b) => compareValues(b.updatedAt, a.updatedAt)).slice(0, 8),
    [applications],
  );

  const upcomingTasks = React.useMemo(
    () =>
      dataset.tasks
        .filter((task) => !task.completed)
        .sort((a, b) => compareValues(a.dueDate, b.dueDate))
        .slice(0, 7),
    [dataset.tasks],
  );

  const upcomingInterviews = React.useMemo(() => {
    const cutoff = Date.now() - 6 * 60 * 60 * 1000;
    return applications
      .flatMap((application) =>
        application.interviews
          .filter((interview) => {
            if (!interview.scheduledAt) return false;
            return new Date(interview.scheduledAt).getTime() >= cutoff;
          })
          .map((interview) => ({ interview, application })),
      )
      .sort((a, b) => compareValues(a.interview.scheduledAt, b.interview.scheduledAt))
      .slice(0, 5);
  }, [applications]);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Where your internship search stands today."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setTaskOpen(true)}>
              <ListTodo />
              Add task
            </Button>
            <Button size="sm" onClick={() => openComposer()}>
              <Plus />
              Add application
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-4 p-4 lg:p-6">
        <MetricCards metrics={metrics} />

        <Section
          title="Application pipeline"
          description="How many applications sit at each stage right now."
          actions={
            <Button asChild variant="ghost" size="xs">
              <Link href="/pipeline">
                Open board <ArrowRight />
              </Link>
            </Button>
          }
        >
          <PipelineStrip stages={stages} />
        </Section>

        <div className="grid gap-4 xl:grid-cols-3">
          <Section
            className="xl:col-span-2"
            title="Recruiting activity"
            description="Applications submitted over time."
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
            title="Needs attention"
            description="Follow-ups the tracker spotted."
            actions={
              suggestions.length > 0 ? (
                <span className="tabular text-xs text-muted-foreground">{suggestions.length}</span>
              ) : null
            }
          >
            <NeedsAttention suggestions={suggestions} limit={4} />
          </Section>
        </div>

        <Section
          title="Recent applications"
          description="Most recently updated."
          actions={
            <Button asChild variant="ghost" size="xs">
              <Link href="/applications">
                View all <ArrowRight />
              </Link>
            </Button>
          }
          bodyClassName="px-4 pb-2 pt-0"
        >
          <RecentApplications applications={recent} onAdd={() => openComposer()} />
        </Section>

        <div className="grid gap-4 lg:grid-cols-2">
          <Section
            title="Upcoming tasks"
            description="Sorted by due date."
            actions={
              <Button variant="ghost" size="xs" onClick={() => setTaskOpen(true)}>
                <Plus />
                Add
              </Button>
            }
            bodyClassName="px-4 py-1"
          >
            <TaskList
              tasks={upcomingTasks}
              showApplication
              emptyMessage="No open tasks. Add one to stay on top of follow-ups."
            />
          </Section>

          <Section
            title="Upcoming interviews"
            description="Scheduled interviews, soonest first."
            actions={
              <Button asChild variant="ghost" size="xs">
                <Link href="/calendar">
                  Calendar <ArrowRight />
                </Link>
              </Button>
            }
          >
            <UpcomingInterviews items={upcomingInterviews} />
          </Section>
        </div>
      </div>

      <TaskDialog open={taskOpen} onOpenChange={setTaskOpen} />
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      <Skeleton className="h-8 w-44" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
        {Array.from({ length: 7 }).map((_, index) => (
          <Skeleton key={index} className="h-[86px]" />
        ))}
      </div>
      <Skeleton className="h-28" />
      <div className="grid gap-4 xl:grid-cols-3">
        <Skeleton className="h-72 xl:col-span-2" />
        <Skeleton className="h-72" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
