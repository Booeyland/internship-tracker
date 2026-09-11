"use client";

import * as React from "react";
import {
  Award,
  CircleDot,
  FileText,
  Mail,
  MessageSquare,
  Plus,
  Send,
  Trash2,
  UserRoundCheck,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/common/field";
import { EnumSelect } from "@/components/common/enum-select";
import { EmptyState } from "@/components/common/empty-state";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { useTracker } from "@/hooks/use-tracker";
import { formatDate, todayIso } from "@/lib/dates";
import { TIMELINE_EVENT_KINDS, type TimelineEvent, type TimelineEventKind } from "@/types";

const KIND_ICONS: Record<TimelineEventKind, React.ComponentType<{ className?: string }>> = {
  "Status Change": CircleDot,
  Applied: Send,
  Assessment: FileText,
  Interview: UserRoundCheck,
  Communication: Mail,
  Note: MessageSquare,
  Offer: Award,
  Rejection: XCircle,
  Other: CircleDot,
};

/**
 * Vertical chronological record of everything that happened on an application.
 * Status changes are appended automatically; users can add anything else.
 */
export function RecruitingTimeline({
  applicationId,
  events,
}: {
  applicationId: string;
  events: TimelineEvent[];
}) {
  const { createTimelineEvent, deleteTimelineEvent, saving } = useTracker();
  const [open, setOpen] = React.useState(false);
  const [pendingDelete, setPendingDelete] = React.useState<TimelineEvent | null>(null);
  const [draft, setDraft] = React.useState({
    kind: "Note" as TimelineEventKind,
    title: "",
    description: "",
    date: todayIso(),
  });
  const [error, setError] = React.useState<string | null>(null);

  const ordered = React.useMemo(
    () => [...events].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
    [events],
  );

  async function submit() {
    if (!draft.title.trim()) {
      setError("Give the event a title");
      return;
    }
    const created = await createTimelineEvent({
      applicationId,
      kind: draft.kind,
      title: draft.title.trim(),
      description: draft.description.trim() || null,
      occurredAt: new Date(`${draft.date}T12:00:00`).toISOString(),
    });
    if (created) {
      setOpen(false);
      setDraft({ kind: "Note", title: "", description: "", date: todayIso() });
      setError(null);
    }
  }

  return (
    <>
      <div className="flex items-center justify-end pb-2">
        <Button variant="outline" size="xs" onClick={() => setOpen(true)}>
          <Plus />
          Add event
        </Button>
      </div>

      {ordered.length === 0 ? (
        <EmptyState
          compact
          icon={CircleDot}
          title="No timeline events yet"
          description="Status changes are recorded automatically. Add anything else worth remembering."
        />
      ) : (
        <ol className="relative flex flex-col">
          {ordered.map((event, index) => {
            const Icon = KIND_ICONS[event.kind] ?? CircleDot;
            const isLast = index === ordered.length - 1;
            return (
              <li key={event.id} className="group relative flex gap-3 pb-4 last:pb-0">
                {!isLast && (
                  <span
                    aria-hidden
                    className="absolute left-[11px] top-6 h-[calc(100%-1rem)] w-px bg-border"
                  />
                )}
                <span className="relative z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground">
                  <Icon className="size-3" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">{formatDate(event.occurredAt)}</p>
                  <p className="text-sm font-medium leading-snug">{event.title}</p>
                  {event.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{event.description}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                  aria-label={`Delete timeline event ${event.title}`}
                  onClick={() => setPendingDelete(event)}
                >
                  <Trash2 />
                </Button>
              </li>
            );
          })}
        </ol>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add timeline event</DialogTitle>
            <DialogDescription>Record something that happened in this process.</DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <Field label="What happened" htmlFor="timeline-title" required error={error}>
              <Input
                id="timeline-title"
                autoFocus
                placeholder="First round invitation received"
                value={draft.title}
                onChange={(event) => setDraft((d) => ({ ...d, title: event.target.value }))}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type" htmlFor="timeline-kind">
                <EnumSelect
                  id="timeline-kind"
                  options={TIMELINE_EVENT_KINDS}
                  value={draft.kind}
                  onChange={(value) => value && setDraft((d) => ({ ...d, kind: value }))}
                />
              </Field>
              <Field label="Date" htmlFor="timeline-date">
                <Input
                  id="timeline-date"
                  type="date"
                  value={draft.date}
                  onChange={(event) => setDraft((d) => ({ ...d, date: event.target.value }))}
                />
              </Field>
            </div>
            <Field label="Details" htmlFor="timeline-description">
              <Textarea
                id="timeline-description"
                rows={2}
                value={draft.description}
                onChange={(event) => setDraft((d) => ({ ...d, description: event.target.value }))}
              />
            </Field>
            <DialogFooter>
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={saving}>
                Add event
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete this timeline event?"
        description={pendingDelete ? `“${pendingDelete.title}” will be removed.` : undefined}
        onConfirm={async () => {
          if (pendingDelete) await deleteTimelineEvent(pendingDelete.id);
        }}
      />
    </>
  );
}
