import { differenceInCalendarDays, format, startOfDay, subDays } from "date-fns";

import { daysSince, isoWeekKey, monthKey, parseDate } from "@/lib/dates";
import {
  ASSESSMENT_STATUSES,
  CLOSED_STATUSES,
  INTERVIEW_STATUSES,
  RESPONSE_STATUSES,
  STATUS_META,
  SUBMITTED_STATUSES,
  dashboardStageForStatus,
} from "@/lib/status";
import { percentage } from "@/lib/utils";
import { DASHBOARD_STAGES, type ApplicationWithRelations, type DashboardStage } from "@/types";

/* -------------------------------------------------------------------------- */
/*  Stage attainment                                                          */
/* -------------------------------------------------------------------------- */

export interface StageFlags {
  applied: boolean;
  /** An assessment actually happened — a take-home, online test or HireVue. */
  assessment: boolean;
  interview: boolean;
  finalRound: boolean;
  offer: boolean;
  /** Any evidence the company replied — even a rejection counts. */
  responded: boolean;
}

const FINAL_ROUND_INTERVIEWS = new Set(["Superday", "Final Round"]);
const ASSESSMENT_INTERVIEWS = new Set(["HireVue"]);

/**
 * Determines the furthest stage an application actually reached, combining the
 * current status with historical evidence (timeline entries and logged
 * interviews). This matters because a rejected application may still have
 * passed through three interview rounds, and the funnel must reflect that.
 */
export function stageFlags(application: ApplicationWithRelations): StageFlags {
  const rank = STATUS_META[application.status].rank;

  const hasTimeline = (kind: string) => application.timeline.some((event) => event.kind === kind);

  const applied =
    SUBMITTED_STATUSES.has(application.status) ||
    application.dateApplied !== null ||
    hasTimeline("Applied");

  // Evidence-based on purpose: plenty of processes have no assessment step at
  // all, so "reached a later stage" must not imply one happened.
  const assessment =
    ASSESSMENT_STATUSES.has(application.status) ||
    hasTimeline("Assessment") ||
    application.interviews.some((i) => ASSESSMENT_INTERVIEWS.has(i.interviewType));

  const realInterviews = application.interviews.filter(
    (i) => !ASSESSMENT_INTERVIEWS.has(i.interviewType) && i.interviewType !== "Coffee Chat",
  );

  const interview =
    INTERVIEW_STATUSES.has(application.status) ||
    rank >= 4 ||
    hasTimeline("Interview") ||
    realInterviews.length > 0;

  const finalRound =
    rank >= 6 ||
    application.interviews.some((i) => FINAL_ROUND_INTERVIEWS.has(i.interviewType)) ||
    application.status === "Superday / Final Round";

  const offer = rank >= 7 || hasTimeline("Offer");

  const responded =
    RESPONSE_STATUSES.has(application.status) ||
    application.firstResponseDate !== null ||
    assessment ||
    interview ||
    offer;

  return { applied, assessment, interview, finalRound, offer, responded };
}

/* -------------------------------------------------------------------------- */
/*  Headline metrics                                                          */
/* -------------------------------------------------------------------------- */

export interface HeadlineMetrics {
  total: number;
  submitted: number;
  thisWeek: number;
  lastWeek: number;
  interviews: number;
  offers: number;
  rejections: number;
  awaitingResponse: number;
  responseRate: number;
  offerRate: number;
  interviewRate: number;
  active: number;
}

export function headlineMetrics(applications: ApplicationWithRelations[]): HeadlineMetrics {
  const today = startOfDay(new Date());
  const sevenDaysAgo = subDays(today, 7);
  const fourteenDaysAgo = subDays(today, 14);

  let submitted = 0;
  let thisWeek = 0;
  let lastWeek = 0;
  let interviews = 0;
  let offers = 0;
  let rejections = 0;
  let awaitingResponse = 0;
  let responded = 0;
  let active = 0;

  for (const application of applications) {
    const flags = stageFlags(application);
    if (flags.applied) submitted += 1;
    if (flags.interview) interviews += 1;
    if (flags.offer) offers += 1;
    if (application.status === "Rejected") rejections += 1;
    if (!CLOSED_STATUSES.has(application.status) && flags.applied) active += 1;

    if (flags.applied && flags.responded) responded += 1;
    // "Awaiting response" means submitted, still open, and no reply yet.
    if (flags.applied && !flags.responded && !CLOSED_STATUSES.has(application.status)) {
      awaitingResponse += 1;
    }

    const appliedDate = parseDate(application.dateApplied);
    if (appliedDate) {
      if (appliedDate >= sevenDaysAgo) thisWeek += 1;
      else if (appliedDate >= fourteenDaysAgo) lastWeek += 1;
    }
  }

  return {
    total: applications.length,
    submitted,
    thisWeek,
    lastWeek,
    interviews,
    offers,
    rejections,
    awaitingResponse,
    responseRate: percentage(responded, submitted),
    offerRate: percentage(offers, submitted),
    interviewRate: percentage(interviews, submitted),
    active,
  };
}

/* -------------------------------------------------------------------------- */
/*  Pipeline                                                                  */
/* -------------------------------------------------------------------------- */

export interface StageCount {
  stage: DashboardStage;
  count: number;
}

/** Current occupancy of each dashboard stage (not cumulative). */
export function pipelineCounts(applications: ApplicationWithRelations[]): StageCount[] {
  const counts = new Map<DashboardStage, number>(DASHBOARD_STAGES.map((stage) => [stage, 0]));
  for (const application of applications) {
    const stage = dashboardStageForStatus(application.status);
    if (stage) counts.set(stage, (counts.get(stage) ?? 0) + 1);
  }
  return DASHBOARD_STAGES.map((stage) => ({ stage, count: counts.get(stage) ?? 0 }));
}

/* -------------------------------------------------------------------------- */
/*  Activity over time                                                        */
/* -------------------------------------------------------------------------- */

export type ActivityRange = "7d" | "30d" | "90d" | "all";

export const ACTIVITY_RANGES: { id: ActivityRange; label: string; days: number | null }[] = [
  { id: "7d", label: "7 days", days: 7 },
  { id: "30d", label: "30 days", days: 30 },
  { id: "90d", label: "90 days", days: 90 },
  { id: "all", label: "All time", days: null },
];

export interface ActivityPoint {
  date: string;
  label: string;
  applications: number;
  interviews: number;
}

/**
 * Applications submitted per day over the selected window. Days with no
 * activity are included so the chart keeps an honest time axis.
 */
export function activitySeries(
  applications: ApplicationWithRelations[],
  range: ActivityRange,
): ActivityPoint[] {
  const config = ACTIVITY_RANGES.find((r) => r.id === range) ?? ACTIVITY_RANGES[1];
  const today = startOfDay(new Date());

  const appliedDates = applications
    .map((a) => parseDate(a.dateApplied))
    .filter((d): d is Date => d !== null);

  let days = config.days;
  if (days === null) {
    const earliest = appliedDates.reduce<Date | null>(
      (min, date) => (min === null || date < min ? date : min),
      null,
    );
    days = earliest ? Math.max(differenceInCalendarDays(today, earliest) + 1, 7) : 30;
  }

  const appliedCounts = new Map<string, number>();
  for (const application of applications) {
    if (!application.dateApplied) continue;
    const key = application.dateApplied.slice(0, 10);
    appliedCounts.set(key, (appliedCounts.get(key) ?? 0) + 1);
  }

  const interviewCounts = new Map<string, number>();
  for (const application of applications) {
    for (const interview of application.interviews) {
      if (!interview.scheduledAt) continue;
      const date = parseDate(interview.scheduledAt);
      if (!date) continue;
      const key = format(date, "yyyy-MM-dd");
      interviewCounts.set(key, (interviewCounts.get(key) ?? 0) + 1);
    }
  }

  // Long windows are bucketed by week so the axis stays readable.
  const bucketByWeek = days > 45;
  const points: ActivityPoint[] = [];

  if (bucketByWeek) {
    const weeks = Math.ceil(days / 7);
    for (let index = weeks - 1; index >= 0; index -= 1) {
      const end = subDays(today, index * 7);
      const start = subDays(end, 6);
      let applied = 0;
      let interviewed = 0;
      for (let offset = 0; offset < 7; offset += 1) {
        const key = format(subDays(end, offset), "yyyy-MM-dd");
        applied += appliedCounts.get(key) ?? 0;
        interviewed += interviewCounts.get(key) ?? 0;
      }
      points.push({
        date: format(start, "yyyy-MM-dd"),
        label: format(start, "MMM d"),
        applications: applied,
        interviews: interviewed,
      });
    }
  } else {
    for (let index = days - 1; index >= 0; index -= 1) {
      const date = subDays(today, index);
      const key = format(date, "yyyy-MM-dd");
      points.push({
        date: key,
        label: format(date, days > 14 ? "MMM d" : "EEE d"),
        applications: appliedCounts.get(key) ?? 0,
        interviews: interviewCounts.get(key) ?? 0,
      });
    }
  }

  return points;
}

/* -------------------------------------------------------------------------- */
/*  Conversion funnel                                                         */
/* -------------------------------------------------------------------------- */

export interface FunnelStep {
  label: string;
  count: number;
  /** Percentage of the previous step that converted into this one. */
  fromPrevious: number;
  /** Percentage of all applications that reached this step. */
  fromStart: number;
}

export interface Funnel {
  steps: FunnelStep[];
  /** Applications that genuinely sat an assessment, as opposed to skipping it. */
  actualAssessments: number;
}

/**
 * A conversion funnel only means anything if each stage is a subset of the one
 * above it, so the steps are cumulative: "reached this stage or went further".
 * That matters because recruiting processes are not uniform — some go straight
 * from application to interview with no assessment — and without nesting the
 * adjacent percentages compare unrelated sets of applications.
 *
 * `actualAssessments` is reported alongside so the cumulative assessment count
 * cannot be misread as the number of assessments actually taken.
 */
export function conversionFunnel(applications: ApplicationWithRelations[]): Funnel {
  const flags = applications.map(stageFlags);

  const offer = flags.filter((f) => f.offer).length;
  const finalRound = flags.filter((f) => f.finalRound || f.offer).length;
  const interview = flags.filter((f) => f.interview || f.finalRound || f.offer).length;
  const assessment = flags.filter(
    (f) => f.assessment || f.interview || f.finalRound || f.offer,
  ).length;
  const applied = flags.filter((f) => f.applied).length;

  const counts = [
    { label: "Applications", count: applied },
    { label: "Assessments", count: assessment },
    { label: "Interviews", count: interview },
    { label: "Final rounds", count: finalRound },
    { label: "Offers", count: offer },
  ];

  return {
    steps: counts.map((step, index) => ({
      ...step,
      fromPrevious: index === 0 ? 100 : percentage(step.count, counts[index - 1].count),
      fromStart: percentage(step.count, applied),
    })),
    actualAssessments: flags.filter((f) => f.assessment).length,
  };
}

/* -------------------------------------------------------------------------- */
/*  Breakdowns                                                                */
/* -------------------------------------------------------------------------- */

export interface BreakdownRow {
  key: string;
  applications: number;
  responses: number;
  interviews: number;
  offers: number;
  responseRate: number;
  interviewRate: number;
  offerRate: number;
}

/** Groups applications by an arbitrary dimension and computes conversion rates. */
export function breakdownBy(
  applications: ApplicationWithRelations[],
  accessor: (application: ApplicationWithRelations) => string | null,
  options: { fallback?: string; onlySubmitted?: boolean } = {},
): BreakdownRow[] {
  const { fallback = "Not set", onlySubmitted = true } = options;
  const groups = new Map<string, ApplicationWithRelations[]>();

  for (const application of applications) {
    const flags = stageFlags(application);
    if (onlySubmitted && !flags.applied) continue;
    const key = accessor(application) ?? fallback;
    const list = groups.get(key);
    if (list) list.push(application);
    else groups.set(key, [application]);
  }

  return Array.from(groups.entries())
    .map(([key, items]) => {
      const flags = items.map(stageFlags);
      const responses = flags.filter((f) => f.responded).length;
      const interviews = flags.filter((f) => f.interview).length;
      const offers = flags.filter((f) => f.offer).length;
      return {
        key,
        applications: items.length,
        responses,
        interviews,
        offers,
        responseRate: percentage(responses, items.length),
        interviewRate: percentage(interviews, items.length),
        offerRate: percentage(offers, items.length),
      };
    })
    .sort((a, b) => b.applications - a.applications || a.key.localeCompare(b.key));
}

/* -------------------------------------------------------------------------- */
/*  Response times                                                            */
/* -------------------------------------------------------------------------- */

export interface ResponseTimes {
  toFirstResponse: number | null;
  toInterview: number | null;
  toDecision: number | null;
  sampleSizes: { firstResponse: number; interview: number; decision: number };
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

export function responseTimes(applications: ApplicationWithRelations[]): ResponseTimes {
  const toFirstResponse: number[] = [];
  const toInterview: number[] = [];
  const toDecision: number[] = [];

  for (const application of applications) {
    const applied = parseDate(application.dateApplied);
    if (!applied) continue;

    const first = parseDate(application.firstResponseDate);
    if (first) {
      const delta = differenceInCalendarDays(first, applied);
      if (delta >= 0) toFirstResponse.push(delta);
    }

    const firstInterview = application.interviews
      .map((interview) => parseDate(interview.scheduledAt))
      .filter((date): date is Date => date !== null)
      .sort((a, b) => a.getTime() - b.getTime())[0];
    if (firstInterview) {
      const delta = differenceInCalendarDays(firstInterview, applied);
      if (delta >= 0) toInterview.push(delta);
    }

    if (CLOSED_STATUSES.has(application.status) || application.status === "Offer") {
      const decisionEvent = application.timeline
        .filter((event) => event.kind === "Offer" || event.kind === "Rejection")
        .map((event) => parseDate(event.occurredAt))
        .filter((date): date is Date => date !== null)
        .sort((a, b) => b.getTime() - a.getTime())[0];
      const decisionDate = decisionEvent ?? parseDate(application.updatedAt);
      if (decisionDate) {
        const delta = differenceInCalendarDays(decisionDate, applied);
        if (delta >= 0) toDecision.push(delta);
      }
    }
  }

  return {
    toFirstResponse: average(toFirstResponse),
    toInterview: average(toInterview),
    toDecision: average(toDecision),
    sampleSizes: {
      firstResponse: toFirstResponse.length,
      interview: toInterview.length,
      decision: toDecision.length,
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  Volume cadence                                                            */
/* -------------------------------------------------------------------------- */

export interface VolumeStats {
  perWeek: { key: string; label: string; count: number }[];
  perMonth: { key: string; label: string; count: number }[];
  averagePerWeek: number;
  activeWeeks: number;
}

export function volumeStats(applications: ApplicationWithRelations[]): VolumeStats {
  const weekCounts = new Map<string, number>();
  const monthCounts = new Map<string, number>();

  for (const application of applications) {
    const week = isoWeekKey(application.dateApplied);
    if (week) weekCounts.set(week, (weekCounts.get(week) ?? 0) + 1);
    const month = monthKey(application.dateApplied);
    if (month) monthCounts.set(month, (monthCounts.get(month) ?? 0) + 1);
  }

  const perWeek = Array.from(weekCounts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => ({ key, label: key.replace("-W", " · W"), count }));

  const perMonth = Array.from(monthCounts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => ({
      key,
      label: format(new Date(`${key}-01T00:00:00`), "MMM yyyy"),
      count,
    }));

  const totalApplied = perWeek.reduce((sum, week) => sum + week.count, 0);
  const activeWeeks = perWeek.length;

  return {
    perWeek,
    perMonth,
    averagePerWeek: activeWeeks === 0 ? 0 : Math.round((totalApplied / activeWeeks) * 10) / 10,
    activeWeeks,
  };
}

/* -------------------------------------------------------------------------- */
/*  Staleness                                                                 */
/* -------------------------------------------------------------------------- */

/** Days since the application was submitted, used by the follow-up engine. */
export function daysWaiting(application: ApplicationWithRelations): number | null {
  return daysSince(application.dateApplied);
}
