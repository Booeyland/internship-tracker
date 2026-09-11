import { daysFromToday, daysSince, isOverdue } from "@/lib/dates";
import { stageFlags } from "@/lib/analytics";
import { CLOSED_STATUSES } from "@/lib/status";
import type {
  ApplicationWithRelations,
  DismissedSuggestion,
  FollowUpSuggestion,
  TaskType,
} from "@/types";

/** Stable reason codes so dismissals survive data changes. */
export const FOLLOW_UP_REASONS = {
  noResponse: "no-response",
  interviewFollowUp: "interview-follow-up",
  assessmentPending: "assessment-pending",
  deadlineSoon: "deadline-soon",
  overdueTask: "overdue-task",
  staleActive: "stale-active",
} as const;

export type FollowUpReason = (typeof FOLLOW_UP_REASONS)[keyof typeof FOLLOW_UP_REASONS];

/** Days after applying with no reply before a follow-up is suggested. */
const NO_RESPONSE_THRESHOLD_DAYS = 7;
/** Days an interview-stage application can sit untouched before a nudge. */
const STALE_ACTIVE_THRESHOLD_DAYS = 10;
const DEADLINE_WARNING_DAYS = 7;

interface Candidate {
  reason: FollowUpReason;
  detail: string;
  suggestedAction: string;
  suggestedTaskType: TaskType;
  priority: FollowUpSuggestion["priority"];
  severity: FollowUpSuggestion["severity"];
}

/** True when a task already covers this suggestion, so we do not nag twice. */
function hasOpenTaskOfType(application: ApplicationWithRelations, types: TaskType[]): boolean {
  return application.tasks.some((task) => !task.completed && types.includes(task.taskType));
}

function evaluate(application: ApplicationWithRelations): Candidate[] {
  const candidates: Candidate[] = [];
  const flags = stageFlags(application);
  const closed = CLOSED_STATUSES.has(application.status);
  const waiting = daysSince(application.dateApplied);

  /* Applied a while ago and still no reply. ----------------------------- */
  if (
    !closed &&
    flags.applied &&
    !flags.responded &&
    waiting !== null &&
    waiting >= NO_RESPONSE_THRESHOLD_DAYS &&
    !hasOpenTaskOfType(application, ["Follow Up"])
  ) {
    candidates.push({
      reason: FOLLOW_UP_REASONS.noResponse,
      detail: `Applied ${waiting} days ago with no response`,
      suggestedAction: "Follow up with the recruiting team",
      suggestedTaskType: "Follow Up",
      priority: waiting >= 14 ? "High" : "Medium",
      severity: waiting >= 14 ? "overdue" : "due",
    });
  }

  /* An interview happened but nothing was logged afterwards. ------------ */
  const pastPendingInterview = application.interviews.find((interview) => {
    const delta = daysFromToday(interview.scheduledAt);
    return delta !== null && delta < 0 && interview.outcome === "Pending";
  });
  if (
    !closed &&
    pastPendingInterview &&
    !hasOpenTaskOfType(application, ["Thank You Note", "Follow Up"])
  ) {
    const elapsed = Math.abs(daysFromToday(pastPendingInterview.scheduledAt) ?? 0);
    candidates.push({
      reason: FOLLOW_UP_REASONS.interviewFollowUp,
      detail: `${pastPendingInterview.interviewType} was ${elapsed} day${elapsed === 1 ? "" : "s"} ago with no outcome recorded`,
      suggestedAction: "Send a thank-you note and record the outcome",
      suggestedTaskType: "Thank You Note",
      priority: "High",
      severity: elapsed >= 2 ? "overdue" : "due",
    });
  }

  /* Sitting in an assessment stage without an open task. ---------------- */
  if (
    (application.status === "Online Assessment" || application.status === "HireVue") &&
    !hasOpenTaskOfType(application, ["Complete Assessment"])
  ) {
    candidates.push({
      reason: FOLLOW_UP_REASONS.assessmentPending,
      detail: `Waiting on the ${application.status.toLowerCase()} with no task tracking it`,
      suggestedAction: "Schedule time to complete the assessment",
      suggestedTaskType: "Complete Assessment",
      priority: "High",
      severity: "due",
    });
  }

  /* Saved role with a deadline coming up. ------------------------------- */
  const deadlineIn = daysFromToday(application.deadline);
  if (
    !flags.applied &&
    !closed &&
    deadlineIn !== null &&
    deadlineIn <= DEADLINE_WARNING_DAYS &&
    !hasOpenTaskOfType(application, ["Submit Application"])
  ) {
    candidates.push({
      reason: FOLLOW_UP_REASONS.deadlineSoon,
      detail:
        deadlineIn < 0
          ? `Deadline passed ${Math.abs(deadlineIn)} days ago`
          : `Deadline is ${deadlineIn === 0 ? "today" : `in ${deadlineIn} days`} and it has not been submitted`,
      suggestedAction: "Submit the application",
      suggestedTaskType: "Submit Application",
      priority: "High",
      severity: deadlineIn < 0 ? "overdue" : "due",
    });
  }

  /* A task on this application is already overdue. ---------------------- */
  const overdueTask = application.tasks.find((task) => !task.completed && isOverdue(task.dueDate));
  if (overdueTask) {
    const late = Math.abs(daysFromToday(overdueTask.dueDate) ?? 0);
    candidates.push({
      reason: FOLLOW_UP_REASONS.overdueTask,
      detail: `“${overdueTask.title}” is overdue by ${late} day${late === 1 ? "" : "s"}`,
      suggestedAction: "Complete or reschedule the task",
      suggestedTaskType: overdueTask.taskType,
      priority: overdueTask.priority,
      severity: "overdue",
    });
  }

  /* Mid-process but nothing has moved in a while. ----------------------- */
  const sinceUpdate = daysSince(application.updatedAt);
  if (
    !closed &&
    flags.interview &&
    !flags.offer &&
    sinceUpdate !== null &&
    sinceUpdate >= STALE_ACTIVE_THRESHOLD_DAYS &&
    application.interviews.every((i) => (daysFromToday(i.scheduledAt) ?? -999) < 0)
  ) {
    candidates.push({
      reason: FOLLOW_UP_REASONS.staleActive,
      detail: `No movement in ${sinceUpdate} days while still in the interview process`,
      suggestedAction: "Check in on the process status",
      suggestedTaskType: "Follow Up",
      priority: "Medium",
      severity: "info",
    });
  }

  return candidates;
}

const SEVERITY_ORDER: Record<FollowUpSuggestion["severity"], number> = {
  overdue: 0,
  due: 1,
  info: 2,
};

/**
 * Produces the "Needs attention" list. Nothing here sends anything — each item
 * can only be turned into a task or dismissed by the user.
 */
export function followUpSuggestions(
  applications: ApplicationWithRelations[],
  dismissed: DismissedSuggestion[],
): FollowUpSuggestion[] {
  const dismissedKeys = new Set(dismissed.map((d) => `${d.applicationId}:${d.reason}`));

  const suggestions: FollowUpSuggestion[] = [];
  for (const application of applications) {
    for (const candidate of evaluate(application)) {
      const key = `${application.id}:${candidate.reason}`;
      if (dismissedKeys.has(key)) continue;
      suggestions.push({
        id: key,
        applicationId: application.id,
        application,
        reason: candidate.reason,
        detail: candidate.detail,
        suggestedAction: candidate.suggestedAction,
        suggestedTaskType: candidate.suggestedTaskType,
        priority: candidate.priority,
        severity: candidate.severity,
      });
    }
  }

  return suggestions.sort((a, b) => {
    const bySeverity = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (bySeverity !== 0) return bySeverity;
    return a.application.company.name.localeCompare(b.application.company.name);
  });
}
