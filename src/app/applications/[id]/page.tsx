"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  CalendarClock,
  Copy,
  ExternalLink,
  FileSearch,
  Link2,
  ListTodo,
  MapPin,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataGuard } from "@/components/common/data-guard";
import { Section } from "@/components/common/section";
import { EmptyState } from "@/components/common/empty-state";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { CompanyAvatar } from "@/components/common/company-avatar";
import { TaskList } from "@/components/common/task-list";
import { TaskDialog } from "@/components/common/task-dialog";
import { EnumSelect } from "@/components/common/enum-select";
import { StatusBadge } from "@/components/applications/status-badge";
import { RecruitingTimeline } from "@/components/applications/timeline";
import { InterviewsSection } from "@/components/applications/interviews-section";
import { ApplicationContacts } from "@/components/applications/application-contacts";
import { DocumentsSection } from "@/components/applications/documents-section";
import { NotesEditor } from "@/components/applications/notes-editor";
import { useTracker } from "@/hooks/use-tracker";
import { useUi } from "@/hooks/use-ui";
import { appliedPhrase, formatDate, relativeDay } from "@/lib/dates";
import { normalizeUrl } from "@/lib/utils";
import { APPLICATION_STATUSES } from "@/types";

export default function ApplicationDetailPage() {
  return (
    <DataGuard skeleton={<DetailSkeleton />}>
      <ApplicationDetail />
    </DataGuard>
  );
}

function ApplicationDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { applicationById, updateApplication, deleteApplication, duplicateApplication } = useTracker();
  const { openComposer } = useUi();
  const [taskOpen, setTaskOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const application = applicationById.get(params.id);

  if (!application) {
    return (
      <div className="p-6">
        <EmptyState
          icon={FileSearch}
          title="Application not found"
          description="It may have been deleted, or the link is out of date."
          action={
            <Button asChild size="sm" variant="outline">
              <Link href="/applications">
                <ArrowLeft />
                Back to applications
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  const postingUrl = normalizeUrl(application.jobPostingUrl);
  const openTasks = application.tasks.filter((task) => !task.completed);
  const doneTasks = application.tasks.filter((task) => task.completed);

  return (
    <>
      <div className="border-b border-border px-4 py-3 lg:px-6">
        <Button asChild variant="ghost" size="xs" className="-ml-2 mb-2 text-muted-foreground">
          <Link href="/applications">
            <ArrowLeft />
            Applications
          </Link>
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <CompanyAvatar company={application.company} className="size-11" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/companies/${application.companyId}`}
                  className="text-lg font-semibold tracking-tight hover:underline"
                >
                  {application.company.name}
                </Link>
                <StatusBadge status={application.status} />
              </div>
              <p className="mt-0.5 text-sm">{application.position}</p>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {application.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3" />
                    {application.location}
                    {application.workType ? ` · ${application.workType}` : ""}
                  </span>
                )}
                {application.industry && (
                  <span className="inline-flex items-center gap-1">
                    <Briefcase className="size-3" />
                    {application.industry}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <CalendarClock className="size-3" />
                  {application.dateApplied
                    ? `${appliedPhrase(application.dateApplied)} · ${formatDate(application.dateApplied)}`
                    : "Not applied yet"}
                </span>
                {postingUrl && (
                  <a
                    href={postingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground"
                  >
                    <Link2 className="size-3" />
                    Job posting
                    <ExternalLink className="size-3" />
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <div className="w-[190px]">
              <EnumSelect
                options={APPLICATION_STATUSES}
                value={application.status}
                onChange={(status) => status && void updateApplication(application.id, { status })}
                className="h-8"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => openComposer(application)}>
              <Pencil />
              Edit
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon-sm" aria-label="More actions">
                  <Plus className="rotate-45" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setTaskOpen(true)}>
                  <ListTodo /> Add task
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={async () => {
                    const copy = await duplicateApplication(application.id);
                    if (copy) router.push(`/applications/${copy.id}`);
                  }}
                >
                  <Copy /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/companies/${application.companyId}`}>
                    <Building2 /> View company
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive onSelect={() => setDeleteOpen(true)}>
                  <Trash2 /> Delete application
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-3 lg:p-6">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Section title="Recruiting timeline" description="Everything that has happened so far.">
            <RecruitingTimeline applicationId={application.id} events={application.timeline} />
          </Section>

          <Section title="Interviews" description="Rounds, interviewers and outcomes.">
            <InterviewsSection applicationId={application.id} interviews={application.interviews} />
          </Section>

          <Section
            title="Tasks"
            description={`${openTasks.length} open${doneTasks.length ? `, ${doneTasks.length} completed` : ""}`}
            actions={
              <Button variant="outline" size="xs" onClick={() => setTaskOpen(true)}>
                <Plus />
                Add task
              </Button>
            }
            bodyClassName="px-4 py-1"
          >
            <TaskList
              tasks={[...openTasks, ...doneTasks]}
              emptyMessage="No tasks for this application yet."
            />
          </Section>

          <Section
            title="Notes"
            description="Interview prep, networking notes, company research, question banks."
          >
            <NotesEditor
              value={application.notes}
              rows={10}
              placeholder={
                "Interview prep\n— …\n\nCompany research\n— …\n\nTechnical questions\n— …\n\nBehavioural questions\n— …"
              }
              onSave={(notes) => updateApplication(application.id, { notes })}
            />
          </Section>
        </div>

        <div className="flex flex-col gap-4">
          <Section title="Details">
            <dl className="flex flex-col divide-y divide-border text-sm">
              <DetailRow label="Status" value={<StatusBadge status={application.status} />} />
              <DetailRow
                label="Applied"
                value={application.dateApplied ? formatDate(application.dateApplied) : "Not applied"}
              />
              <DetailRow
                label="Days since applied"
                value={
                  application.daysSinceApplied === null
                    ? "—"
                    : `${application.daysSinceApplied} day${application.daysSinceApplied === 1 ? "" : "s"}`
                }
              />
              <DetailRow
                label="Deadline"
                value={
                  application.deadline
                    ? `${formatDate(application.deadline)} (${relativeDay(application.deadline)})`
                    : "—"
                }
              />
              <DetailRow label="Internship type" value={application.internshipType ?? "—"} />
              <DetailRow label="Source" value={application.source ?? "—"} />
              <DetailRow label="Referral" value={application.isReferral ? "Yes" : "No"} />
              <DetailRow label="Compensation" value={application.compensation ?? "—"} />
              <DetailRow label="Job ID" value={application.jobId ?? "—"} />
              <DetailRow
                label="Resume version"
                value={
                  application.resumeVersion ? (
                    <Badge variant="muted">{application.resumeVersion.name}</Badge>
                  ) : (
                    "—"
                  )
                }
              />
              <DetailRow
                label="Cover letter"
                value={application.coverLetterSubmitted ? "Submitted" : "Not submitted"}
              />
              <DetailRow
                label="Transcript"
                value={application.transcriptSubmitted ? "Submitted" : "Not submitted"}
              />
              <DetailRow
                label="First response"
                value={application.firstResponseDate ? formatDate(application.firstResponseDate) : "—"}
              />
              <DetailRow label="Last updated" value={relativeDay(application.updatedAt)} />
            </dl>
          </Section>

          <Section title="Next action">
            <NotesEditor
              value={application.nextAction}
              rows={2}
              placeholder="Follow up with the recruiter…"
              onSave={(nextAction) => updateApplication(application.id, { nextAction })}
            />
          </Section>

          <Section title="Contacts" description="Everyone connected to this application.">
            <ApplicationContacts
              applicationId={application.id}
              companyId={application.companyId}
              contacts={application.contacts}
            />
          </Section>

          <Section title="Documents" description="Materials submitted with this application.">
            <DocumentsSection
              applicationId={application.id}
              documents={application.documents}
              defaultResumeName={application.resumeVersion?.name ?? null}
            />
          </Section>

          {application.jobDescription && (
            <Section title="Job description">
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                {application.jobDescription}
              </p>
            </Section>
          )}

          {(application.referralName || application.connectionNotes) && (
            <Section title="Referral">
              {application.referralName && (
                <p className="text-sm font-medium">{application.referralName}</p>
              )}
              {application.connectionNotes && (
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {application.connectionNotes}
                </p>
              )}
            </Section>
          )}
        </div>
      </div>

      <TaskDialog
        open={taskOpen}
        onOpenChange={setTaskOpen}
        initial={{ applicationId: application.id }}
        lockApplication
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this application?"
        description={`${application.company.name} — ${application.position} and its interviews, tasks, documents and timeline will be deleted permanently.`}
        onConfirm={async () => {
          await deleteApplication(application.id);
          router.push("/applications");
        }}
      />
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 first:pt-0 last:pb-0">
      <dt className="shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-right text-sm">{value}</dd>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      <Skeleton className="h-16 w-full max-w-lg" />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-48" />
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-80" />
          <Skeleton className="h-40" />
        </div>
      </div>
    </div>
  );
}
