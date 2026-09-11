/**
 * Domain model for the Internship Tracker.
 *
 * Enumerations are declared as readonly tuples so they can be iterated at
 * runtime (filter menus, seed data, validation) while still producing strict
 * literal union types at compile time.
 */

/* -------------------------------------------------------------------------- */
/*  Enumerations                                                              */
/* -------------------------------------------------------------------------- */

export const APPLICATION_STATUSES = [
  "Interested",
  "Saved",
  "Applied",
  "Online Assessment",
  "HireVue",
  "First Round",
  "Second Round",
  "Superday / Final Round",
  "Offer",
  "Accepted",
  "Rejected",
  "Withdrawn",
  "Ghosted",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const INDUSTRIES = [
  "Investment Banking",
  "Private Equity",
  "Asset Management",
  "Corporate Finance",
  "Consulting",
  "Accounting",
  "Real Estate",
  "FinTech",
  "Technology",
  "Sales & Trading",
  "Venture Capital",
  "Other",
] as const;
export type Industry = (typeof INDUSTRIES)[number];

export const WORK_TYPES = ["Remote", "Hybrid", "In-Person"] as const;
export type WorkType = (typeof WORK_TYPES)[number];

export const APPLICATION_SOURCES = [
  "LinkedIn",
  "Handshake",
  "Company Website",
  "Indeed",
  "Referral",
  "Career Fair",
  "Recruiter Outreach",
  "Networking",
  "Other",
] as const;
export type ApplicationSource = (typeof APPLICATION_SOURCES)[number];

export const INTERNSHIP_TYPES = [
  "Summer Analyst",
  "Summer Associate",
  "Off-Cycle",
  "Spring Week",
  "Insight Program",
  "Co-op",
  "Part-Time",
  "Other",
] as const;
export type InternshipType = (typeof INTERNSHIP_TYPES)[number];

export const INTERVIEW_TYPES = [
  "Phone Screen",
  "Recruiter Call",
  "HireVue",
  "Technical",
  "Behavioral",
  "Case Study",
  "First Round",
  "Second Round",
  "Superday",
  "Final Round",
  "Coffee Chat",
  "Other",
] as const;
export type InterviewType = (typeof INTERVIEW_TYPES)[number];

export const INTERVIEW_OUTCOMES = [
  "Pending",
  "Advanced",
  "Rejected",
  "No Response",
  "Cancelled",
] as const;
export type InterviewOutcome = (typeof INTERVIEW_OUTCOMES)[number];

export const TASK_TYPES = [
  "Follow Up",
  "Submit Application",
  "Complete Assessment",
  "Prepare for Interview",
  "Thank You Note",
  "Networking",
  "Research",
  "Other",
] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export const PRIORITIES = ["Low", "Medium", "High"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const RELATIONSHIP_TYPES = [
  "Recruiter",
  "Alumni",
  "Referral",
  "Employee",
  "Interviewer",
  "Friend",
  "Other",
] as const;
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export const DOCUMENT_TYPES = [
  "Resume",
  "Cover Letter",
  "Transcript",
  "Writing Sample",
  "Other",
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const EVENT_TYPES = [
  "Deadline",
  "Interview",
  "Assessment",
  "Follow-Up",
  "Networking Call",
  "Career Fair",
  "Info Session",
  "Other",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const TIMELINE_EVENT_KINDS = [
  "Status Change",
  "Applied",
  "Assessment",
  "Interview",
  "Communication",
  "Note",
  "Offer",
  "Rejection",
  "Other",
] as const;
export type TimelineEventKind = (typeof TIMELINE_EVENT_KINDS)[number];

/* -------------------------------------------------------------------------- */
/*  Pipeline stages                                                           */
/* -------------------------------------------------------------------------- */

export const PIPELINE_STAGES = [
  "Interested",
  "Applied",
  "Assessment",
  "First Round",
  "Second Round",
  "Final Round",
  "Offer",
] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

/** Dashboard funnel adds the pre-application "Saved" step in front of the pipeline. */
export const DASHBOARD_STAGES = [
  "Saved",
  "Applied",
  "Assessment",
  "First Round",
  "Second Round",
  "Final Round",
  "Offer",
] as const;
export type DashboardStage = (typeof DASHBOARD_STAGES)[number];

/* -------------------------------------------------------------------------- */
/*  Entities                                                                  */
/* -------------------------------------------------------------------------- */

export interface Company {
  id: string;
  name: string;
  logoUrl: string | null;
  industry: Industry | null;
  website: string | null;
  careersUrl: string | null;
  headquarters: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ResumeVersion {
  id: string;
  name: string;
  description: string | null;
  fileUrl: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  companyId: string | null;
  name: string;
  jobTitle: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  relationship: RelationshipType;
  lastContactDate: string | null;
  nextFollowUpDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Application {
  id: string;
  companyId: string;

  // Position information
  position: string;
  internshipType: InternshipType | null;
  industry: Industry | null;
  location: string | null;
  workType: WorkType | null;
  jobPostingUrl: string | null;
  jobId: string | null;
  jobDescription: string | null;
  compensation: string | null;
  deadline: string | null;

  // Application information
  status: ApplicationStatus;
  dateApplied: string | null;
  source: ApplicationSource | null;
  isReferral: boolean;
  resumeVersionId: string | null;
  coverLetterSubmitted: boolean;
  transcriptSubmitted: boolean;

  // Primary contact denormalised onto the application for fast entry. Richer
  // relationships live in the contacts table via application_contacts.
  recruiterName: string | null;
  recruiterEmail: string | null;
  recruiterLinkedin: string | null;
  referralName: string | null;
  connectionNotes: string | null;

  notes: string | null;

  /** Free-text reminder of the next thing to do for this application. */
  nextAction: string | null;

  /** Date of the first substantive reply from the company; drives response analytics. */
  firstResponseDate: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface Interview {
  id: string;
  applicationId: string;
  interviewType: InterviewType;
  scheduledAt: string | null;
  durationMinutes: number | null;
  interviewerName: string | null;
  interviewerTitle: string | null;
  interviewerLinkedin: string | null;
  meetingLink: string | null;
  location: string | null;
  notes: string | null;
  outcome: InterviewOutcome;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  applicationId: string | null;
  contactId: string | null;
  title: string;
  taskType: TaskType;
  dueDate: string | null;
  priority: Priority;
  completed: boolean;
  completedAt: string | null;
  notes: string | null;
  /** True when the task originated from a follow-up suggestion. */
  autoSuggested: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TimelineEvent {
  id: string;
  applicationId: string;
  kind: TimelineEventKind;
  title: string;
  description: string | null;
  occurredAt: string;
  createdAt: string;
}

export interface RecruitingEvent {
  id: string;
  applicationId: string | null;
  companyId: string | null;
  title: string;
  eventType: EventType;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  meetingLink: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationDocument {
  id: string;
  applicationId: string;
  documentType: DocumentType;
  name: string;
  fileUrl: string | null;
  submitted: boolean;
  createdAt: string;
}

export interface ApplicationContactLink {
  applicationId: string;
  contactId: string;
  role: string | null;
}

/** A follow-up suggestion the user has explicitly dismissed. */
export interface DismissedSuggestion {
  id: string;
  applicationId: string;
  reason: string;
  dismissedAt: string;
}

/* -------------------------------------------------------------------------- */
/*  Derived / view models                                                     */
/* -------------------------------------------------------------------------- */

/** An application joined with everything needed to render it anywhere in the UI. */
export interface ApplicationWithRelations extends Application {
  company: Company;
  resumeVersion: ResumeVersion | null;
  interviews: Interview[];
  tasks: Task[];
  timeline: TimelineEvent[];
  documents: ApplicationDocument[];
  contacts: Contact[];
  events: RecruitingEvent[];
  /** Days elapsed since dateApplied; null when not yet applied. */
  daysSinceApplied: number | null;
}

export interface FollowUpSuggestion {
  id: string;
  applicationId: string;
  application: ApplicationWithRelations;
  reason: string;
  detail: string;
  suggestedAction: string;
  suggestedTaskType: TaskType;
  priority: Priority;
  severity: "overdue" | "due" | "info";
}

/* -------------------------------------------------------------------------- */
/*  Write payloads                                                            */
/* -------------------------------------------------------------------------- */

type Timestamps = "createdAt" | "updatedAt";

export type ApplicationInput = Omit<Application, "id" | Timestamps | "companyId"> & {
  /** Existing company id, when the user picked one from the combobox. */
  companyId?: string | null;
  /** Company name; resolved to an existing company or used to create one. */
  companyName: string;
};
export type ApplicationPatch = Partial<Omit<Application, "id" | Timestamps>>;

export type CompanyInput = Omit<Company, "id" | Timestamps>;
export type CompanyPatch = Partial<CompanyInput>;

export type ContactInput = Omit<Contact, "id" | Timestamps>;
export type ContactPatch = Partial<ContactInput>;

export type InterviewInput = Omit<Interview, "id" | Timestamps>;
export type InterviewPatch = Partial<Omit<InterviewInput, "applicationId">>;

export type TaskInput = Omit<Task, "id" | Timestamps | "completedAt">;
export type TaskPatch = Partial<Omit<Task, "id" | Timestamps>>;

export type TimelineEventInput = Omit<TimelineEvent, "id" | "createdAt">;

export type RecruitingEventInput = Omit<RecruitingEvent, "id" | Timestamps>;
export type RecruitingEventPatch = Partial<RecruitingEventInput>;

export type ResumeVersionInput = Omit<ResumeVersion, "id" | Timestamps>;
export type ResumeVersionPatch = Partial<ResumeVersionInput>;

export type ApplicationDocumentInput = Omit<ApplicationDocument, "id" | "createdAt">;

/* -------------------------------------------------------------------------- */
/*  Bootstrap payload                                                         */
/* -------------------------------------------------------------------------- */

export interface Dataset {
  applications: Application[];
  companies: Company[];
  contacts: Contact[];
  interviews: Interview[];
  tasks: Task[];
  timelineEvents: TimelineEvent[];
  recruitingEvents: RecruitingEvent[];
  resumeVersions: ResumeVersion[];
  documents: ApplicationDocument[];
  applicationContacts: ApplicationContactLink[];
  dismissedSuggestions: DismissedSuggestion[];
}

/* -------------------------------------------------------------------------- */
/*  Filtering / saved views                                                   */
/* -------------------------------------------------------------------------- */

export interface ApplicationFilters {
  search: string;
  statuses: ApplicationStatus[];
  industries: Industry[];
  companyIds: string[];
  locations: string[];
  sources: ApplicationSource[];
  workTypes: WorkType[];
  appliedAfter: string | null;
  appliedBefore: string | null;
}

export type SortDirection = "asc" | "desc";

export interface SavedView {
  id: string;
  name: string;
  filters: Partial<ApplicationFilters>;
  /** Extra predicate applied after the declarative filters. */
  predicate?: (application: ApplicationWithRelations) => boolean;
  sortKey?: string;
  sortDirection?: SortDirection;
}
