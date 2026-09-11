"use client";

import * as React from "react";
import { toast } from "sonner";

import { ApiError, api } from "@/lib/api";
import { EMPTY_DATASET, buildApplications } from "@/lib/selectors";
import type {
  Application,
  ApplicationDocument,
  ApplicationDocumentInput,
  ApplicationInput,
  ApplicationPatch,
  ApplicationStatus,
  ApplicationWithRelations,
  Company,
  CompanyInput,
  CompanyPatch,
  Contact,
  ContactInput,
  ContactPatch,
  Dataset,
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

type LoadState = "loading" | "ready" | "error";

interface TrackerContextValue {
  state: LoadState;
  error: string | null;
  /** True while a mutation is in flight; drives subtle busy affordances. */
  saving: boolean;
  dataset: Dataset;
  applications: ApplicationWithRelations[];
  applicationById: Map<string, ApplicationWithRelations>;
  refresh: () => Promise<void>;

  createApplication: (input: ApplicationInput) => Promise<Application | null>;
  updateApplication: (id: string, patch: ApplicationPatch) => Promise<void>;
  deleteApplication: (id: string) => Promise<void>;
  duplicateApplication: (id: string) => Promise<Application | null>;
  bulkUpdateStatus: (ids: string[], status: ApplicationStatus) => Promise<void>;
  bulkDelete: (ids: string[]) => Promise<void>;

  createCompany: (input: CompanyInput) => Promise<Company | null>;
  updateCompany: (id: string, patch: CompanyPatch) => Promise<void>;
  deleteCompany: (id: string) => Promise<void>;

  createContact: (input: ContactInput) => Promise<Contact | null>;
  updateContact: (id: string, patch: ContactPatch) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;
  linkContact: (applicationId: string, contactId: string, role: string | null) => Promise<void>;
  unlinkContact: (applicationId: string, contactId: string) => Promise<void>;

  createInterview: (input: InterviewInput) => Promise<Interview | null>;
  updateInterview: (id: string, patch: InterviewPatch) => Promise<void>;
  deleteInterview: (id: string) => Promise<void>;

  createTask: (input: TaskInput) => Promise<Task | null>;
  updateTask: (id: string, patch: TaskPatch) => Promise<void>;
  toggleTask: (id: string, completed: boolean) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  createTimelineEvent: (input: TimelineEventInput) => Promise<TimelineEvent | null>;
  deleteTimelineEvent: (id: string) => Promise<void>;

  createEvent: (input: RecruitingEventInput) => Promise<RecruitingEvent | null>;
  updateEvent: (id: string, patch: RecruitingEventPatch) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;

  createResume: (input: ResumeVersionInput) => Promise<ResumeVersion | null>;
  updateResume: (id: string, patch: ResumeVersionPatch) => Promise<void>;
  deleteResume: (id: string) => Promise<void>;

  createDocument: (input: ApplicationDocumentInput) => Promise<ApplicationDocument | null>;
  updateDocument: (id: string, patch: Partial<ApplicationDocumentInput>) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;

  dismissSuggestion: (applicationId: string, reason: string) => Promise<void>;
  restoreSuggestion: (id: string) => Promise<void>;

  reseed: () => Promise<void>;
  resetAll: () => Promise<void>;
}

const TrackerContext = React.createContext<TrackerContextValue | null>(null);

export function TrackerProvider({ children }: { children: React.ReactNode }) {
  const [dataset, setDataset] = React.useState<Dataset>(EMPTY_DATASET);
  const [state, setState] = React.useState<LoadState>("loading");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(0);

  const load = React.useCallback(async (showSpinner: boolean) => {
    if (showSpinner) setState("loading");
    try {
      const next = await api.bootstrap();
      setDataset(next);
      setError(null);
      setState("ready");
    } catch (caught) {
      const message =
        caught instanceof ApiError ? caught.message : "Something went wrong loading your data.";
      setError(message);
      setState("error");
    }
  }, []);

  React.useEffect(() => {
    void load(true);
  }, [load]);

  /**
   * Runs a mutation, then reconciles with the server. The optimistic patch
   * keeps drag-and-drop and checkboxes instant; the refetch picks up the
   * server-derived side effects (timeline entries, applied dates, cascades).
   */
  const mutate = React.useCallback(
    async <T,>(
      run: () => Promise<T>,
      options: { optimistic?: (current: Dataset) => Dataset; successMessage?: string } = {},
    ): Promise<T | null> => {
      const snapshot = dataset;
      if (options.optimistic) setDataset(options.optimistic(snapshot));
      setPending((n) => n + 1);
      try {
        const result = await run();
        await load(false);
        if (options.successMessage) toast.success(options.successMessage);
        return result;
      } catch (caught) {
        setDataset(snapshot);
        const message = caught instanceof ApiError ? caught.message : "That change could not be saved.";
        toast.error(message);
        return null;
      } finally {
        setPending((n) => n - 1);
      }
    },
    [dataset, load],
  );

  const applications = React.useMemo(() => buildApplications(dataset), [dataset]);
  const applicationById = React.useMemo(
    () => new Map(applications.map((a) => [a.id, a])),
    [applications],
  );

  const value = React.useMemo<TrackerContextValue>(() => {
    /**
     * Merges a patch into one row of a dataset collection, for optimistic
     * updates. The patch is typed as `object` so the element type is inferred
     * from `items` alone rather than from the (narrower) patch shape.
     */
    const patchIn = <T extends { id: string }>(items: T[], id: string, patch: object): T[] =>
      items.map((item) => (item.id === id ? { ...item, ...patch } : item));

    return {
      state,
      error,
      saving: pending > 0,
      dataset,
      applications,
      applicationById,
      refresh: () => load(false),

      createApplication: (input) =>
        mutate(() => api.post<Application>("/api/applications", input), {
          successMessage: `${input.companyName} — ${input.position} added`,
        }),

      updateApplication: async (id, patch) => {
        await mutate(() => api.patch<Application>(`/api/applications/${id}`, patch), {
          optimistic: (current) => ({
            ...current,
            applications: patchIn(current.applications, id, patch),
          }),
        });
      },

      deleteApplication: async (id) => {
        await mutate(() => api.del(`/api/applications/${id}`), {
          optimistic: (current) => ({
            ...current,
            applications: current.applications.filter((a) => a.id !== id),
          }),
          successMessage: "Application deleted",
        });
      },

      duplicateApplication: (id) =>
        mutate(() => api.post<Application>(`/api/applications/${id}/duplicate`, {}), {
          successMessage: "Application duplicated",
        }),

      bulkUpdateStatus: async (ids, status) => {
        await mutate(() => api.post("/api/applications/bulk", { ids, status }), {
          optimistic: (current) => ({
            ...current,
            applications: current.applications.map((a) =>
              ids.includes(a.id) ? { ...a, status } : a,
            ),
          }),
          successMessage: `${ids.length} application${ids.length === 1 ? "" : "s"} moved to ${status}`,
        });
      },

      bulkDelete: async (ids) => {
        await mutate(() => api.post("/api/applications/bulk", { ids, action: "delete" }), {
          optimistic: (current) => ({
            ...current,
            applications: current.applications.filter((a) => !ids.includes(a.id)),
          }),
          successMessage: `${ids.length} application${ids.length === 1 ? "" : "s"} deleted`,
        });
      },

      createCompany: (input) =>
        mutate(() => api.post<Company>("/api/companies", input), {
          successMessage: `${input.name} added`,
        }),
      updateCompany: async (id, patch) => {
        await mutate(() => api.patch<Company>(`/api/companies/${id}`, patch), {
          optimistic: (current) => ({ ...current, companies: patchIn(current.companies, id, patch) }),
          successMessage: "Company updated",
        });
      },
      deleteCompany: async (id) => {
        await mutate(() => api.del(`/api/companies/${id}`), {
          successMessage: "Company deleted",
        });
      },

      createContact: (input) =>
        mutate(() => api.post<Contact>("/api/contacts", input), {
          successMessage: `${input.name} added to contacts`,
        }),
      updateContact: async (id, patch) => {
        await mutate(() => api.patch<Contact>(`/api/contacts/${id}`, patch), {
          optimistic: (current) => ({ ...current, contacts: patchIn(current.contacts, id, patch) }),
          successMessage: "Contact updated",
        });
      },
      deleteContact: async (id) => {
        await mutate(() => api.del(`/api/contacts/${id}`), { successMessage: "Contact deleted" });
      },
      linkContact: async (applicationId, contactId, role) => {
        await mutate(() => api.post(`/api/applications/${applicationId}/contacts`, { contactId, role }), {
          successMessage: "Contact linked",
        });
      },
      unlinkContact: async (applicationId, contactId) => {
        await mutate(() => api.del(`/api/applications/${applicationId}/contacts?contactId=${contactId}`), {
          successMessage: "Contact unlinked",
        });
      },

      createInterview: (input) =>
        mutate(() => api.post<Interview>("/api/interviews", input), {
          successMessage: "Interview added",
        }),
      updateInterview: async (id, patch) => {
        await mutate(() => api.patch<Interview>(`/api/interviews/${id}`, patch), {
          optimistic: (current) => ({ ...current, interviews: patchIn(current.interviews, id, patch) }),
          successMessage: "Interview updated",
        });
      },
      deleteInterview: async (id) => {
        await mutate(() => api.del(`/api/interviews/${id}`), { successMessage: "Interview deleted" });
      },

      createTask: (input) =>
        mutate(() => api.post<Task>("/api/tasks", input), { successMessage: "Task added" }),
      updateTask: async (id, patch) => {
        await mutate(() => api.patch<Task>(`/api/tasks/${id}`, patch), {
          optimistic: (current) => ({ ...current, tasks: patchIn(current.tasks, id, patch) }),
        });
      },
      toggleTask: async (id, completed) => {
        await mutate(() => api.patch<Task>(`/api/tasks/${id}`, { completed }), {
          optimistic: (current) => ({ ...current, tasks: patchIn(current.tasks, id, { completed }) }),
        });
      },
      deleteTask: async (id) => {
        await mutate(() => api.del(`/api/tasks/${id}`), {
          optimistic: (current) => ({ ...current, tasks: current.tasks.filter((t) => t.id !== id) }),
          successMessage: "Task deleted",
        });
      },

      createTimelineEvent: (input) =>
        mutate(() => api.post<TimelineEvent>("/api/timeline", input), {
          successMessage: "Timeline event added",
        }),
      deleteTimelineEvent: async (id) => {
        await mutate(() => api.del(`/api/timeline/${id}`), {
          optimistic: (current) => ({
            ...current,
            timelineEvents: current.timelineEvents.filter((e) => e.id !== id),
          }),
          successMessage: "Timeline event removed",
        });
      },

      createEvent: (input) =>
        mutate(() => api.post<RecruitingEvent>("/api/events", input), {
          successMessage: "Event added to calendar",
        }),
      updateEvent: async (id, patch) => {
        await mutate(() => api.patch<RecruitingEvent>(`/api/events/${id}`, patch), {
          optimistic: (current) => ({
            ...current,
            recruitingEvents: patchIn(current.recruitingEvents, id, patch),
          }),
          successMessage: "Event updated",
        });
      },
      deleteEvent: async (id) => {
        await mutate(() => api.del(`/api/events/${id}`), { successMessage: "Event deleted" });
      },

      createResume: (input) =>
        mutate(() => api.post<ResumeVersion>("/api/resumes", input), {
          successMessage: `${input.name} added`,
        }),
      updateResume: async (id, patch) => {
        await mutate(() => api.patch<ResumeVersion>(`/api/resumes/${id}`, patch), {
          optimistic: (current) => ({
            ...current,
            resumeVersions: patchIn(current.resumeVersions, id, patch),
          }),
          successMessage: "Resume version updated",
        });
      },
      deleteResume: async (id) => {
        await mutate(() => api.del(`/api/resumes/${id}`), {
          successMessage: "Resume version deleted",
        });
      },

      createDocument: (input) =>
        mutate(() => api.post<ApplicationDocument>("/api/documents", input), {
          successMessage: "Document tracked",
        }),
      updateDocument: async (id, patch) => {
        await mutate(() => api.patch<ApplicationDocument>(`/api/documents/${id}`, patch), {
          optimistic: (current) => ({ ...current, documents: patchIn(current.documents, id, patch) }),
        });
      },
      deleteDocument: async (id) => {
        await mutate(() => api.del(`/api/documents/${id}`), { successMessage: "Document removed" });
      },

      dismissSuggestion: async (applicationId, reason) => {
        await mutate(() => api.post("/api/suggestions", { applicationId, reason }), {
          successMessage: "Suggestion dismissed",
        });
      },
      restoreSuggestion: async (id) => {
        await mutate(() => api.del(`/api/suggestions/${id}`), {
          successMessage: "Suggestion restored",
        });
      },

      reseed: async () => {
        await mutate(() => api.post("/api/seed", { mode: "demo" }), {
          successMessage: "Sample data loaded",
        });
      },
      resetAll: async () => {
        await mutate(() => api.post("/api/seed", { mode: "empty" }), {
          successMessage: "All data cleared",
        });
      },
    };
  }, [state, error, pending, dataset, applications, applicationById, load, mutate]);

  return <TrackerContext.Provider value={value}>{children}</TrackerContext.Provider>;
}

export function useTracker(): TrackerContextValue {
  const context = React.useContext(TrackerContext);
  if (!context) throw new Error("useTracker must be used inside <TrackerProvider>");
  return context;
}
