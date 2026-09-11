import { stageFlags } from "@/lib/analytics";
import { isOverdue } from "@/lib/dates";
import { ACTIVE_STATUSES, CLOSED_STATUSES } from "@/lib/status";
import type { ApplicationWithRelations, SavedView } from "@/types";

/** Days with no response before an application lands in "Need follow-up". */
const FOLLOW_UP_AFTER_DAYS = 7;

/**
 * Saved views are declarative filters plus an optional predicate for the rules
 * that cannot be expressed as a simple field match.
 */
export const SAVED_VIEWS: SavedView[] = [
  {
    id: "all",
    name: "All applications",
    filters: {},
    sortKey: "updatedAt",
    sortDirection: "desc",
  },
  {
    id: "active",
    name: "Active applications",
    filters: { statuses: [...ACTIVE_STATUSES] },
    sortKey: "dateApplied",
    sortDirection: "desc",
  },
  {
    id: "need-follow-up",
    name: "Need follow-up",
    filters: {},
    predicate: (application) => {
      if (CLOSED_STATUSES.has(application.status)) return false;
      const flags = stageFlags(application);
      const hasOverdueTask = application.tasks.some(
        (task) => !task.completed && isOverdue(task.dueDate),
      );
      if (hasOverdueTask) return true;
      if (!flags.applied || flags.responded) return false;
      return (application.daysSinceApplied ?? 0) >= FOLLOW_UP_AFTER_DAYS;
    },
    sortKey: "dateApplied",
    sortDirection: "asc",
  },
  {
    id: "interviews",
    name: "Interviews",
    filters: {},
    predicate: (application) => stageFlags(application).interview,
    sortKey: "status",
    sortDirection: "desc",
  },
  {
    id: "offers",
    name: "Offers",
    filters: { statuses: ["Offer", "Accepted"] },
    sortKey: "updatedAt",
    sortDirection: "desc",
  },
  {
    id: "rejected",
    name: "Rejected",
    filters: { statuses: ["Rejected", "Ghosted", "Withdrawn"] },
    sortKey: "updatedAt",
    sortDirection: "desc",
  },
  {
    id: "recently-applied",
    name: "Recently applied",
    filters: {},
    predicate: (application) =>
      application.daysSinceApplied !== null && application.daysSinceApplied <= 7,
    sortKey: "dateApplied",
    sortDirection: "desc",
  },
  {
    id: "saved",
    name: "Not yet applied",
    filters: { statuses: ["Saved", "Interested"] },
    sortKey: "deadline",
    sortDirection: "asc",
  },
];

export function findView(id: string | null | undefined): SavedView {
  return SAVED_VIEWS.find((view) => view.id === id) ?? SAVED_VIEWS[0];
}

export function applyViewPredicate(
  view: SavedView,
  applications: ApplicationWithRelations[],
): ApplicationWithRelations[] {
  return view.predicate ? applications.filter(view.predicate) : applications;
}
