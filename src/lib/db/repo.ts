import "server-only";

import { randomUUID } from "node:crypto";

import {
  getDb,
  insert,
  mapRow,
  remove,
  selectAll,
  selectById,
  transaction,
  update,
  type Row,
} from "./client";
import {
  APPLICATION_CONTACTS,
  APPLICATION_DOCUMENTS,
  APPLICATIONS,
  COMPANIES,
  CONTACTS,
  DISMISSED_SUGGESTIONS,
  INTERVIEWS,
  RECRUITING_EVENTS,
  RESUME_VERSIONS,
  TASKS,
  TIMELINE_EVENTS,
} from "./tables";
import { RESPONSE_STATUSES, statusToTimelineKind } from "@/lib/status";
import type {
  Application,
  ApplicationContactLink,
  ApplicationDocument,
  ApplicationDocumentInput,
  ApplicationInput,
  ApplicationPatch,
  ApplicationStatus,
  Company,
  CompanyInput,
  CompanyPatch,
  Contact,
  ContactInput,
  ContactPatch,
  Dataset,
  DismissedSuggestion,
  Interview,
  InterviewInput,
  InterviewPatch,
  RecruitingEvent,
  RecruitingEventInput,
  RecruitingEventPatch,
  ResumeVersion,
  ResumeVersionInput,
  ResumeVersionPatch,
  Task,
  TaskInput,
  TaskPatch,
  TimelineEvent,
  TimelineEventInput,
} from "@/types";

const nowIso = () => new Date().toISOString();

/* -------------------------------------------------------------------------- */
/*  Dataset bootstrap                                                         */
/* -------------------------------------------------------------------------- */

export function loadDataset(): Dataset {
  const applicationContacts = (
    getDb().prepare(`SELECT * FROM application_contacts`).all() as Row[]
  ).map((row) => mapRow<ApplicationContactLink>(APPLICATION_CONTACTS, row));

  return {
    applications: selectAll<Application>(APPLICATIONS, "updated_at DESC"),
    companies: selectAll<Company>(COMPANIES, "name COLLATE NOCASE ASC"),
    contacts: selectAll<Contact>(CONTACTS, "name COLLATE NOCASE ASC"),
    interviews: selectAll<Interview>(INTERVIEWS, "scheduled_at ASC"),
    tasks: selectAll<Task>(TASKS, "due_date ASC"),
    timelineEvents: selectAll<TimelineEvent>(TIMELINE_EVENTS, "occurred_at ASC"),
    recruitingEvents: selectAll<RecruitingEvent>(RECRUITING_EVENTS, "starts_at ASC"),
    resumeVersions: selectAll<ResumeVersion>(RESUME_VERSIONS, "created_at ASC"),
    documents: selectAll<ApplicationDocument>(APPLICATION_DOCUMENTS, "created_at ASC"),
    applicationContacts,
    dismissedSuggestions: selectAll<DismissedSuggestion>(DISMISSED_SUGGESTIONS, "dismissed_at DESC"),
  };
}

/* -------------------------------------------------------------------------- */
/*  Companies                                                                 */
/* -------------------------------------------------------------------------- */

export const listCompanies = () => selectAll<Company>(COMPANIES, "name COLLATE NOCASE ASC");
export const getCompany = (id: string) => selectById<Company>(COMPANIES, id);

export function createCompany(input: CompanyInput): Company {
  const ts = nowIso();
  const company: Company = { ...input, id: randomUUID(), createdAt: ts, updatedAt: ts };
  insert(COMPANIES, company as unknown as Record<string, unknown>);
  return company;
}

export function updateCompany(id: string, patch: CompanyPatch): Company | null {
  if (!selectById<Company>(COMPANIES, id)) return null;
  update(COMPANIES, id, { ...patch, updatedAt: nowIso() });
  return selectById<Company>(COMPANIES, id);
}

export function deleteCompany(id: string): void {
  remove(COMPANIES, id);
}

/** Find a company by exact (case-insensitive) name, creating it when absent. */
export function resolveCompany(name: string, industry: Company["industry"] = null): Company {
  const trimmed = name.trim();
  const existing = getDb()
    .prepare(`SELECT * FROM companies WHERE name = ? COLLATE NOCASE`)
    .get(trimmed) as Row | undefined;
  if (existing) return mapRow<Company>(COMPANIES, existing);

  return createCompany({
    name: trimmed,
    logoUrl: null,
    industry,
    website: null,
    careersUrl: null,
    headquarters: null,
    notes: null,
  });
}

/* -------------------------------------------------------------------------- */
/*  Applications                                                              */
/* -------------------------------------------------------------------------- */

export const listApplications = () => selectAll<Application>(APPLICATIONS, "updated_at DESC");
export const getApplication = (id: string) => selectById<Application>(APPLICATIONS, id);

function addTimelineEvent(input: TimelineEventInput): TimelineEvent {
  const event: TimelineEvent = { ...input, id: randomUUID(), createdAt: nowIso() };
  insert(TIMELINE_EVENTS, event as unknown as Record<string, unknown>);
  return event;
}

export function createApplication(input: ApplicationInput): Application {
  return transaction(() => {
    const company = input.companyId
      ? (getCompany(input.companyId) ?? resolveCompany(input.companyName, input.industry))
      : resolveCompany(input.companyName, input.industry);

    const ts = nowIso();
    const { companyName: _companyName, companyId: _companyId, ...rest } = input;
    const application: Application = {
      ...rest,
      id: randomUUID(),
      companyId: company.id,
      createdAt: ts,
      updatedAt: ts,
    };
    insert(APPLICATIONS, application as unknown as Record<string, unknown>);

    addTimelineEvent({
      applicationId: application.id,
      kind: statusToTimelineKind(application.status),
      title: application.status === "Applied" ? "Applied" : `Marked as ${application.status}`,
      description: null,
      occurredAt: application.dateApplied ?? ts,
    });

    if (application.deadline) {
      createRecruitingEvent({
        applicationId: application.id,
        companyId: company.id,
        title: `${company.name} — application deadline`,
        eventType: "Deadline",
        startsAt: application.deadline,
        endsAt: null,
        location: null,
        meetingLink: null,
        notes: null,
      });
    }

    return application;
  });
}

/**
 * Update an application, deriving the side effects a recruiting tracker is
 * expected to keep in sync: timeline entries for status changes, the applied
 * date when an application first reaches "Applied", and the first-response
 * date used by the analytics funnel.
 */
export function updateApplication(id: string, patch: ApplicationPatch): Application | null {
  return transaction(() => {
    const current = getApplication(id);
    if (!current) return null;

    // Typed loosely so the derived timestamp can ride along with the patch.
    const next: Record<string, unknown> = { ...patch, updatedAt: nowIso() };
    const statusChanged = patch.status !== undefined && patch.status !== current.status;

    if (statusChanged) {
      const status = patch.status as ApplicationStatus;
      if (status === "Applied" && !current.dateApplied && next.dateApplied === undefined) {
        next.dateApplied = new Date().toISOString().slice(0, 10);
      }
      if (RESPONSE_STATUSES.has(status) && !current.firstResponseDate && !next.firstResponseDate) {
        next.firstResponseDate = new Date().toISOString().slice(0, 10);
      }
    }

    update(APPLICATIONS, id, next);

    if (statusChanged) {
      addTimelineEvent({
        applicationId: id,
        kind: statusToTimelineKind(patch.status as ApplicationStatus),
        title: `Status changed to ${patch.status}`,
        description: `Previously ${current.status}`,
        occurredAt: nowIso(),
      });
    }

    return getApplication(id);
  });
}

export function deleteApplication(id: string): void {
  remove(APPLICATIONS, id);
}

/** Copy an application's position/company fields into a fresh draft. */
export function duplicateApplication(id: string): Application | null {
  const source = getApplication(id);
  if (!source) return null;

  const ts = nowIso();
  const copy: Application = {
    ...source,
    id: randomUUID(),
    position: `${source.position} (Copy)`,
    status: "Saved",
    dateApplied: null,
    firstResponseDate: null,
    createdAt: ts,
    updatedAt: ts,
  };
  insert(APPLICATIONS, copy as unknown as Record<string, unknown>);
  addTimelineEvent({
    applicationId: copy.id,
    kind: "Other",
    title: "Duplicated from an existing application",
    description: null,
    occurredAt: ts,
  });
  return copy;
}

export function bulkUpdateStatus(ids: string[], status: ApplicationStatus): Application[] {
  return ids
    .map((id) => updateApplication(id, { status }))
    .filter((application): application is Application => application !== null);
}

/* -------------------------------------------------------------------------- */
/*  Interviews                                                                */
/* -------------------------------------------------------------------------- */

export function createInterview(input: InterviewInput): Interview {
  return transaction(() => {
    const ts = nowIso();
    const interview: Interview = { ...input, id: randomUUID(), createdAt: ts, updatedAt: ts };
    insert(INTERVIEWS, interview as unknown as Record<string, unknown>);

    addTimelineEvent({
      applicationId: interview.applicationId,
      kind: "Interview",
      title: `${interview.interviewType} scheduled`,
      description: interview.interviewerName ? `With ${interview.interviewerName}` : null,
      occurredAt: interview.scheduledAt ?? ts,
    });

    if (interview.scheduledAt) {
      const application = getApplication(interview.applicationId);
      const company = application ? getCompany(application.companyId) : null;
      createRecruitingEvent({
        applicationId: interview.applicationId,
        companyId: application?.companyId ?? null,
        title: `${company?.name ?? "Interview"} — ${interview.interviewType}`,
        eventType: "Interview",
        startsAt: interview.scheduledAt,
        endsAt: null,
        location: interview.location,
        meetingLink: interview.meetingLink,
        notes: null,
      });
    }

    return interview;
  });
}

export function updateInterview(id: string, patch: InterviewPatch): Interview | null {
  if (!selectById<Interview>(INTERVIEWS, id)) return null;
  update(INTERVIEWS, id, { ...patch, updatedAt: nowIso() });
  return selectById<Interview>(INTERVIEWS, id);
}

export function deleteInterview(id: string): void {
  remove(INTERVIEWS, id);
}

/* -------------------------------------------------------------------------- */
/*  Tasks                                                                     */
/* -------------------------------------------------------------------------- */

export function createTask(input: TaskInput): Task {
  const ts = nowIso();
  const task: Task = {
    ...input,
    id: randomUUID(),
    completedAt: input.completed ? ts : null,
    createdAt: ts,
    updatedAt: ts,
  };
  insert(TASKS, task as unknown as Record<string, unknown>);
  return task;
}

export function updateTask(id: string, patch: TaskPatch): Task | null {
  const current = selectById<Task>(TASKS, id);
  if (!current) return null;

  const next: Record<string, unknown> = { ...patch, updatedAt: nowIso() };
  if (patch.completed !== undefined && patch.completed !== current.completed) {
    next.completedAt = patch.completed ? nowIso() : null;
  }
  update(TASKS, id, next);
  return selectById<Task>(TASKS, id);
}

export function deleteTask(id: string): void {
  remove(TASKS, id);
}

/* -------------------------------------------------------------------------- */
/*  Timeline                                                                  */
/* -------------------------------------------------------------------------- */

export function createTimelineEvent(input: TimelineEventInput): TimelineEvent {
  return addTimelineEvent(input);
}

export function deleteTimelineEvent(id: string): void {
  remove(TIMELINE_EVENTS, id);
}

/* -------------------------------------------------------------------------- */
/*  Recruiting events (calendar)                                              */
/* -------------------------------------------------------------------------- */

export function createRecruitingEvent(input: RecruitingEventInput): RecruitingEvent {
  const ts = nowIso();
  const event: RecruitingEvent = { ...input, id: randomUUID(), createdAt: ts, updatedAt: ts };
  insert(RECRUITING_EVENTS, event as unknown as Record<string, unknown>);
  return event;
}

export function updateRecruitingEvent(
  id: string,
  patch: RecruitingEventPatch,
): RecruitingEvent | null {
  if (!selectById<RecruitingEvent>(RECRUITING_EVENTS, id)) return null;
  update(RECRUITING_EVENTS, id, { ...patch, updatedAt: nowIso() });
  return selectById<RecruitingEvent>(RECRUITING_EVENTS, id);
}

export function deleteRecruitingEvent(id: string): void {
  remove(RECRUITING_EVENTS, id);
}

/* -------------------------------------------------------------------------- */
/*  Contacts                                                                  */
/* -------------------------------------------------------------------------- */

export function createContact(input: ContactInput): Contact {
  const ts = nowIso();
  const contact: Contact = { ...input, id: randomUUID(), createdAt: ts, updatedAt: ts };
  insert(CONTACTS, contact as unknown as Record<string, unknown>);
  return contact;
}

export function updateContact(id: string, patch: ContactPatch): Contact | null {
  if (!selectById<Contact>(CONTACTS, id)) return null;
  update(CONTACTS, id, { ...patch, updatedAt: nowIso() });
  return selectById<Contact>(CONTACTS, id);
}

export function deleteContact(id: string): void {
  remove(CONTACTS, id);
}

export function linkContact(applicationId: string, contactId: string, role: string | null): void {
  getDb()
    .prepare(
      `INSERT OR REPLACE INTO application_contacts (application_id, contact_id, role) VALUES (?, ?, ?)`,
    )
    .run(applicationId, contactId, role);
}

export function unlinkContact(applicationId: string, contactId: string): void {
  getDb()
    .prepare(`DELETE FROM application_contacts WHERE application_id = ? AND contact_id = ?`)
    .run(applicationId, contactId);
}

/* -------------------------------------------------------------------------- */
/*  Resume versions                                                           */
/* -------------------------------------------------------------------------- */

export function createResumeVersion(input: ResumeVersionInput): ResumeVersion {
  const ts = nowIso();
  const resume: ResumeVersion = { ...input, id: randomUUID(), createdAt: ts, updatedAt: ts };
  insert(RESUME_VERSIONS, resume as unknown as Record<string, unknown>);
  return resume;
}

export function updateResumeVersion(id: string, patch: ResumeVersionPatch): ResumeVersion | null {
  if (!selectById<ResumeVersion>(RESUME_VERSIONS, id)) return null;
  update(RESUME_VERSIONS, id, { ...patch, updatedAt: nowIso() });
  return selectById<ResumeVersion>(RESUME_VERSIONS, id);
}

export function deleteResumeVersion(id: string): void {
  remove(RESUME_VERSIONS, id);
}

/* -------------------------------------------------------------------------- */
/*  Documents                                                                 */
/* -------------------------------------------------------------------------- */

export function createDocument(input: ApplicationDocumentInput): ApplicationDocument {
  const doc: ApplicationDocument = { ...input, id: randomUUID(), createdAt: nowIso() };
  insert(APPLICATION_DOCUMENTS, doc as unknown as Record<string, unknown>);
  return doc;
}

export function updateDocument(
  id: string,
  patch: Partial<ApplicationDocumentInput>,
): ApplicationDocument | null {
  if (!selectById<ApplicationDocument>(APPLICATION_DOCUMENTS, id)) return null;
  update(APPLICATION_DOCUMENTS, id, patch);
  return selectById<ApplicationDocument>(APPLICATION_DOCUMENTS, id);
}

export function deleteDocument(id: string): void {
  remove(APPLICATION_DOCUMENTS, id);
}

/* -------------------------------------------------------------------------- */
/*  Follow-up dismissals                                                      */
/* -------------------------------------------------------------------------- */

export function dismissSuggestion(applicationId: string, reason: string): DismissedSuggestion {
  const record: DismissedSuggestion = {
    id: randomUUID(),
    applicationId,
    reason,
    dismissedAt: nowIso(),
  };
  insert(DISMISSED_SUGGESTIONS, record as unknown as Record<string, unknown>);
  return record;
}

export function restoreSuggestion(id: string): void {
  remove(DISMISSED_SUGGESTIONS, id);
}
