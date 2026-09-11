"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldGroup } from "@/components/common/field";
import { EnumSelect, OptionSelect } from "@/components/common/enum-select";
import { CompanyCombobox } from "@/components/applications/company-combobox";
import { useTracker } from "@/hooks/use-tracker";
import { useUi } from "@/hooks/use-ui";
import { todayIso } from "@/lib/dates";
import {
  APPLICATION_SOURCES,
  APPLICATION_STATUSES,
  INDUSTRIES,
  INTERNSHIP_TYPES,
  WORK_TYPES,
  type ApplicationSource,
  type ApplicationStatus,
  type Industry,
  type InternshipType,
  type WorkType,
} from "@/types";

interface FormState {
  companyName: string;
  companyId: string | null;
  position: string;
  internshipType: InternshipType | null;
  industry: Industry | null;
  location: string;
  workType: WorkType | null;
  jobPostingUrl: string;
  jobId: string;
  jobDescription: string;
  compensation: string;
  deadline: string;
  status: ApplicationStatus;
  dateApplied: string;
  source: ApplicationSource | null;
  isReferral: boolean;
  resumeVersionId: string | null;
  coverLetterSubmitted: boolean;
  transcriptSubmitted: boolean;
  recruiterName: string;
  recruiterEmail: string;
  recruiterLinkedin: string;
  referralName: string;
  connectionNotes: string;
  notes: string;
  nextAction: string;
}

const BLANK: FormState = {
  companyName: "",
  companyId: null,
  position: "",
  internshipType: "Summer Analyst",
  industry: null,
  location: "",
  workType: null,
  jobPostingUrl: "",
  jobId: "",
  jobDescription: "",
  compensation: "",
  deadline: "",
  status: "Saved",
  dateApplied: "",
  source: null,
  isReferral: false,
  resumeVersionId: null,
  coverLetterSubmitted: false,
  transcriptSubmitted: false,
  recruiterName: "",
  recruiterEmail: "",
  recruiterLinkedin: "",
  referralName: "",
  connectionNotes: "",
  notes: "",
  nextAction: "",
};

const text = (value: string) => {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

/**
 * Add/edit panel for applications. Optimised for speed: company and position
 * are the only required fields, the company field autofocuses, and ⌘+Enter
 * saves from anywhere in the form.
 */
export function ApplicationComposer() {
  const router = useRouter();
  const { composerOpen, composerTarget, closeComposer } = useUi();
  const { dataset, createApplication, updateApplication, saving } = useTracker();

  const [form, setForm] = React.useState<FormState>(BLANK);
  const [errors, setErrors] = React.useState<Partial<Record<"companyName" | "position", string>>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const isEditing = composerTarget !== null;

  // Reset the form whenever the panel opens, seeding it when editing.
  React.useEffect(() => {
    if (!composerOpen) return;
    setErrors({});
    if (composerTarget) {
      setForm({
        companyName: composerTarget.company.name,
        companyId: composerTarget.companyId,
        position: composerTarget.position,
        internshipType: composerTarget.internshipType,
        industry: composerTarget.industry,
        location: composerTarget.location ?? "",
        workType: composerTarget.workType,
        jobPostingUrl: composerTarget.jobPostingUrl ?? "",
        jobId: composerTarget.jobId ?? "",
        jobDescription: composerTarget.jobDescription ?? "",
        compensation: composerTarget.compensation ?? "",
        deadline: composerTarget.deadline ?? "",
        status: composerTarget.status,
        dateApplied: composerTarget.dateApplied ?? "",
        source: composerTarget.source,
        isReferral: composerTarget.isReferral,
        resumeVersionId: composerTarget.resumeVersionId,
        coverLetterSubmitted: composerTarget.coverLetterSubmitted,
        transcriptSubmitted: composerTarget.transcriptSubmitted,
        recruiterName: composerTarget.recruiterName ?? "",
        recruiterEmail: composerTarget.recruiterEmail ?? "",
        recruiterLinkedin: composerTarget.recruiterLinkedin ?? "",
        referralName: composerTarget.referralName ?? "",
        connectionNotes: composerTarget.connectionNotes ?? "",
        notes: composerTarget.notes ?? "",
        nextAction: composerTarget.nextAction ?? "",
      });
    } else {
      const defaultResume = dataset.resumeVersions.find((r) => r.isDefault);
      setForm({ ...BLANK, resumeVersionId: defaultResume?.id ?? null });
    }
  }, [composerOpen, composerTarget, dataset.resumeVersions]);

  const set = React.useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  }, []);

  /** Picking "Applied" with no date yet fills in today — one less field to touch. */
  const onStatusChange = (status: ApplicationStatus | null) => {
    if (!status) return;
    setForm((current) => ({
      ...current,
      status,
      dateApplied:
        current.dateApplied === "" && status !== "Saved" && status !== "Interested"
          ? todayIso()
          : current.dateApplied,
    }));
  };

  function validate(): boolean {
    const next: typeof errors = {};
    if (!form.companyName.trim()) next.companyName = "Company name is required";
    if (!form.position.trim()) next.position = "Position title is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  const payload = () => ({
    companyName: form.companyName.trim(),
    companyId: form.companyId,
    position: form.position.trim(),
    internshipType: form.internshipType,
    industry: form.industry,
    location: text(form.location),
    workType: form.workType,
    jobPostingUrl: text(form.jobPostingUrl),
    jobId: text(form.jobId),
    jobDescription: text(form.jobDescription),
    compensation: text(form.compensation),
    deadline: text(form.deadline),
    status: form.status,
    dateApplied: text(form.dateApplied),
    source: form.source,
    isReferral: form.isReferral,
    resumeVersionId: form.resumeVersionId,
    coverLetterSubmitted: form.coverLetterSubmitted,
    transcriptSubmitted: form.transcriptSubmitted,
    recruiterName: text(form.recruiterName),
    recruiterEmail: text(form.recruiterEmail),
    recruiterLinkedin: text(form.recruiterLinkedin),
    referralName: text(form.referralName),
    connectionNotes: text(form.connectionNotes),
    notes: text(form.notes),
    nextAction: text(form.nextAction),
    firstResponseDate: composerTarget?.firstResponseDate ?? null,
  });

  async function submit(options: { keepOpen?: boolean; openDetail?: boolean } = {}) {
    if (!validate()) return;
    setSubmitting(true);
    try {
      if (composerTarget) {
        const { companyName: _name, ...rest } = payload();
        await updateApplication(composerTarget.id, {
          ...rest,
          companyId: form.companyId ?? composerTarget.companyId,
        });
        closeComposer();
        return;
      }

      const created = await createApplication(payload());
      if (!created) return;

      if (options.keepOpen) {
        // "Save and add another" keeps the company so back-to-back entry is quick.
        setForm((current) => ({
          ...BLANK,
          companyName: current.companyName,
          companyId: current.companyId,
          industry: current.industry,
          location: current.location,
          workType: current.workType,
          source: current.source,
          resumeVersionId: current.resumeVersionId,
          status: current.status,
        }));
        setErrors({});
        return;
      }

      closeComposer();
      if (options.openDetail) router.push(`/applications/${created.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  const busy = submitting || saving;

  return (
    <Sheet open={composerOpen} onOpenChange={(open) => (open ? undefined : closeComposer())}>
      <SheetContent
        side="right"
        className="gap-0 p-0 sm:max-w-2xl"
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            void submit({ openDetail: false });
          }
        }}
      >
        <SheetHeader>
          <SheetTitle>{isEditing ? "Edit application" : "Add application"}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update the details for this application."
              : "Only the company and position are required — everything else can be filled in later."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <form
            id="application-form"
            className="flex flex-col gap-6"
            onSubmit={(event) => {
              event.preventDefault();
              void submit({ openDetail: false });
            }}
          >
            <FieldGroup title="Position">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Company name" htmlFor="companyName" required error={errors.companyName}>
                  <CompanyCombobox
                    id="companyName"
                    autoFocus
                    companies={dataset.companies}
                    value={{ name: form.companyName, companyId: form.companyId }}
                    onChange={(next) => {
                      setForm((current) => {
                        const company = next.companyId
                          ? dataset.companies.find((c) => c.id === next.companyId)
                          : undefined;
                        return {
                          ...current,
                          companyName: next.name,
                          companyId: next.companyId,
                          // Adopt the company's industry when the field is untouched.
                          industry: current.industry ?? company?.industry ?? null,
                        };
                      });
                    }}
                  />
                </Field>

                <Field label="Position title" htmlFor="position" required error={errors.position}>
                  <Input
                    id="position"
                    placeholder="2027 Summer Analyst — Investment Banking"
                    value={form.position}
                    onChange={(event) => set("position", event.target.value)}
                  />
                </Field>

                <Field label="Internship type" htmlFor="internshipType">
                  <EnumSelect
                    id="internshipType"
                    options={INTERNSHIP_TYPES}
                    value={form.internshipType}
                    onChange={(value) => set("internshipType", value)}
                    allowEmpty
                  />
                </Field>

                <Field label="Industry" htmlFor="industry">
                  <EnumSelect
                    id="industry"
                    options={INDUSTRIES}
                    value={form.industry}
                    onChange={(value) => set("industry", value)}
                    allowEmpty
                  />
                </Field>

                <Field label="Location" htmlFor="location">
                  <Input
                    id="location"
                    placeholder="New York, NY"
                    value={form.location}
                    onChange={(event) => set("location", event.target.value)}
                  />
                </Field>

                <Field label="Work type" htmlFor="workType">
                  <EnumSelect
                    id="workType"
                    options={WORK_TYPES}
                    value={form.workType}
                    onChange={(value) => set("workType", value)}
                    allowEmpty
                  />
                </Field>

                <Field label="Compensation" htmlFor="compensation">
                  <Input
                    id="compensation"
                    placeholder="$110,000 annualized"
                    value={form.compensation}
                    onChange={(event) => set("compensation", event.target.value)}
                  />
                </Field>

                <Field label="Application deadline" htmlFor="deadline">
                  <Input
                    id="deadline"
                    type="date"
                    value={form.deadline}
                    onChange={(event) => set("deadline", event.target.value)}
                  />
                </Field>

                <Field label="Job posting URL" htmlFor="jobPostingUrl" className="sm:col-span-2">
                  <Input
                    id="jobPostingUrl"
                    placeholder="https://…"
                    value={form.jobPostingUrl}
                    onChange={(event) => set("jobPostingUrl", event.target.value)}
                  />
                </Field>

                <Field label="Job ID" htmlFor="jobId">
                  <Input
                    id="jobId"
                    placeholder="REQ-10482"
                    value={form.jobId}
                    onChange={(event) => set("jobId", event.target.value)}
                  />
                </Field>

                <Field label="Next action" htmlFor="nextAction">
                  <Input
                    id="nextAction"
                    placeholder="Follow up with recruiter"
                    value={form.nextAction}
                    onChange={(event) => set("nextAction", event.target.value)}
                  />
                </Field>

                <Field label="Job description" htmlFor="jobDescription" className="sm:col-span-2">
                  <Textarea
                    id="jobDescription"
                    rows={3}
                    placeholder="Paste the posting here so you can reference it later."
                    value={form.jobDescription}
                    onChange={(event) => set("jobDescription", event.target.value)}
                  />
                </Field>
              </div>
            </FieldGroup>

            <FieldGroup title="Application">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Status" htmlFor="status">
                  <EnumSelect
                    id="status"
                    options={APPLICATION_STATUSES}
                    value={form.status}
                    onChange={onStatusChange}
                  />
                </Field>

                <Field label="Date applied" htmlFor="dateApplied">
                  <Input
                    id="dateApplied"
                    type="date"
                    value={form.dateApplied}
                    onChange={(event) => set("dateApplied", event.target.value)}
                  />
                </Field>

                <Field label="Application source" htmlFor="source">
                  <EnumSelect
                    id="source"
                    options={APPLICATION_SOURCES}
                    value={form.source}
                    onChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        source: value,
                        isReferral: value === "Referral" ? true : current.isReferral,
                      }))
                    }
                    allowEmpty
                  />
                </Field>

                <Field label="Resume version" htmlFor="resumeVersionId">
                  <OptionSelect
                    id="resumeVersionId"
                    options={dataset.resumeVersions.map((resume) => ({
                      value: resume.id,
                      label: resume.name,
                    }))}
                    value={form.resumeVersionId}
                    onChange={(value) => set("resumeVersionId", value)}
                    allowEmpty
                    emptyLabel="No resume tracked"
                    placeholder="Select a resume"
                  />
                </Field>

                <div className="flex flex-col gap-2 sm:col-span-2">
                  <CheckRow
                    id="isReferral"
                    label="I was referred for this role"
                    checked={form.isReferral}
                    onChange={(checked) => set("isReferral", checked)}
                  />
                  <CheckRow
                    id="coverLetterSubmitted"
                    label="Cover letter submitted"
                    checked={form.coverLetterSubmitted}
                    onChange={(checked) => set("coverLetterSubmitted", checked)}
                  />
                  <CheckRow
                    id="transcriptSubmitted"
                    label="Transcript submitted"
                    checked={form.transcriptSubmitted}
                    onChange={(checked) => set("transcriptSubmitted", checked)}
                  />
                </div>
              </div>
            </FieldGroup>

            <FieldGroup title="Contact">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Recruiter name" htmlFor="recruiterName">
                  <Input
                    id="recruiterName"
                    value={form.recruiterName}
                    onChange={(event) => set("recruiterName", event.target.value)}
                  />
                </Field>
                <Field label="Recruiter email" htmlFor="recruiterEmail">
                  <Input
                    id="recruiterEmail"
                    type="email"
                    value={form.recruiterEmail}
                    onChange={(event) => set("recruiterEmail", event.target.value)}
                  />
                </Field>
                <Field label="Recruiter LinkedIn" htmlFor="recruiterLinkedin">
                  <Input
                    id="recruiterLinkedin"
                    value={form.recruiterLinkedin}
                    onChange={(event) => set("recruiterLinkedin", event.target.value)}
                  />
                </Field>
                <Field label="Referral / connection" htmlFor="referralName">
                  <Input
                    id="referralName"
                    placeholder="Who referred you?"
                    value={form.referralName}
                    onChange={(event) => set("referralName", event.target.value)}
                  />
                </Field>
                <Field label="Connection notes" htmlFor="connectionNotes" className="sm:col-span-2">
                  <Textarea
                    id="connectionNotes"
                    rows={2}
                    value={form.connectionNotes}
                    onChange={(event) => set("connectionNotes", event.target.value)}
                  />
                </Field>
              </div>
            </FieldGroup>

            <FieldGroup title="Notes">
              <Field label="Anything relevant about this role" htmlFor="notes">
                <Textarea
                  id="notes"
                  rows={4}
                  placeholder="Interview prep, company research, technical topics to review…"
                  value={form.notes}
                  onChange={(event) => set("notes", event.target.value)}
                />
              </Field>
            </FieldGroup>
          </form>
        </div>

        <SheetFooter className="flex-wrap justify-between gap-2 sm:justify-between">
          <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
            <Sparkles className="size-3" />
            <kbd className="rounded border border-border px-1 text-[10px]">⌘</kbd>
            <kbd className="rounded border border-border px-1 text-[10px]">↵</kbd>
            to save
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={closeComposer} disabled={busy}>
              Cancel
            </Button>
            {!isEditing && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => void submit({ keepOpen: true })}
              >
                Save and add another
              </Button>
            )}
            <Button type="submit" form="application-form" size="sm" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />}
              {isEditing ? "Save changes" : "Add application"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function CheckRow({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox id={id} checked={checked} onCheckedChange={(value) => onChange(value === true)} />
      <Label htmlFor={id} className="cursor-pointer text-sm text-foreground">
        {label}
      </Label>
    </div>
  );
}
