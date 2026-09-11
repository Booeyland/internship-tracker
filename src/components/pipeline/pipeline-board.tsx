"use client";

import * as React from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CalendarClock, GripVertical, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { CompanyAvatar } from "@/components/common/company-avatar";
import { StatusBadge } from "@/components/applications/status-badge";
import { useTracker } from "@/hooks/use-tracker";
import { STAGE_DEFAULT_STATUS, stageForStatus } from "@/lib/status";
import { appliedPhrase, relativeDay } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { PIPELINE_STAGES, type ApplicationWithRelations, type PipelineStage } from "@/types";

/* -------------------------------------------------------------------------- */
/*  Card                                                                      */
/* -------------------------------------------------------------------------- */

function CardBody({ application }: { application: ApplicationWithRelations }) {
  return (
    <>
      <div className="flex items-start gap-2">
        <CompanyAvatar company={application.company} className="size-6 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-tight">{application.company.name}</p>
          <p className="truncate text-xs text-muted-foreground">{application.position}</p>
        </div>
        <GripVertical className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-60" />
      </div>

      <div className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
        {application.location && (
          <span className="inline-flex items-center gap-1 truncate">
            <MapPin className="size-3 shrink-0" />
            {application.location}
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <CalendarClock className="size-3 shrink-0" />
          {application.dateApplied ? appliedPhrase(application.dateApplied) : "Not applied yet"}
        </span>
        {application.deadline && !application.dateApplied && (
          <span className="text-amber-600 dark:text-amber-400">
            Deadline {relativeDay(application.deadline)}
          </span>
        )}
      </div>

      {application.nextAction && (
        <p className="mt-2 line-clamp-2 rounded bg-muted/60 px-1.5 py-1 text-xs text-muted-foreground">
          {application.nextAction}
        </p>
      )}

      <div className="mt-2">
        <StatusBadge status={application.status} />
      </div>
    </>
  );
}

function DraggableCard({ application }: { application: ApplicationWithRelations }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: application.id,
    data: { application },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "group rounded-md border border-border bg-card p-2.5 transition-shadow",
        isDragging && "opacity-40",
      )}
    >
      <div {...listeners} {...attributes} className="cursor-grab touch-none active:cursor-grabbing">
        <CardBody application={application} />
      </div>
      <Link
        href={`/applications/${application.id}`}
        className="mt-2 block text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        Open details
      </Link>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Column                                                                    */
/* -------------------------------------------------------------------------- */

function Column({
  stage,
  applications,
  highlighted,
}: {
  stage: PipelineStage;
  applications: ApplicationWithRelations[];
  highlighted: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-[260px] shrink-0 flex-col rounded-lg border border-border bg-muted/30 transition-colors",
        isOver && "border-foreground/30 bg-accent/60",
        highlighted && "ring-1 ring-ring",
      )}
    >
      <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <h3 className="truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {stage}
        </h3>
        <Badge variant="muted" className="tabular">
          {applications.length}
        </Badge>
      </header>

      <div className="flex min-h-[120px] flex-1 flex-col gap-2 p-2">
        {applications.length === 0 ? (
          <p className="rounded-md border border-dashed border-border px-2 py-6 text-center text-xs text-muted-foreground">
            Drop an application here
          </p>
        ) : (
          applications.map((application) => (
            <DraggableCard key={application.id} application={application} />
          ))
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Board                                                                     */
/* -------------------------------------------------------------------------- */

export function PipelineBoard({
  applications,
  highlightStage,
}: {
  applications: ApplicationWithRelations[];
  highlightStage: PipelineStage | null;
}) {
  const { updateApplication } = useTracker();
  const [dragging, setDragging] = React.useState<ApplicationWithRelations | null>(null);

  // A small activation distance keeps "Open details" clickable inside a card.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const byStage = React.useMemo(() => {
    const map = new Map<PipelineStage, ApplicationWithRelations[]>(
      PIPELINE_STAGES.map((stage) => [stage, []]),
    );
    for (const application of applications) {
      const stage = stageForStatus(application.status);
      if (stage) map.get(stage)?.push(application);
    }
    return map;
  }, [applications]);

  function onDragStart(event: DragStartEvent) {
    const application = event.active.data.current?.application as ApplicationWithRelations | undefined;
    setDragging(application ?? null);
  }

  function onDragEnd(event: DragEndEvent) {
    setDragging(null);
    const overId = event.over?.id;
    if (!overId) return;

    const targetStage = overId as PipelineStage;
    if (!PIPELINE_STAGES.includes(targetStage)) return;

    const application = event.active.data.current?.application as ApplicationWithRelations | undefined;
    if (!application) return;

    // Dropping inside the same column is a no-op — the status already fits.
    if (stageForStatus(application.status) === targetStage) return;

    void updateApplication(application.id, { status: STAGE_DEFAULT_STATUS[targetStage] });
  }

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto px-4 pb-4 lg:px-6">
        {PIPELINE_STAGES.map((stage) => (
          <Column
            key={stage}
            stage={stage}
            applications={byStage.get(stage) ?? []}
            highlighted={highlightStage === stage}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {dragging && (
          <div className="w-[244px] rotate-1 rounded-md border border-border bg-card p-2.5 shadow-lg">
            <CardBody application={dragging} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
