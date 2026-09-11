import { HttpError } from "@/lib/http";
import {
  APPLICATION_SOURCES,
  APPLICATION_STATUSES,
  DOCUMENT_TYPES,
  EVENT_TYPES,
  INDUSTRIES,
  INTERNSHIP_TYPES,
  INTERVIEW_OUTCOMES,
  INTERVIEW_TYPES,
  PRIORITIES,
  RELATIONSHIP_TYPES,
  TASK_TYPES,
  TIMELINE_EVENT_KINDS,
  WORK_TYPES,
} from "@/types";
import type {
  ApplicationDocumentInput,
  ApplicationInput,
  ApplicationPatch,
  CompanyInput,
  CompanyPatch,
  ContactInput,
  ContactPatch,
  InterviewInput,
  InterviewPatch,
  RecruitingEventInput,
  RecruitingEventPatch,
  ResumeVersionInput,
  ResumeVersionPatch,
  TaskInput,
  TaskPatch,
  TimelineEventInput,
} from "@/types";

type Body = Record<string, unknown>;

/* -------------------------------------------------------------------------- */
/*  Primitive coercion                                                        */
/* -------------------------------------------------------------------------- */

function requiredString(body: Body, key: string, label = key): string {
  const value = body[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new HttpError(`${label} is required`);
  }
  return value.trim();
}

/** Optional text: missing, empty and whitespace-only all collapse to null. */
function nullableString(body: Body, key: string): string | null {
  const value = body[key];
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return String(value);
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function bool(body: Body, key: string, fallback = false): boolean {
  const value = body[key];
  if (value === undefined || value === null) return fallback;
  return Boolean(value);
}

function nullableInt(body: Body, key: string): number | null {
  const value = body[key];
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function enumValue<T extends string>(
  body: Body,
  key: string,
  allowed: readonly T[],
  fallback: T,
  label = key,
): T {
  const value = body[key];
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new HttpError(`${label} must be one of: ${allowed.join(", ")}`);
  }
  return value as T;
}

function nullableEnum<T extends string>(
  body: Body,
  key: string,
  allowed: readonly T[],
  label = key,
): T | null {
  const value = body[key];
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new HttpError(`${label} must be one of: ${allowed.join(", ")}`);
  }
  return value as T;
}

/**
 * Builds a patch containing only the keys actually present in the body, so a
 * PATCH never overwrites fields the caller did not mention.
 */
function pick<T extends object>(
  body: Body,
  readers: { [K in keyof T]?: (body: Body, key: string) => T[K] },
): Partial<T> {
  const patch: Record<string, unknown> = {};
  for (const [key, read] of Object.entries(readers)) {
    if (key in body) patch[key] = (read as (b: Body, k: string) => unknown)(body, key);
  }
  return patch as Partial<T>;
}

/* -------------------------------------------------------------------------- */
/*  Applications                                                              */
/* -------------------------------------------------------------------------- */

export function parseApplicationInput(body: Body): ApplicationInput {
  return {
    companyName: requiredString(body, "companyName", "Company name"),
    companyId: nullableString(body, "companyId"),
    position: requiredString(body, "position", "Position title"),
    internshipType: nullableEnum(body, "internshipType", INTERNSHIP_TYPES, "Internship type"),
    industry: nullableEnum(body, "industry", INDUSTRIES, "Industry"),
    location: nullableString(body, "location"),
    workType: nullableEnum(body, "workType", WORK_TYPES, "Work type"),
    jobPostingUrl: nullableString(body, "jobPostingUrl"),
    jobId: nullableString(body, "jobId"),
    jobDescription: nullableString(body, "jobDescription"),
    compensation: nullableString(body, "compensation"),
    deadline: nullableString(body, "deadline"),
    status: enumValue(body, "status", APPLICATION_STATUSES, "Saved", "Status"),
    dateApplied: nullableString(body, "dateApplied"),
    source: nullableEnum(body, "source", APPLICATION_SOURCES, "Application source"),
    isReferral: bool(body, "isReferral"),
    resumeVersionId: nullableString(body, "resumeVersionId"),
    coverLetterSubmitted: bool(body, "coverLetterSubmitted"),
    transcriptSubmitted: bool(body, "transcriptSubmitted"),
    recruiterName: nullableString(body, "recruiterName"),
    recruiterEmail: nullableString(body, "recruiterEmail"),
    recruiterLinkedin: nullableString(body, "recruiterLinkedin"),
    referralName: nullableString(body, "referralName"),
    connectionNotes: nullableString(body, "connectionNotes"),
    notes: nullableString(body, "notes"),
    nextAction: nullableString(body, "nextAction"),
    firstResponseDate: nullableString(body, "firstResponseDate"),
  };
}

export function parseApplicationPatch(body: Body): ApplicationPatch {
  return pick<ApplicationPatch>(body, {
    companyId: (b, k) => requiredString(b, k, "Company"),
    position: (b, k) => requiredString(b, k, "Position title"),
    internshipType: (b, k) => nullableEnum(b, k, INTERNSHIP_TYPES, "Internship type"),
    industry: (b, k) => nullableEnum(b, k, INDUSTRIES, "Industry"),
    location: nullableString,
    workType: (b, k) => nullableEnum(b, k, WORK_TYPES, "Work type"),
    jobPostingUrl: nullableString,
    jobId: nullableString,
    jobDescription: nullableString,
    compensation: nullableString,
    deadline: nullableString,
    status: (b, k) => enumValue(b, k, APPLICATION_STATUSES, "Saved", "Status"),
    dateApplied: nullableString,
    source: (b, k) => nullableEnum(b, k, APPLICATION_SOURCES, "Application source"),
    isReferral: (b, k) => bool(b, k),
    resumeVersionId: nullableString,
    coverLetterSubmitted: (b, k) => bool(b, k),
    transcriptSubmitted: (b, k) => bool(b, k),
    recruiterName: nullableString,
    recruiterEmail: nullableString,
    recruiterLinkedin: nullableString,
    referralName: nullableString,
    connectionNotes: nullableString,
    notes: nullableString,
    nextAction: nullableString,
    firstResponseDate: nullableString,
  });
}

/* -------------------------------------------------------------------------- */
/*  Companies                                                                 */
/* -------------------------------------------------------------------------- */

export function parseCompanyInput(body: Body): CompanyInput {
  return {
    name: requiredString(body, "name", "Company name"),
    logoUrl: nullableString(body, "logoUrl"),
    industry: nullableEnum(body, "industry", INDUSTRIES, "Industry"),
    website: nullableString(body, "website"),
    careersUrl: nullableString(body, "careersUrl"),
    headquarters: nullableString(body, "headquarters"),
    notes: nullableString(body, "notes"),
  };
}

export function parseCompanyPatch(body: Body): CompanyPatch {
  return pick<CompanyPatch>(body, {
    name: (b, k) => requiredString(b, k, "Company name"),
    logoUrl: nullableString,
    industry: (b, k) => nullableEnum(b, k, INDUSTRIES, "Industry"),
    website: nullableString,
    careersUrl: nullableString,
    headquarters: nullableString,
    notes: nullableString,
  });
}

/* -------------------------------------------------------------------------- */
/*  Contacts                                                                  */
/* -------------------------------------------------------------------------- */

export function parseContactInput(body: Body): ContactInput {
  return {
    companyId: nullableString(body, "companyId"),
    name: requiredString(body, "name", "Contact name"),
    jobTitle: nullableString(body, "jobTitle"),
    email: nullableString(body, "email"),
    phone: nullableString(body, "phone"),
    linkedinUrl: nullableString(body, "linkedinUrl"),
    relationship: enumValue(body, "relationship", RELATIONSHIP_TYPES, "Recruiter", "Relationship"),
    lastContactDate: nullableString(body, "lastContactDate"),
    nextFollowUpDate: nullableString(body, "nextFollowUpDate"),
    notes: nullableString(body, "notes"),
  };
}

export function parseContactPatch(body: Body): ContactPatch {
  return pick<ContactPatch>(body, {
    companyId: nullableString,
    name: (b, k) => requiredString(b, k, "Contact name"),
    jobTitle: nullableString,
    email: nullableString,
    phone: nullableString,
    linkedinUrl: nullableString,
    relationship: (b, k) => enumValue(b, k, RELATIONSHIP_TYPES, "Recruiter", "Relationship"),
    lastContactDate: nullableString,
    nextFollowUpDate: nullableString,
    notes: nullableString,
  });
}

/* -------------------------------------------------------------------------- */
/*  Interviews                                                                */
/* -------------------------------------------------------------------------- */

export function parseInterviewInput(body: Body): InterviewInput {
  return {
    applicationId: requiredString(body, "applicationId", "Application"),
    interviewType: enumValue(body, "interviewType", INTERVIEW_TYPES, "First Round", "Interview type"),
    scheduledAt: nullableString(body, "scheduledAt"),
    durationMinutes: nullableInt(body, "durationMinutes"),
    interviewerName: nullableString(body, "interviewerName"),
    interviewerTitle: nullableString(body, "interviewerTitle"),
    interviewerLinkedin: nullableString(body, "interviewerLinkedin"),
    meetingLink: nullableString(body, "meetingLink"),
    location: nullableString(body, "location"),
    notes: nullableString(body, "notes"),
    outcome: enumValue(body, "outcome", INTERVIEW_OUTCOMES, "Pending", "Outcome"),
  };
}

export function parseInterviewPatch(body: Body): InterviewPatch {
  return pick<InterviewPatch>(body, {
    interviewType: (b, k) => enumValue(b, k, INTERVIEW_TYPES, "First Round", "Interview type"),
    scheduledAt: nullableString,
    durationMinutes: nullableInt,
    interviewerName: nullableString,
    interviewerTitle: nullableString,
    interviewerLinkedin: nullableString,
    meetingLink: nullableString,
    location: nullableString,
    notes: nullableString,
    outcome: (b, k) => enumValue(b, k, INTERVIEW_OUTCOMES, "Pending", "Outcome"),
  });
}

/* -------------------------------------------------------------------------- */
/*  Tasks                                                                     */
/* -------------------------------------------------------------------------- */

export function parseTaskInput(body: Body): TaskInput {
  return {
    applicationId: nullableString(body, "applicationId"),
    contactId: nullableString(body, "contactId"),
    title: requiredString(body, "title", "Task name"),
    taskType: enumValue(body, "taskType", TASK_TYPES, "Other", "Task type"),
    dueDate: nullableString(body, "dueDate"),
    priority: enumValue(body, "priority", PRIORITIES, "Medium", "Priority"),
    completed: bool(body, "completed"),
    notes: nullableString(body, "notes"),
    autoSuggested: bool(body, "autoSuggested"),
  };
}

export function parseTaskPatch(body: Body): TaskPatch {
  return pick<TaskPatch>(body, {
    applicationId: nullableString,
    contactId: nullableString,
    title: (b, k) => requiredString(b, k, "Task name"),
    taskType: (b, k) => enumValue(b, k, TASK_TYPES, "Other", "Task type"),
    dueDate: nullableString,
    priority: (b, k) => enumValue(b, k, PRIORITIES, "Medium", "Priority"),
    completed: (b, k) => bool(b, k),
    notes: nullableString,
  });
}

/* -------------------------------------------------------------------------- */
/*  Timeline + calendar                                                       */
/* -------------------------------------------------------------------------- */

export function parseTimelineInput(body: Body): TimelineEventInput {
  return {
    applicationId: requiredString(body, "applicationId", "Application"),
    kind: enumValue(body, "kind", TIMELINE_EVENT_KINDS, "Other", "Event kind"),
    title: requiredString(body, "title", "Event title"),
    description: nullableString(body, "description"),
    occurredAt: nullableString(body, "occurredAt") ?? new Date().toISOString(),
  };
}

export function parseEventInput(body: Body): RecruitingEventInput {
  return {
    applicationId: nullableString(body, "applicationId"),
    companyId: nullableString(body, "companyId"),
    title: requiredString(body, "title", "Event title"),
    eventType: enumValue(body, "eventType", EVENT_TYPES, "Other", "Event type"),
    startsAt: requiredString(body, "startsAt", "Start date"),
    endsAt: nullableString(body, "endsAt"),
    location: nullableString(body, "location"),
    meetingLink: nullableString(body, "meetingLink"),
    notes: nullableString(body, "notes"),
  };
}

export function parseEventPatch(body: Body): RecruitingEventPatch {
  return pick<RecruitingEventPatch>(body, {
    applicationId: nullableString,
    companyId: nullableString,
    title: (b, k) => requiredString(b, k, "Event title"),
    eventType: (b, k) => enumValue(b, k, EVENT_TYPES, "Other", "Event type"),
    startsAt: (b, k) => requiredString(b, k, "Start date"),
    endsAt: nullableString,
    location: nullableString,
    meetingLink: nullableString,
    notes: nullableString,
  });
}

/* -------------------------------------------------------------------------- */
/*  Resumes + documents                                                       */
/* -------------------------------------------------------------------------- */

export function parseResumeInput(body: Body): ResumeVersionInput {
  return {
    name: requiredString(body, "name", "Resume name"),
    description: nullableString(body, "description"),
    fileUrl: nullableString(body, "fileUrl"),
    isDefault: bool(body, "isDefault"),
  };
}

export function parseResumePatch(body: Body): ResumeVersionPatch {
  return pick<ResumeVersionPatch>(body, {
    name: (b, k) => requiredString(b, k, "Resume name"),
    description: nullableString,
    fileUrl: nullableString,
    isDefault: (b, k) => bool(b, k),
  });
}

export function parseDocumentInput(body: Body): ApplicationDocumentInput {
  return {
    applicationId: requiredString(body, "applicationId", "Application"),
    documentType: enumValue(body, "documentType", DOCUMENT_TYPES, "Other", "Document type"),
    name: requiredString(body, "name", "Document name"),
    fileUrl: nullableString(body, "fileUrl"),
    submitted: bool(body, "submitted"),
  };
}

export function parseDocumentPatch(body: Body): Partial<ApplicationDocumentInput> {
  return pick<ApplicationDocumentInput>(body, {
    documentType: (b, k) => enumValue(b, k, DOCUMENT_TYPES, "Other", "Document type"),
    name: (b, k) => requiredString(b, k, "Document name"),
    fileUrl: nullableString,
    submitted: (b, k) => bool(b, k),
  });
}

/* -------------------------------------------------------------------------- */
/*  Bulk + misc                                                               */
/* -------------------------------------------------------------------------- */

export function parseIdList(body: Body, key = "ids"): string[] {
  const value = body[key];
  if (!Array.isArray(value) || value.length === 0) {
    throw new HttpError("Select at least one application first");
  }
  return value.map((id) => {
    if (typeof id !== "string" || !id) throw new HttpError("Invalid id in selection");
    return id;
  });
}

export { requiredString, nullableString, enumValue };
