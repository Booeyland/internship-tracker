"use client";

import * as React from "react";

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
import { EnumSelect, OptionSelect } from "@/components/common/enum-select";
import { useTracker } from "@/hooks/use-tracker";
import { combineDateTime, todayIso } from "@/lib/dates";
import { EVENT_TYPES, type EventType } from "@/types";

/** Creates a standalone recruiting event (career fair, coffee chat, deadline). */
export function EventDialog({
  open,
  onOpenChange,
  defaultDate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string;
}) {
  const { applications, createEvent, saving } = useTracker();
  const [draft, setDraft] = React.useState({
    title: "",
    eventType: "Networking Call" as EventType,
    date: defaultDate ?? todayIso(),
    time: "12:00",
    allDay: false,
    location: "",
    meetingLink: "",
    notes: "",
    applicationId: null as string | null,
  });
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setDraft((current) => ({
      ...current,
      title: "",
      notes: "",
      location: "",
      meetingLink: "",
      date: defaultDate ?? todayIso(),
    }));
    setError(null);
  }, [open, defaultDate]);

  const set = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  async function submit() {
    if (!draft.title.trim()) {
      setError("Give the event a title");
      return;
    }
    const application = draft.applicationId
      ? applications.find((item) => item.id === draft.applicationId)
      : undefined;

    const created = await createEvent({
      applicationId: draft.applicationId,
      companyId: application?.companyId ?? null,
      title: draft.title.trim(),
      eventType: draft.eventType,
      // Deadlines are date-only; everything else keeps a time.
      startsAt:
        draft.eventType === "Deadline" || draft.allDay
          ? draft.date
          : (combineDateTime(draft.date, draft.time) ?? draft.date),
      endsAt: null,
      location: draft.location.trim() || null,
      meetingLink: draft.meetingLink.trim() || null,
      notes: draft.notes.trim() || null,
    });
    if (created) onOpenChange(false);
  }

  const timed = draft.eventType !== "Deadline";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add calendar event</DialogTitle>
          <DialogDescription>
            Career fairs, coffee chats, info sessions and other recruiting commitments.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <Field label="Title" htmlFor="event-title" required error={error}>
            <Input
              id="event-title"
              autoFocus
              placeholder="Coffee chat with a Lazard analyst"
              value={draft.title}
              onChange={(event) => set("title", event.target.value)}
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Event type" htmlFor="event-type">
              <EnumSelect
                id="event-type"
                options={EVENT_TYPES}
                value={draft.eventType}
                onChange={(value) => value && set("eventType", value)}
              />
            </Field>
            <Field label="Application" htmlFor="event-application">
              <OptionSelect
                id="event-application"
                options={applications.map((application) => ({
                  value: application.id,
                  label: `${application.company.name} — ${application.position}`,
                }))}
                value={draft.applicationId}
                onChange={(value) => set("applicationId", value)}
                allowEmpty
                emptyLabel="Not linked"
                placeholder="Link an application"
              />
            </Field>
            <Field label="Date" htmlFor="event-date">
              <Input
                id="event-date"
                type="date"
                value={draft.date}
                onChange={(event) => set("date", event.target.value)}
              />
            </Field>
            {timed && (
              <Field label="Time" htmlFor="event-time">
                <Input
                  id="event-time"
                  type="time"
                  value={draft.time}
                  onChange={(event) => set("time", event.target.value)}
                />
              </Field>
            )}
            <Field label="Location" htmlFor="event-location">
              <Input
                id="event-location"
                value={draft.location}
                onChange={(event) => set("location", event.target.value)}
              />
            </Field>
            <Field label="Meeting link" htmlFor="event-link">
              <Input
                id="event-link"
                value={draft.meetingLink}
                onChange={(event) => set("meetingLink", event.target.value)}
              />
            </Field>
            <Field label="Notes" htmlFor="event-notes" className="sm:col-span-2">
              <Textarea
                id="event-notes"
                rows={2}
                value={draft.notes}
                onChange={(event) => set("notes", event.target.value)}
              />
            </Field>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              Add event
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
