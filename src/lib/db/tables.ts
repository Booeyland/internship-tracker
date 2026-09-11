/**
 * Column maps translating between camelCase entity fields and snake_case SQL
 * columns. A single declarative map per table drives row mapping, inserts and
 * partial updates, so adding a column means editing one line here plus the DDL.
 */

export type ColumnKind = "text" | "bool" | "int";

export interface TableSpec {
  table: string;
  /** entity field -> [column name, storage kind] */
  columns: Record<string, readonly [string, ColumnKind]>;
  /** Primary key column(s). Composite keys are supported for join tables. */
  primaryKey: readonly string[];
}

const t = (name: string) => [name, "text"] as const;
const b = (name: string) => [name, "bool"] as const;
const i = (name: string) => [name, "int"] as const;

export const COMPANIES: TableSpec = {
  table: "companies",
  primaryKey: ["id"],
  columns: {
    id: t("id"),
    name: t("name"),
    logoUrl: t("logo_url"),
    industry: t("industry"),
    website: t("website"),
    careersUrl: t("careers_url"),
    headquarters: t("headquarters"),
    notes: t("notes"),
    createdAt: t("created_at"),
    updatedAt: t("updated_at"),
  },
};

export const RESUME_VERSIONS: TableSpec = {
  table: "resume_versions",
  primaryKey: ["id"],
  columns: {
    id: t("id"),
    name: t("name"),
    description: t("description"),
    fileUrl: t("file_url"),
    isDefault: b("is_default"),
    createdAt: t("created_at"),
    updatedAt: t("updated_at"),
  },
};

export const CONTACTS: TableSpec = {
  table: "contacts",
  primaryKey: ["id"],
  columns: {
    id: t("id"),
    companyId: t("company_id"),
    name: t("name"),
    jobTitle: t("job_title"),
    email: t("email"),
    phone: t("phone"),
    linkedinUrl: t("linkedin_url"),
    relationship: t("relationship"),
    lastContactDate: t("last_contact_date"),
    nextFollowUpDate: t("next_follow_up_date"),
    notes: t("notes"),
    createdAt: t("created_at"),
    updatedAt: t("updated_at"),
  },
};

export const APPLICATIONS: TableSpec = {
  table: "applications",
  primaryKey: ["id"],
  columns: {
    id: t("id"),
    companyId: t("company_id"),
    position: t("position"),
    internshipType: t("internship_type"),
    industry: t("industry"),
    location: t("location"),
    workType: t("work_type"),
    jobPostingUrl: t("job_posting_url"),
    jobId: t("job_id"),
    jobDescription: t("job_description"),
    compensation: t("compensation"),
    deadline: t("deadline"),
    status: t("status"),
    dateApplied: t("date_applied"),
    source: t("source"),
    isReferral: b("is_referral"),
    resumeVersionId: t("resume_version_id"),
    coverLetterSubmitted: b("cover_letter_submitted"),
    transcriptSubmitted: b("transcript_submitted"),
    recruiterName: t("recruiter_name"),
    recruiterEmail: t("recruiter_email"),
    recruiterLinkedin: t("recruiter_linkedin"),
    referralName: t("referral_name"),
    connectionNotes: t("connection_notes"),
    notes: t("notes"),
    nextAction: t("next_action"),
    firstResponseDate: t("first_response_date"),
    createdAt: t("created_at"),
    updatedAt: t("updated_at"),
  },
};

export const INTERVIEWS: TableSpec = {
  table: "interviews",
  primaryKey: ["id"],
  columns: {
    id: t("id"),
    applicationId: t("application_id"),
    interviewType: t("interview_type"),
    scheduledAt: t("scheduled_at"),
    durationMinutes: i("duration_minutes"),
    interviewerName: t("interviewer_name"),
    interviewerTitle: t("interviewer_title"),
    interviewerLinkedin: t("interviewer_linkedin"),
    meetingLink: t("meeting_link"),
    location: t("location"),
    notes: t("notes"),
    outcome: t("outcome"),
    createdAt: t("created_at"),
    updatedAt: t("updated_at"),
  },
};

export const TASKS: TableSpec = {
  table: "tasks",
  primaryKey: ["id"],
  columns: {
    id: t("id"),
    applicationId: t("application_id"),
    contactId: t("contact_id"),
    title: t("title"),
    taskType: t("task_type"),
    dueDate: t("due_date"),
    priority: t("priority"),
    completed: b("completed"),
    completedAt: t("completed_at"),
    notes: t("notes"),
    autoSuggested: b("auto_suggested"),
    createdAt: t("created_at"),
    updatedAt: t("updated_at"),
  },
};

export const TIMELINE_EVENTS: TableSpec = {
  table: "timeline_events",
  primaryKey: ["id"],
  columns: {
    id: t("id"),
    applicationId: t("application_id"),
    kind: t("kind"),
    title: t("title"),
    description: t("description"),
    occurredAt: t("occurred_at"),
    createdAt: t("created_at"),
  },
};

export const RECRUITING_EVENTS: TableSpec = {
  table: "recruiting_events",
  primaryKey: ["id"],
  columns: {
    id: t("id"),
    applicationId: t("application_id"),
    companyId: t("company_id"),
    title: t("title"),
    eventType: t("event_type"),
    startsAt: t("starts_at"),
    endsAt: t("ends_at"),
    location: t("location"),
    meetingLink: t("meeting_link"),
    notes: t("notes"),
    createdAt: t("created_at"),
    updatedAt: t("updated_at"),
  },
};

export const APPLICATION_DOCUMENTS: TableSpec = {
  table: "application_documents",
  primaryKey: ["id"],
  columns: {
    id: t("id"),
    applicationId: t("application_id"),
    documentType: t("document_type"),
    name: t("name"),
    fileUrl: t("file_url"),
    submitted: b("submitted"),
    createdAt: t("created_at"),
  },
};

export const APPLICATION_CONTACTS: TableSpec = {
  table: "application_contacts",
  primaryKey: ["application_id", "contact_id"],
  columns: {
    applicationId: t("application_id"),
    contactId: t("contact_id"),
    role: t("role"),
  },
};

export const DISMISSED_SUGGESTIONS: TableSpec = {
  table: "dismissed_suggestions",
  primaryKey: ["id"],
  columns: {
    id: t("id"),
    applicationId: t("application_id"),
    reason: t("reason"),
    dismissedAt: t("dismissed_at"),
  },
};
