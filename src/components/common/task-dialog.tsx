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
import { todayIso } from "@/lib/dates";
import { PRIORITIES, TASK_TYPES, type Priority, type TaskType } from "@/types";

export interface TaskDraft {
  title: string;
  taskType: TaskType;
  dueDate: string;
  priority: Priority;
  notes: string;
  applicationId: string | null;
  autoSuggested?: boolean;
}

export const EMPTY_TASK: TaskDraft = {
  title: "",
  taskType: "Follow Up",
  dueDate: todayIso(),
  priority: "Medium",
  notes: "",
  applicationId: null,
};

/**
 * Create a task, optionally pinned to one application. When `lockApplication`
 * is set the picker is hidden — the caller already knows the context.
 */
export function TaskDialog({
  open,
  onOpenChange,
  initial,
  lockApplication = false,
  title = "Add task",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Partial<TaskDraft>;
  lockApplication?: boolean;
  title?: string;
}) {
  const { createTask, applications, saving } = useTracker();
  const [draft, setDraft] = React.useState<TaskDraft>({ ...EMPTY_TASK, ...initial });
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setDraft({ ...EMPTY_TASK, dueDate: todayIso(), ...initial });
      setError(null);
    }
    // `initial` is a fresh object each render; the open transition is the trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = <K extends keyof TaskDraft>(key: K, value: TaskDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  async function submit() {
    if (!draft.title.trim()) {
      setError("Give the task a name");
      return;
    }
    const created = await createTask({
      applicationId: draft.applicationId,
      contactId: null,
      title: draft.title.trim(),
      taskType: draft.taskType,
      dueDate: draft.dueDate || null,
      priority: draft.priority,
      completed: false,
      notes: draft.notes.trim() || null,
      autoSuggested: draft.autoSuggested ?? false,
    });
    if (created) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Track a follow-up, deadline or prep block.</DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <Field label="Task name" htmlFor="task-title" required error={error}>
            <Input
              id="task-title"
              autoFocus
              value={draft.title}
              placeholder="Follow up with the recruiter"
              onChange={(event) => set("title", event.target.value)}
            />
          </Field>

          {!lockApplication && (
            <Field label="Application" htmlFor="task-application">
              <OptionSelect
                id="task-application"
                options={applications.map((application) => ({
                  value: application.id,
                  label: `${application.company.name} — ${application.position}`,
                }))}
                value={draft.applicationId}
                onChange={(value) => set("applicationId", value)}
                allowEmpty
                emptyLabel="Not linked to an application"
                placeholder="Select an application"
              />
            </Field>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Task type" htmlFor="task-type">
              <EnumSelect
                id="task-type"
                options={TASK_TYPES}
                value={draft.taskType}
                onChange={(value) => value && set("taskType", value)}
              />
            </Field>
            <Field label="Priority" htmlFor="task-priority">
              <EnumSelect
                id="task-priority"
                options={PRIORITIES}
                value={draft.priority}
                onChange={(value) => value && set("priority", value)}
              />
            </Field>
          </div>

          <Field label="Due date" htmlFor="task-due">
            <Input
              id="task-due"
              type="date"
              value={draft.dueDate}
              onChange={(event) => set("dueDate", event.target.value)}
            />
          </Field>

          <Field label="Notes" htmlFor="task-notes">
            <Textarea
              id="task-notes"
              rows={2}
              value={draft.notes}
              onChange={(event) => set("notes", event.target.value)}
            />
          </Field>

          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              Add task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
