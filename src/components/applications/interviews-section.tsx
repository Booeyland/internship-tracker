"use client";

import * as React from "react";
import { CalendarClock, ExternalLink, Linkedin, MoreHorizontal, Plus, Trash2, Video } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/common/field";
import { EnumSelect } from "@/components/common/enum-select";
import { EmptyState } from "@/components/common/empty-state";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { useTracker } from "@/hooks/use-tracker";
import {
  combineDateTime,
  formatDate,
  formatTime,
  relativeDay,
  toDateInputValue,
  toTimeInputValue,
  todayIso,
} from "@/lib/dates";
import { cn, normalizeUrl } from "@/lib/utils";
import {
  INTERVIEW_OUTCOMES,
  INTERVIEW_TYPES,
  type Interview,
  type InterviewOutcome,
  type InterviewType,
} from "@/types";

const OUTCOME_STYLES: Record<InterviewOutcome, string> = {
  Pending: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  Advanced: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  Rejected: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  "No Response": "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  Cancelled: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400",
};

interface InterviewDraft {
  interviewType: InterviewType;
  date: string;
  time: string;
  durationMinutes: string;
  interviewerName: string;
  interviewerTitle: string;
  interviewerLinkedin: string;
  meetingLink: string;
  location: string;
  notes: string;
  outcome: InterviewOutcome;
}

const emptyDraft = (): InterviewDraft => ({
  interviewType: "First Round",
  date: todayIso(),
  time: "10:00",
  durationMinutes: "45",
  interviewerName: "",
  interviewerTitle: "",
  interviewerLinkedin: "",
  meetingLink: "",
  location: "",
  notes: "",
  outcome: "Pending",
});

const fromInterview = (interview: Interview): InterviewDraft => ({
  interviewType: interview.interviewType,
  date: toDateInputValue(interview.scheduledAt) || todayIso(),
  time: toTimeInputValue(interview.scheduledAt) || "10:00",
  durationMinutes: interview.durationMinutes ? String(interview.durationMinutes) : "",
  interviewerName: interview.interviewerName ?? "",
  interviewerTitle: interview.interviewerTitle ?? "",
  interviewerLinkedin: interview.interviewerLinkedin ?? "",
  meetingLink: interview.meetingLink ?? "",
  location: interview.location ?? "",
  notes: interview.notes ?? "",
  outcome: interview.outcome,
});

export function InterviewsSection({
  applicationId,
  interviews,
}: {
  applicationId: string;
  interviews: Interview[];
}) {
  const { createInterview, updateInterview, deleteInterview, saving } = useTracker();
  const [editing, setEditing] = React.useState<Interview | null>(null);
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<InterviewDraft>(emptyDraft);
  const [pendingDelete, setPendingDelete] = React.useState<Interview | null>(null);

  const openForCreate = () => {
    setEditing(null);
    setDraft(emptyDraft());
    setOpen(true);
  };

  const openForEdit = (interview: Interview) => {
    setEditing(interview);
    setDraft(fromInterview(interview));
    setOpen(true);
  };

  const set = <K extends keyof InterviewDraft>(key: K, value: InterviewDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  async function submit() {
    const payload = {
      interviewType: draft.interviewType,
      scheduledAt: combineDateTime(draft.date, draft.time),
      durationMinutes: draft.durationMinutes ? Number(draft.durationMinutes) : null,
      interviewerName: draft.interviewerName.trim() || null,
      interviewerTitle: draft.interviewerTitle.trim() || null,
      interviewerLinkedin: draft.interviewerLinkedin.trim() || null,
      meetingLink: draft.meetingLink.trim() || null,
      location: draft.location.trim() || null,
      notes: draft.notes.trim() || null,
      outcome: draft.outcome,
    };

    if (editing) {
      await updateInterview(editing.id, payload);
      setOpen(false);
      return;
    }
    const created = await createInterview({ applicationId, ...payload });
    if (created) setOpen(false);
  }

  const ordered = React.useMemo(
    () =>
      [...interviews].sort((a, b) => (b.scheduledAt ?? "").localeCompare(a.scheduledAt ?? "")),
    [interviews],
  );

  return (
    <>
      <div className="flex items-center justify-end pb-2">
        <Button variant="outline" size="xs" onClick={openForCreate}>
          <Plus />
          Add interview
        </Button>
      </div>

      {ordered.length === 0 ? (
        <EmptyState
          compact
          icon={CalendarClock}
          title="No interviews logged"
          description="Add an interview and it appears on the dashboard and calendar automatically."
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {ordered.map((interview) => {
            const link = normalizeUrl(interview.meetingLink);
            const profile = normalizeUrl(interview.interviewerLinkedin);
            return (
              <li key={interview.id} className="group flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{interview.interviewType}</span>
                    <Badge variant="secondary" className={cn(OUTCOME_STYLES[interview.outcome])}>
                      {interview.outcome}
                    </Badge>
                  </div>

                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {interview.scheduledAt ? (
                      <>
                        <span className="font-medium text-foreground">
                          {relativeDay(interview.scheduledAt)}
                        </span>
                        {" · "}
                        {formatDate(interview.scheduledAt)} at {formatTime(interview.scheduledAt)}
                        {interview.durationMinutes ? ` · ${interview.durationMinutes} min` : ""}
                      </>
                    ) : (
                      "Not scheduled"
                    )}
                  </p>

                  {(interview.interviewerName || interview.location) && (
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                      {interview.interviewerName && (
                        <span>
                          {interview.interviewerName}
                          {interview.interviewerTitle ? ` · ${interview.interviewerTitle}` : ""}
                        </span>
                      )}
                      {profile && (
                        <a
                          href={profile}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 underline underline-offset-2"
                        >
                          <Linkedin className="size-3" />
                          LinkedIn
                        </a>
                      )}
                      {interview.location && <span>· {interview.location}</span>}
                    </p>
                  )}

                  {interview.notes && (
                    <p className="mt-1.5 whitespace-pre-wrap rounded-md bg-muted/50 p-2 text-xs leading-relaxed text-muted-foreground">
                      {interview.notes}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {link && (
                    <Button asChild variant="outline" size="xs">
                      <a href={link} target="_blank" rel="noopener noreferrer">
                        <Video />
                        Join
                        <ExternalLink className="size-3" />
                      </a>
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Actions for ${interview.interviewType}`}
                      >
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => openForEdit(interview)}>Edit</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Set outcome</DropdownMenuLabel>
                      {INTERVIEW_OUTCOMES.map((outcome) => (
                        <DropdownMenuItem
                          key={outcome}
                          onSelect={() => void updateInterview(interview.id, { outcome })}
                          className={cn(outcome === interview.outcome && "font-medium")}
                        >
                          {outcome}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem destructive onSelect={() => setPendingDelete(interview)}>
                        <Trash2 /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit interview" : "Add interview"}</DialogTitle>
            <DialogDescription>
              Scheduled interviews show up on the dashboard and the recruiting calendar.
            </DialogDescription>
          </DialogHeader>

          <form
            className="flex max-h-[65vh] flex-col gap-3 overflow-y-auto pr-1"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Interview type" htmlFor="interview-type">
                <EnumSelect
                  id="interview-type"
                  options={INTERVIEW_TYPES}
                  value={draft.interviewType}
                  onChange={(value) => value && set("interviewType", value)}
                />
              </Field>
              <Field label="Outcome" htmlFor="interview-outcome">
                <EnumSelect
                  id="interview-outcome"
                  options={INTERVIEW_OUTCOMES}
                  value={draft.outcome}
                  onChange={(value) => value && set("outcome", value)}
                />
              </Field>
              <Field label="Date" htmlFor="interview-date">
                <Input
                  id="interview-date"
                  type="date"
                  value={draft.date}
                  onChange={(event) => set("date", event.target.value)}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Time" htmlFor="interview-time">
                  <Input
                    id="interview-time"
                    type="time"
                    value={draft.time}
                    onChange={(event) => set("time", event.target.value)}
                  />
                </Field>
                <Field label="Minutes" htmlFor="interview-duration">
                  <Input
                    id="interview-duration"
                    type="number"
                    min={5}
                    step={5}
                    value={draft.durationMinutes}
                    onChange={(event) => set("durationMinutes", event.target.value)}
                  />
                </Field>
              </div>
              <Field label="Interviewer" htmlFor="interview-name">
                <Input
                  id="interview-name"
                  value={draft.interviewerName}
                  onChange={(event) => set("interviewerName", event.target.value)}
                />
              </Field>
              <Field label="Interviewer position" htmlFor="interview-title">
                <Input
                  id="interview-title"
                  placeholder="Associate, M&A"
                  value={draft.interviewerTitle}
                  onChange={(event) => set("interviewerTitle", event.target.value)}
                />
              </Field>
              <Field label="Interviewer LinkedIn" htmlFor="interview-linkedin">
                <Input
                  id="interview-linkedin"
                  value={draft.interviewerLinkedin}
                  onChange={(event) => set("interviewerLinkedin", event.target.value)}
                />
              </Field>
              <Field label="Meeting link" htmlFor="interview-link">
                <Input
                  id="interview-link"
                  placeholder="https://zoom.us/j/…"
                  value={draft.meetingLink}
                  onChange={(event) => set("meetingLink", event.target.value)}
                />
              </Field>
              <Field label="Location" htmlFor="interview-location" className="sm:col-span-2">
                <Input
                  id="interview-location"
                  placeholder="200 West Street, New York"
                  value={draft.location}
                  onChange={(event) => set("location", event.target.value)}
                />
              </Field>
              <Field label="Notes" htmlFor="interview-notes" className="sm:col-span-2">
                <Textarea
                  id="interview-notes"
                  rows={4}
                  placeholder="Questions asked, how it went, what to prepare next time…"
                  value={draft.notes}
                  onChange={(event) => set("notes", event.target.value)}
                />
              </Field>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={saving}>
                {editing ? "Save changes" : "Add interview"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete this interview?"
        description={
          pendingDelete ? `The ${pendingDelete.interviewType} record will be removed.` : undefined
        }
        onConfirm={async () => {
          if (pendingDelete) await deleteInterview(pendingDelete.id);
        }}
      />
    </>
  );
}
