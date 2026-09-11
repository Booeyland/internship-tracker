"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Archive, KanbanSquare, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DataGuard } from "@/components/common/data-guard";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { PipelineBoard } from "@/components/pipeline/pipeline-board";
import { useTracker } from "@/hooks/use-tracker";
import { useUi } from "@/hooks/use-ui";
import { CLOSED_STATUSES, stageForStatus } from "@/lib/status";
import { PIPELINE_STAGES, type PipelineStage } from "@/types";

export default function PipelinePage() {
  return (
    <DataGuard skeleton={<PipelineSkeleton />}>
      <React.Suspense fallback={<PipelineSkeleton />}>
        <PipelineScreen />
      </React.Suspense>
    </DataGuard>
  );
}

function PipelineScreen() {
  const searchParams = useSearchParams();
  const { applications } = useTracker();
  const { openComposer } = useUi();

  // The dashboard links here with a stage to highlight; "Saved" maps to "Interested".
  const requested = searchParams.get("stage");
  const highlightStage: PipelineStage | null = React.useMemo(() => {
    if (!requested) return null;
    if (requested === "Saved") return "Interested";
    return PIPELINE_STAGES.includes(requested as PipelineStage) ? (requested as PipelineStage) : null;
  }, [requested]);

  const onBoard = React.useMemo(
    () => applications.filter((application) => stageForStatus(application.status) !== null),
    [applications],
  );
  const closed = React.useMemo(
    () => applications.filter((application) => CLOSED_STATUSES.has(application.status)),
    [applications],
  );

  return (
    <>
      <PageHeader
        title="Pipeline"
        description="Drag an application between columns to change its status."
        actions={
          <Button size="sm" onClick={() => openComposer()}>
            <Plus />
            Add application
          </Button>
        }
      />

      {onBoard.length === 0 ? (
        <div className="p-4 lg:p-6">
          <EmptyState
            icon={KanbanSquare}
            title="Nothing in the pipeline"
            description="Applications appear here as soon as you add them. Closed applications are kept off the board."
            action={
              <Button size="sm" onClick={() => openComposer()}>
                <Plus />
                Add application
              </Button>
            }
          />
        </div>
      ) : (
        <div className="pt-4">
          <PipelineBoard applications={onBoard} highlightStage={highlightStage} />
        </div>
      )}

      {closed.length > 0 && (
        <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground lg:px-6">
          <Archive className="mr-1.5 inline size-3" />
          {closed.length} closed application{closed.length === 1 ? "" : "s"} (rejected, withdrawn or
          ghosted) are kept off the board —{" "}
          <Link href="/applications?view=rejected" className="underline underline-offset-2">
            review them
          </Link>
          .
        </div>
      )}
    </>
  );
}

function PipelineSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      <Skeleton className="h-8 w-36" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-80 w-[260px] shrink-0" />
        ))}
      </div>
    </div>
  );
}
