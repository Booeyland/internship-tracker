"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import {
  Database,
  Download,
  FileText,
  Monitor,
  Moon,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Star,
  Sun,
  Trash2,
} from "lucide-react";

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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { DataGuard } from "@/components/common/data-guard";
import { PageHeader } from "@/components/common/page-header";
import { Section } from "@/components/common/section";
import { EmptyState } from "@/components/common/empty-state";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Field } from "@/components/common/field";
import { useTracker } from "@/hooks/use-tracker";
import { breakdownBy } from "@/lib/analytics";
import { cn, downloadCsv, toCsv } from "@/lib/utils";
import { formatDate } from "@/lib/dates";
import type { ResumeVersion } from "@/types";

export default function SettingsPage() {
  return (
    <DataGuard skeleton={<SettingsSkeleton />}>
      <SettingsScreen />
    </DataGuard>
  );
}

function SettingsScreen() {
  const { theme, setTheme } = useTheme();
  const { dataset, applications, reseed, resetAll } = useTracker();
  const [reseedOpen, setReseedOpen] = React.useState(false);
  const [clearOpen, setClearOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const exportEverything = () => {
    const headers = [
      "Company",
      "Position",
      "Industry",
      "Status",
      "Date applied",
      "Location",
      "Work type",
      "Source",
      "Referral",
      "Compensation",
      "Deadline",
      "Resume version",
      "Recruiter",
      "Recruiter email",
      "Next action",
      "Interviews",
      "Open tasks",
      "Notes",
      "Created",
      "Last updated",
    ];
    const rows = applications.map((application) => [
      application.company.name,
      application.position,
      application.industry ?? "",
      application.status,
      application.dateApplied ?? "",
      application.location ?? "",
      application.workType ?? "",
      application.source ?? "",
      application.isReferral ? "Yes" : "No",
      application.compensation ?? "",
      application.deadline ?? "",
      application.resumeVersion?.name ?? "",
      application.recruiterName ?? "",
      application.recruiterEmail ?? "",
      application.nextAction ?? "",
      application.interviews.length,
      application.tasks.filter((task) => !task.completed).length,
      application.notes ?? "",
      formatDate(application.createdAt),
      formatDate(application.updatedAt),
    ]);
    downloadCsv(
      `internship-tracker-export-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(headers, rows),
    );
  };

  const themes = [
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
    { id: "system", label: "System", icon: Monitor },
  ];

  const counts = [
    { label: "Applications", value: dataset.applications.length },
    { label: "Companies", value: dataset.companies.length },
    { label: "Contacts", value: dataset.contacts.length },
    { label: "Interviews", value: dataset.interviews.length },
    { label: "Tasks", value: dataset.tasks.length },
    { label: "Calendar events", value: dataset.recruitingEvents.length },
    { label: "Timeline entries", value: dataset.timelineEvents.length },
    { label: "Resume versions", value: dataset.resumeVersions.length },
  ];

  return (
    <>
      <PageHeader title="Settings" description="Resume versions, appearance and your data." />

      <div className="flex max-w-4xl flex-col gap-4 p-4 lg:p-6">
        <ResumeVersions />

        <Section title="Appearance" description="The theme applies across the whole tracker.">
          <div className="flex flex-wrap gap-2">
            {themes.map((option) => {
              const active = mounted && theme === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setTheme(option.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                    active
                      ? "border-foreground/30 bg-accent font-medium"
                      : "border-border hover:bg-accent/50",
                  )}
                >
                  <option.icon className="size-4" />
                  {option.label}
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Keyboard shortcuts" description="Built for fast entry during recruiting season.">
          <ul className="flex flex-col divide-y divide-border text-sm">
            <ShortcutRow keys={["N"]} description="Add an application" />
            <ShortcutRow keys={["⌘", "K"]} description="Open global search" />
            <ShortcutRow keys={["/"]} description="Open global search" />
            <ShortcutRow keys={["⌘", "↵"]} description="Save the open application form" />
            <ShortcutRow keys={["Esc"]} description="Close a dialog or panel" />
          </ul>
        </Section>

        <Section
          title="Your data"
          description="Everything is stored in a local SQLite database in this project."
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {counts.map((item) => (
              <div key={item.label} className="rounded-md border border-border p-2.5">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="mt-0.5 text-lg font-semibold tabular leading-none">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={exportEverything} disabled={applications.length === 0}>
              <Download />
              Export all applications
            </Button>
            <Button variant="outline" size="sm" onClick={() => setReseedOpen(true)}>
              <RotateCcw />
              Reload sample data
            </Button>
            <Button variant="outline" size="sm" onClick={() => setClearOpen(true)}>
              <Trash2 />
              Clear all data
            </Button>
          </div>

          <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
            <Database className="mt-0.5 size-3 shrink-0" />
            The database file lives at <code className="rounded bg-muted px-1">data/tracker.db</code>.
            The schema is mirrored for Postgres in{" "}
            <code className="rounded bg-muted px-1">supabase/schema.sql</code> if you later move this
            to Supabase.
          </p>
        </Section>
      </div>

      <ConfirmDialog
        open={reseedOpen}
        onOpenChange={setReseedOpen}
        title="Replace everything with sample data?"
        description="All current applications, companies, contacts, interviews and tasks will be deleted and replaced with the demo dataset."
        confirmLabel="Reload sample data"
        onConfirm={reseed}
      />

      <ConfirmDialog
        open={clearOpen}
        onOpenChange={setClearOpen}
        title="Clear all data?"
        description="Every application, company, contact, interview, task and calendar event will be deleted permanently. This cannot be undone."
        confirmLabel="Delete everything"
        onConfirm={resetAll}
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Resume versions                                                           */
/* -------------------------------------------------------------------------- */

function ResumeVersions() {
  const { dataset, applications, createResume, updateResume, deleteResume, saving } = useTracker();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ResumeVersion | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<ResumeVersion | null>(null);
  const [draft, setDraft] = React.useState({ name: "", description: "", fileUrl: "" });
  const [error, setError] = React.useState<string | null>(null);

  // Interview conversion per resume, so versions can be compared directly.
  const performance = React.useMemo(
    () =>
      new Map(
        breakdownBy(applications, (application) => application.resumeVersion?.name ?? null, {
          fallback: "No resume tracked",
        }).map((row) => [row.key, row]),
      ),
    [applications],
  );

  const open = (resume: ResumeVersion | null) => {
    setEditing(resume);
    setDraft({
      name: resume?.name ?? "",
      description: resume?.description ?? "",
      fileUrl: resume?.fileUrl ?? "",
    });
    setError(null);
    setDialogOpen(true);
  };

  async function submit() {
    if (!draft.name.trim()) {
      setError("Give the resume version a name");
      return;
    }
    const payload = {
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      fileUrl: draft.fileUrl.trim() || null,
      isDefault: editing?.isDefault ?? dataset.resumeVersions.length === 0,
    };
    if (editing) {
      await updateResume(editing.id, payload);
      setDialogOpen(false);
      return;
    }
    const created = await createResume(payload);
    if (created) setDialogOpen(false);
  }

  /** Exactly one version is the default, so setting one clears the others. */
  async function makeDefault(resume: ResumeVersion) {
    for (const other of dataset.resumeVersions) {
      if (other.isDefault && other.id !== resume.id) {
        await updateResume(other.id, { isDefault: false });
      }
    }
    await updateResume(resume.id, { isDefault: true });
  }

  return (
    <>
      <Section
        title="Resume versions"
        description="Track which resume you sent, then compare interview rates."
        actions={
          <Button variant="outline" size="xs" onClick={() => open(null)}>
            <Plus />
            Add version
          </Button>
        }
      >
        {dataset.resumeVersions.length === 0 ? (
          <EmptyState
            compact
            icon={FileText}
            title="No resume versions yet"
            description="Add the versions you tailor per industry so you can compare what works."
          />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {dataset.resumeVersions.map((resume) => {
              const stats = performance.get(resume.name);
              return (
                <li key={resume.id} className="group flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{resume.name}</span>
                      {resume.isDefault && <Badge variant="muted">Default</Badge>}
                    </div>
                    {resume.description && (
                      <p className="text-xs text-muted-foreground">{resume.description}</p>
                    )}
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {stats
                        ? `${stats.applications} application${stats.applications === 1 ? "" : "s"} · ${stats.interviews} interview${stats.interviews === 1 ? "" : "s"} · ${stats.interviewRate}% interview rate`
                        : "Not used on any application yet"}
                    </p>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
                        aria-label={`Actions for ${resume.name}`}
                      >
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => open(resume)}>
                        <Pencil /> Edit
                      </DropdownMenuItem>
                      {!resume.isDefault && (
                        <DropdownMenuItem onSelect={() => void makeDefault(resume)}>
                          <Star /> Make default
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem destructive onSelect={() => setPendingDelete(resume)}>
                        <Trash2 /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit resume version" : "Add resume version"}</DialogTitle>
            <DialogDescription>
              Name the versions you tailor, for example “Investment Banking Resume”.
            </DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <Field label="Name" htmlFor="resume-name" required error={error}>
              <Input
                id="resume-name"
                autoFocus
                value={draft.name}
                onChange={(event) => setDraft((d) => ({ ...d, name: event.target.value }))}
              />
            </Field>
            <Field label="Description" htmlFor="resume-description">
              <Textarea
                id="resume-description"
                rows={2}
                placeholder="What makes this version different?"
                value={draft.description}
                onChange={(event) => setDraft((d) => ({ ...d, description: event.target.value }))}
              />
            </Field>
            <Field label="Link" htmlFor="resume-url" hint="Optional link to the file.">
              <Input
                id="resume-url"
                value={draft.fileUrl}
                onChange={(event) => setDraft((d) => ({ ...d, fileUrl: event.target.value }))}
              />
            </Field>
            <DialogFooter>
              <Button type="button" variant="ghost" size="sm" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={saving}>
                {editing ? "Save changes" : "Add version"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete this resume version?"
        description={
          pendingDelete
            ? `“${pendingDelete.name}” will be removed. Applications that used it keep their history but will no longer show a resume version.`
            : undefined
        }
        onConfirm={async () => {
          if (pendingDelete) await deleteResume(pendingDelete.id);
        }}
      />
    </>
  );
}

function ShortcutRow({ keys, description }: { keys: string[]; description: string }) {
  return (
    <li className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
      <span className="text-muted-foreground">{description}</span>
      <span className="flex shrink-0 items-center gap-1">
        {keys.map((key) => (
          <kbd
            key={key}
            className="rounded border border-border bg-muted px-1.5 py-0.5 font-sans text-xs"
          >
            {key}
          </kbd>
        ))}
      </span>
    </li>
  );
}

function SettingsSkeleton() {
  return (
    <div className="flex max-w-4xl flex-col gap-4 p-4 lg:p-6">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-52" />
      <Skeleton className="h-32" />
      <Skeleton className="h-48" />
    </div>
  );
}
