import type {
  ApplicationStatus,
  DashboardStage,
  PipelineStage,
  Priority,
  TimelineEventKind,
} from "@/types";

/* -------------------------------------------------------------------------- */
/*  Status presentation                                                       */
/* -------------------------------------------------------------------------- */

export interface StatusMeta {
  /** Tailwind classes for the badge (works in both themes). */
  badge: string;
  /** Solid colour used for charts and the dot on the badge. */
  color: string;
  /** Where the status sits in the Kanban pipeline; null = terminal/off-board. */
  stage: PipelineStage | null;
  /** Rank used for "furthest stage reached" analytics. */
  rank: number;
}

export const STATUS_META: Record<ApplicationStatus, StatusMeta> = {
  Interested: {
    badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    color: "#64748b",
    stage: "Interested",
    rank: 0,
  },
  Saved: {
    badge: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    color: "#71717a",
    stage: "Interested",
    rank: 1,
  },
  Applied: {
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    color: "#3b82f6",
    stage: "Applied",
    rank: 2,
  },
  "Online Assessment": {
    badge: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
    color: "#8b5cf6",
    stage: "Assessment",
    rank: 3,
  },
  HireVue: {
    badge: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-300",
    color: "#d946ef",
    stage: "Assessment",
    rank: 3,
  },
  "First Round": {
    badge: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
    color: "#06b6d4",
    stage: "First Round",
    rank: 4,
  },
  "Second Round": {
    badge: "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
    color: "#14b8a6",
    stage: "Second Round",
    rank: 5,
  },
  "Superday / Final Round": {
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    color: "#f59e0b",
    stage: "Final Round",
    rank: 6,
  },
  Offer: {
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    color: "#10b981",
    stage: "Offer",
    rank: 7,
  },
  Accepted: {
    badge: "bg-green-600 text-white dark:bg-green-600 dark:text-white",
    color: "#16a34a",
    stage: "Offer",
    rank: 8,
  },
  Rejected: {
    badge: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
    color: "#ef4444",
    stage: null,
    rank: -1,
  },
  Withdrawn: {
    badge: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400",
    color: "#a8a29e",
    stage: null,
    rank: -1,
  },
  Ghosted: {
    badge: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
    color: "#f97316",
    stage: null,
    rank: -1,
  },
};

export const PRIORITY_META: Record<Priority, { badge: string; color: string }> = {
  High: {
    badge: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
    color: "#ef4444",
  },
  Medium: {
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    color: "#f59e0b",
  },
  Low: {
    badge: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    color: "#94a3b8",
  },
};

/* -------------------------------------------------------------------------- */
/*  Status groupings                                                          */
/* -------------------------------------------------------------------------- */

/** Statuses that prove the company replied — used for response-rate analytics. */
export const RESPONSE_STATUSES: ReadonlySet<ApplicationStatus> = new Set<ApplicationStatus>([
  "Online Assessment",
  "HireVue",
  "First Round",
  "Second Round",
  "Superday / Final Round",
  "Offer",
  "Accepted",
  "Rejected",
]);

/** Statuses that mean the process is over, one way or another. */
export const CLOSED_STATUSES: ReadonlySet<ApplicationStatus> = new Set<ApplicationStatus>([
  "Accepted",
  "Rejected",
  "Withdrawn",
  "Ghosted",
]);

/** Statuses where the application has been submitted (as opposed to a draft). */
export const SUBMITTED_STATUSES: ReadonlySet<ApplicationStatus> = new Set<ApplicationStatus>([
  "Applied",
  "Online Assessment",
  "HireVue",
  "First Round",
  "Second Round",
  "Superday / Final Round",
  "Offer",
  "Accepted",
  "Rejected",
  "Ghosted",
]);

/** Statuses that represent an actual interview round. */
export const INTERVIEW_STATUSES: ReadonlySet<ApplicationStatus> = new Set<ApplicationStatus>([
  "First Round",
  "Second Round",
  "Superday / Final Round",
  "Offer",
  "Accepted",
]);

export const ASSESSMENT_STATUSES: ReadonlySet<ApplicationStatus> = new Set<ApplicationStatus>([
  "Online Assessment",
  "HireVue",
]);

/** Statuses still in play — nothing terminal. */
export const ACTIVE_STATUSES: ApplicationStatus[] = [
  "Applied",
  "Online Assessment",
  "HireVue",
  "First Round",
  "Second Round",
  "Superday / Final Round",
  "Offer",
];

/* -------------------------------------------------------------------------- */
/*  Stage mapping                                                             */
/* -------------------------------------------------------------------------- */

/** The status a card takes when dropped into a pipeline column. */
export const STAGE_DEFAULT_STATUS: Record<PipelineStage, ApplicationStatus> = {
  Interested: "Interested",
  Applied: "Applied",
  Assessment: "Online Assessment",
  "First Round": "First Round",
  "Second Round": "Second Round",
  "Final Round": "Superday / Final Round",
  Offer: "Offer",
};

export function stageForStatus(status: ApplicationStatus): PipelineStage | null {
  return STATUS_META[status].stage;
}

/** Maps a status onto the wider dashboard funnel, which separates Saved out. */
export function dashboardStageForStatus(status: ApplicationStatus): DashboardStage | null {
  if (status === "Saved" || status === "Interested") return "Saved";
  const stage = STATUS_META[status].stage;
  if (stage === "Interested") return "Saved";
  return stage;
}

export function statusToTimelineKind(status: ApplicationStatus): TimelineEventKind {
  switch (status) {
    case "Applied":
      return "Applied";
    case "Online Assessment":
    case "HireVue":
      return "Assessment";
    case "First Round":
    case "Second Round":
    case "Superday / Final Round":
      return "Interview";
    case "Offer":
    case "Accepted":
      return "Offer";
    case "Rejected":
    case "Ghosted":
      return "Rejection";
    default:
      return "Status Change";
  }
}

/** True when the application reached at least the given status rank. */
export function reachedStage(status: ApplicationStatus, minimumRank: number): boolean {
  return STATUS_META[status].rank >= minimumRank;
}
