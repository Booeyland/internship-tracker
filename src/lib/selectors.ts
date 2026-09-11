import { daysSince } from "@/lib/dates";
import { compareValues } from "@/lib/utils";
import type {
  Application,
  ApplicationFilters,
  ApplicationWithRelations,
  Company,
  Contact,
  Dataset,
  SortDirection,
} from "@/types";

/** An empty dataset, used as the initial store value and for empty states. */
export const EMPTY_DATASET: Dataset = {
  applications: [],
  companies: [],
  contacts: [],
  interviews: [],
  tasks: [],
  timelineEvents: [],
  recruitingEvents: [],
  resumeVersions: [],
  documents: [],
  applicationContacts: [],
  dismissedSuggestions: [],
};

/** Joins the flat dataset into the denormalised shape the UI renders from. */
export function buildApplications(dataset: Dataset): ApplicationWithRelations[] {
  const companyById = new Map(dataset.companies.map((c) => [c.id, c]));
  const resumeById = new Map(dataset.resumeVersions.map((r) => [r.id, r]));
  const contactById = new Map(dataset.contacts.map((c) => [c.id, c]));

  const bucket = <T extends { applicationId: string | null }>(items: T[]) => {
    const map = new Map<string, T[]>();
    for (const item of items) {
      if (!item.applicationId) continue;
      const list = map.get(item.applicationId);
      if (list) list.push(item);
      else map.set(item.applicationId, [item]);
    }
    return map;
  };

  const interviews = bucket(dataset.interviews);
  const tasks = bucket(dataset.tasks);
  const timeline = bucket(dataset.timelineEvents);
  const documents = bucket(dataset.documents);
  const events = bucket(dataset.recruitingEvents);

  const contactsByApplication = new Map<string, Contact[]>();
  for (const link of dataset.applicationContacts) {
    const contact = contactById.get(link.contactId);
    if (!contact) continue;
    const list = contactsByApplication.get(link.applicationId);
    if (list) list.push(contact);
    else contactsByApplication.set(link.applicationId, [contact]);
  }

  const fallbackCompany = (id: string): Company => ({
    id,
    name: "Unknown company",
    logoUrl: null,
    industry: null,
    website: null,
    careersUrl: null,
    headquarters: null,
    notes: null,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  });

  return dataset.applications.map((application) => ({
    ...application,
    company: companyById.get(application.companyId) ?? fallbackCompany(application.companyId),
    resumeVersion: application.resumeVersionId
      ? (resumeById.get(application.resumeVersionId) ?? null)
      : null,
    interviews: (interviews.get(application.id) ?? []).sort((a, b) =>
      compareValues(a.scheduledAt, b.scheduledAt),
    ),
    tasks: (tasks.get(application.id) ?? []).sort((a, b) => compareValues(a.dueDate, b.dueDate)),
    timeline: (timeline.get(application.id) ?? []).sort((a, b) =>
      compareValues(a.occurredAt, b.occurredAt),
    ),
    documents: documents.get(application.id) ?? [],
    contacts: contactsByApplication.get(application.id) ?? [],
    events: (events.get(application.id) ?? []).sort((a, b) => compareValues(a.startsAt, b.startsAt)),
    daysSinceApplied: daysSince(application.dateApplied),
  }));
}

/* -------------------------------------------------------------------------- */
/*  Search                                                                    */
/* -------------------------------------------------------------------------- */

/** Every field the global search and table search look at. */
export function searchCorpus(application: ApplicationWithRelations): string {
  return [
    application.company.name,
    application.position,
    application.location,
    application.industry,
    application.status,
    application.source,
    application.notes,
    application.nextAction,
    application.recruiterName,
    application.referralName,
    application.connectionNotes,
    application.jobId,
    application.compensation,
    application.internshipType,
    application.resumeVersion?.name,
    ...application.contacts.map((c) => `${c.name} ${c.jobTitle ?? ""}`),
    ...application.interviews.map((i) => `${i.interviewType} ${i.interviewerName ?? ""} ${i.notes ?? ""}`),
    ...application.tasks.map((t) => t.title),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/* -------------------------------------------------------------------------- */
/*  Filtering                                                                 */
/* -------------------------------------------------------------------------- */

export const EMPTY_FILTERS: ApplicationFilters = {
  search: "",
  statuses: [],
  industries: [],
  companyIds: [],
  locations: [],
  sources: [],
  workTypes: [],
  appliedAfter: null,
  appliedBefore: null,
};

export function countActiveFilters(filters: ApplicationFilters): number {
  return (
    filters.statuses.length +
    filters.industries.length +
    filters.companyIds.length +
    filters.locations.length +
    filters.sources.length +
    filters.workTypes.length +
    (filters.appliedAfter ? 1 : 0) +
    (filters.appliedBefore ? 1 : 0)
  );
}

export function filterApplications(
  applications: ApplicationWithRelations[],
  filters: ApplicationFilters,
): ApplicationWithRelations[] {
  const term = filters.search.trim().toLowerCase();

  return applications.filter((application) => {
    if (term && !searchCorpus(application).includes(term)) return false;
    if (filters.statuses.length && !filters.statuses.includes(application.status)) return false;
    if (filters.industries.length) {
      if (!application.industry || !filters.industries.includes(application.industry)) return false;
    }
    if (filters.companyIds.length && !filters.companyIds.includes(application.companyId)) return false;
    if (filters.locations.length) {
      if (!application.location || !filters.locations.includes(application.location)) return false;
    }
    if (filters.sources.length) {
      if (!application.source || !filters.sources.includes(application.source)) return false;
    }
    if (filters.workTypes.length) {
      if (!application.workType || !filters.workTypes.includes(application.workType)) return false;
    }
    if (filters.appliedAfter) {
      if (!application.dateApplied || application.dateApplied < filters.appliedAfter) return false;
    }
    if (filters.appliedBefore) {
      if (!application.dateApplied || application.dateApplied > filters.appliedBefore) return false;
    }
    return true;
  });
}

/* -------------------------------------------------------------------------- */
/*  Sorting                                                                   */
/* -------------------------------------------------------------------------- */

/** Values the applications table sorts by, keyed by column id. */
export const SORT_ACCESSORS: Record<string, (a: ApplicationWithRelations) => unknown> = {
  company: (a) => a.company.name,
  position: (a) => a.position,
  industry: (a) => a.industry,
  status: (a) => a.status,
  dateApplied: (a) => a.dateApplied,
  location: (a) => a.location,
  workType: (a) => a.workType,
  source: (a) => a.source,
  compensation: (a) => a.compensation,
  contact: (a) => a.recruiterName ?? a.contacts[0]?.name ?? null,
  nextAction: (a) => a.nextAction,
  deadline: (a) => a.deadline,
  updatedAt: (a) => a.updatedAt,
  resume: (a) => a.resumeVersion?.name ?? null,
};

export function sortApplications(
  applications: ApplicationWithRelations[],
  sortKey: string,
  direction: SortDirection,
): ApplicationWithRelations[] {
  const accessor = SORT_ACCESSORS[sortKey] ?? SORT_ACCESSORS.updatedAt;
  const factor = direction === "asc" ? 1 : -1;
  return [...applications].sort((a, b) => compareValues(accessor(a), accessor(b)) * factor);
}

/* -------------------------------------------------------------------------- */
/*  Option lists derived from live data                                       */
/* -------------------------------------------------------------------------- */

export function distinctLocations(applications: Application[]): string[] {
  return Array.from(
    new Set(applications.map((a) => a.location).filter((l): l is string => Boolean(l))),
  ).sort((a, b) => a.localeCompare(b));
}
