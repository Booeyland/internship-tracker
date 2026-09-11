import "server-only";

import { randomUUID } from "node:crypto";
import { format, subDays } from "date-fns";

import { getDb, getMeta, insert, setMeta, transaction } from "@/lib/db/client";
import {
  APPLICATION_CONTACTS,
  APPLICATION_DOCUMENTS,
  APPLICATIONS,
  COMPANIES,
  CONTACTS,
  INTERVIEWS,
  RECRUITING_EVENTS,
  RESUME_VERSIONS,
  TASKS,
  TIMELINE_EVENTS,
} from "@/lib/db/tables";
import type {
  Application,
  ApplicationDocument,
  ApplicationSource,
  ApplicationStatus,
  Company,
  Contact,
  DocumentType,
  Industry,
  InternshipType,
  Interview,
  InterviewOutcome,
  InterviewType,
  Priority,
  RecruitingEvent,
  RelationshipType,
  ResumeVersion,
  Task,
  TaskType,
  TimelineEvent,
  TimelineEventKind,
  WorkType,
} from "@/types";

/* -------------------------------------------------------------------------- */
/*  Date helpers — everything is relative to "today" so the demo never ages    */
/* -------------------------------------------------------------------------- */

const now = () => new Date();
const dayAgo = (days: number) => format(subDays(now(), days), "yyyy-MM-dd");
const dayAhead = (days: number) => dayAgo(-days);
/** An ISO instant N days from now (negative = past) at the given local time. */
const instant = (daysFromNow: number, time = "10:00") =>
  new Date(`${dayAhead(daysFromNow)}T${time}:00`).toISOString();
const stamp = (days: number) => new Date(`${dayAgo(days)}T12:00:00`).toISOString();

/* -------------------------------------------------------------------------- */
/*  Seed definitions                                                          */
/* -------------------------------------------------------------------------- */

interface CompanySeed {
  key: string;
  name: string;
  industry: Industry;
  website: string;
  careersUrl: string;
  headquarters: string;
  notes: string | null;
}

const COMPANY_SEEDS: CompanySeed[] = [
  {
    key: "gs",
    name: "Goldman Sachs",
    industry: "Investment Banking",
    website: "goldmansachs.com",
    careersUrl: "https://www.goldmansachs.com/careers",
    headquarters: "New York, NY",
    notes: "Applications open early. HireVue goes out within a week of submitting.",
  },
  {
    key: "jpm",
    name: "JPMorgan Chase",
    industry: "Corporate Finance",
    website: "jpmorganchase.com",
    careersUrl: "https://careers.jpmorgan.com",
    headquarters: "New York, NY",
    notes: "Two-stage process: video interview, then a virtual superday.",
  },
  {
    key: "evr",
    name: "Evercore",
    industry: "Investment Banking",
    website: "evercore.com",
    careersUrl: "https://www.evercore.com/careers",
    headquarters: "New York, NY",
    notes: "Heavily networking-driven. Coffee chats matter more than the portal.",
  },
  {
    key: "bx",
    name: "Blackstone",
    industry: "Private Equity",
    website: "blackstone.com",
    careersUrl: "https://www.blackstone.com/careers",
    headquarters: "New York, NY",
    notes: "Very competitive. Technical bar is high on LBO mechanics.",
  },
  {
    key: "jef",
    name: "Jefferies",
    industry: "Investment Banking",
    website: "jefferies.com",
    careersUrl: "https://www.jefferies.com/careers",
    headquarters: "New York, NY",
    notes: null,
  },
  {
    key: "bac",
    name: "Bank of America",
    industry: "Sales & Trading",
    website: "bankofamerica.com",
    careersUrl: "https://campus.bankofamerica.com",
    headquarters: "Charlotte, NC",
    notes: "Global Markets runs a separate process from IB.",
  },
  {
    key: "apo",
    name: "Apollo Global Management",
    industry: "Private Equity",
    website: "apollo.com",
    careersUrl: "https://www.apollo.com/careers",
    headquarters: "New York, NY",
    notes: null,
  },
  {
    key: "dtt",
    name: "Deloitte",
    industry: "Consulting",
    website: "deloitte.com",
    careersUrl: "https://www2.deloitte.com/careers",
    headquarters: "New York, NY",
    notes: "Strategy & Analytics group recruits on a rolling basis.",
  },
  {
    key: "ms",
    name: "Morgan Stanley",
    industry: "Investment Banking",
    website: "morganstanley.com",
    careersUrl: "https://www.morganstanley.com/careers",
    headquarters: "New York, NY",
    notes: "Met two bankers at the fall career fair — follow up before Thanksgiving.",
  },
  {
    key: "blk",
    name: "BlackRock",
    industry: "Asset Management",
    website: "blackrock.com",
    careersUrl: "https://careers.blackrock.com",
    headquarters: "New York, NY",
    notes: null,
  },
  {
    key: "lzd",
    name: "Lazard",
    industry: "Investment Banking",
    website: "lazard.com",
    careersUrl: "https://www.lazard.com/careers",
    headquarters: "New York, NY",
    notes: null,
  },
  {
    key: "stripe",
    name: "Stripe",
    industry: "FinTech",
    website: "stripe.com",
    careersUrl: "https://stripe.com/jobs",
    headquarters: "San Francisco, CA",
    notes: "Strategy & Finance internship — case-heavy interview loop.",
  },
];

interface InterviewSeed {
  interviewType: InterviewType;
  daysFromNow: number;
  time?: string;
  interviewerName?: string;
  interviewerTitle?: string;
  interviewerLinkedin?: string;
  meetingLink?: string;
  location?: string;
  notes?: string;
  outcome?: InterviewOutcome;
  durationMinutes?: number;
}

interface TaskSeed {
  title: string;
  taskType: TaskType;
  dueInDays: number;
  priority: Priority;
  completed?: boolean;
  notes?: string;
}

interface TimelineSeed {
  kind: TimelineEventKind;
  title: string;
  daysAgo: number;
  description?: string;
}

interface ContactSeed {
  name: string;
  jobTitle: string;
  email?: string;
  linkedinUrl?: string;
  relationship: RelationshipType;
  lastContactDaysAgo?: number;
  nextFollowUpInDays?: number;
  notes?: string;
}

interface ApplicationSeed {
  company: string;
  position: string;
  internshipType: InternshipType;
  industry: Industry;
  location: string;
  workType: WorkType;
  status: ApplicationStatus;
  appliedDaysAgo: number | null;
  source: ApplicationSource;
  isReferral?: boolean;
  resume: string;
  compensation?: string;
  deadlineInDays?: number;
  jobId?: string;
  jobPostingUrl?: string;
  jobDescription?: string;
  coverLetter?: boolean;
  transcript?: boolean;
  recruiterName?: string;
  recruiterEmail?: string;
  recruiterLinkedin?: string;
  referralName?: string;
  connectionNotes?: string;
  nextAction?: string;
  firstResponseDaysAgo?: number;
  notes?: string;
  interviews?: InterviewSeed[];
  tasks?: TaskSeed[];
  timeline?: TimelineSeed[];
  contacts?: ContactSeed[];
  documents?: { documentType: DocumentType; name: string; submitted: boolean }[];
}

const RESUME_SEEDS: { name: string; description: string; isDefault: boolean }[] = [
  {
    name: "Investment Banking Resume",
    description: "Deal-focused: M&A modelling coursework, valuation club, banking internship.",
    isDefault: true,
  },
  {
    name: "Private Equity Resume",
    description: "Leads with LBO modelling and the PE case competition win.",
    isDefault: false,
  },
  {
    name: "Corporate Finance Resume",
    description: "FP&A internship and treasury coursework up top.",
    isDefault: false,
  },
  {
    name: "General Finance Resume",
    description: "Broad version used for career fairs and networking.",
    isDefault: false,
  },
];

const APPLICATION_SEEDS: ApplicationSeed[] = [
  {
    company: "Goldman Sachs",
    position: "2027 Summer Analyst — Investment Banking",
    internshipType: "Summer Analyst",
    industry: "Investment Banking",
    location: "New York, NY",
    workType: "In-Person",
    status: "Superday / Final Round",
    appliedDaysAgo: 38,
    firstResponseDaysAgo: 31,
    source: "Company Website",
    resume: "Investment Banking Resume",
    compensation: "$110,000 annualized + housing stipend",
    jobId: "GS-2027-IBD-1841",
    jobPostingUrl: "https://www.goldmansachs.com/careers/students/programs/americas/summer-analyst.html",
    jobDescription:
      "Ten-week summer analyst program in the Investment Banking Division. Analysts support live M&A and capital markets transactions, build valuation models and prepare client materials.",
    coverLetter: true,
    transcript: true,
    recruiterName: "Priya Raman",
    recruiterEmail: "priya.raman@example.com",
    recruiterLinkedin: "https://www.linkedin.com/in/example-priya-raman",
    nextAction: "Prep for superday — 3 back-to-back interviews",
    notes:
      "Superday is three 30-minute interviews. Expect one technical (DCF + accounting), one behavioural and one with an MD. Review the Q2 healthcare deal they ran.",
    interviews: [
      {
        interviewType: "HireVue",
        daysFromNow: -30,
        interviewerName: "Automated",
        notes: "Four behavioural questions, 90 seconds each. Recorded in one take.",
        outcome: "Advanced",
        durationMinutes: 30,
      },
      {
        interviewType: "First Round",
        daysFromNow: -18,
        time: "14:00",
        interviewerName: "Daniel Okafor",
        interviewerTitle: "Associate, Healthcare IBD",
        interviewerLinkedin: "https://www.linkedin.com/in/example-daniel-okafor",
        meetingLink: "https://zoom.us/j/example-first-round",
        notes: "Walk me through a DCF, why banking, why Goldman. Asked about the retail deal on my resume.",
        outcome: "Advanced",
        durationMinutes: 45,
      },
      {
        interviewType: "Superday",
        daysFromNow: 4,
        time: "09:00",
        interviewerName: "Multiple interviewers",
        interviewerTitle: "VP / MD panel",
        meetingLink: "https://zoom.us/j/example-superday",
        location: "200 West Street, New York",
        notes: "Three rounds back to back. Bring printed copies of the resume.",
        outcome: "Pending",
        durationMinutes: 120,
      },
    ],
    tasks: [
      {
        title: "Review DCF and LBO technicals",
        taskType: "Prepare for Interview",
        dueInDays: 2,
        priority: "High",
        notes: "Focus on WACC build and unlevered FCF bridge.",
      },
      {
        title: "Send thank-you note to Daniel Okafor",
        taskType: "Thank You Note",
        dueInDays: -16,
        priority: "Medium",
        completed: true,
      },
      {
        title: "Research recent Goldman healthcare transactions",
        taskType: "Research",
        dueInDays: 3,
        priority: "Medium",
      },
    ],
    timeline: [
      { kind: "Applied", title: "Applied through the campus portal", daysAgo: 38 },
      { kind: "Assessment", title: "HireVue invitation received", daysAgo: 31 },
      { kind: "Assessment", title: "HireVue completed", daysAgo: 30 },
      { kind: "Interview", title: "First round invitation", daysAgo: 22 },
      {
        kind: "Interview",
        title: "First round interview",
        daysAgo: 18,
        description: "45 minutes with Daniel Okafor. Technical + behavioural.",
      },
      { kind: "Communication", title: "Superday invitation received", daysAgo: 6 },
    ],
    contacts: [
      {
        name: "Priya Raman",
        jobTitle: "Campus Recruiting Lead",
        email: "priya.raman@example.com",
        relationship: "Recruiter",
        lastContactDaysAgo: 6,
        nextFollowUpInDays: 6,
        notes: "Very responsive over email. Handles all scheduling for IBD superdays.",
      },
      {
        name: "Daniel Okafor",
        jobTitle: "Associate, Healthcare IBD",
        linkedinUrl: "https://www.linkedin.com/in/example-daniel-okafor",
        relationship: "Interviewer",
        lastContactDaysAgo: 18,
        notes: "Went to the same school. Offered to answer questions before the superday.",
      },
    ],
    documents: [
      { documentType: "Resume", name: "Investment Banking Resume v4", submitted: true },
      { documentType: "Cover Letter", name: "GS IBD cover letter", submitted: true },
      { documentType: "Transcript", name: "Unofficial transcript — Fall 2026", submitted: true },
    ],
  },
  {
    company: "JPMorgan Chase",
    position: "2027 Summer Analyst — Corporate Banking",
    internshipType: "Summer Analyst",
    industry: "Corporate Finance",
    location: "New York, NY",
    workType: "Hybrid",
    status: "First Round",
    appliedDaysAgo: 26,
    firstResponseDaysAgo: 19,
    source: "LinkedIn",
    resume: "Corporate Finance Resume",
    compensation: "$95,000 annualized",
    jobId: "JPMC-CB-2027-4402",
    jobPostingUrl: "https://careers.jpmorgan.com/us/en/students/programs/corporate-banking-summer-analyst",
    coverLetter: false,
    transcript: true,
    recruiterName: "Marcus Webb",
    recruiterEmail: "marcus.webb@example.com",
    nextAction: "First round interview on Thursday",
    notes: "Corporate banking focuses on credit analysis rather than M&A. Review the credit memo format.",
    interviews: [
      {
        interviewType: "Phone Screen",
        daysFromNow: -12,
        interviewerName: "Marcus Webb",
        interviewerTitle: "Campus Recruiter",
        notes: "Resume walkthrough, availability, visa status. Very short.",
        outcome: "Advanced",
        durationMinutes: 20,
      },
      {
        interviewType: "First Round",
        daysFromNow: 2,
        time: "11:30",
        interviewerName: "Sofia Delgado",
        interviewerTitle: "VP, Corporate Banking",
        meetingLink: "https://teams.microsoft.com/l/meetup-join/example",
        outcome: "Pending",
        durationMinutes: 45,
      },
    ],
    tasks: [
      {
        title: "Review credit analysis fundamentals",
        taskType: "Prepare for Interview",
        dueInDays: 1,
        priority: "High",
        notes: "Leverage ratios, covenant structures, the five Cs of credit.",
      },
    ],
    timeline: [
      { kind: "Applied", title: "Applied via LinkedIn Easy Apply", daysAgo: 26 },
      { kind: "Communication", title: "Recruiter reached out", daysAgo: 19 },
      { kind: "Interview", title: "Phone screen with recruiter", daysAgo: 12 },
      { kind: "Interview", title: "First round scheduled", daysAgo: 4 },
    ],
    contacts: [
      {
        name: "Marcus Webb",
        jobTitle: "Campus Recruiter",
        email: "marcus.webb@example.com",
        relationship: "Recruiter",
        lastContactDaysAgo: 4,
        nextFollowUpInDays: 3,
      },
    ],
    documents: [
      { documentType: "Resume", name: "Corporate Finance Resume v2", submitted: true },
      { documentType: "Transcript", name: "Unofficial transcript — Fall 2026", submitted: true },
    ],
  },
  {
    company: "Evercore",
    position: "2027 Summer Analyst — Investment Banking",
    internshipType: "Summer Analyst",
    industry: "Investment Banking",
    location: "New York, NY",
    workType: "In-Person",
    status: "Second Round",
    appliedDaysAgo: 33,
    firstResponseDaysAgo: 27,
    source: "Referral",
    isReferral: true,
    referralName: "Alexis Chen",
    connectionNotes:
      "Alexis is an alum two years ahead — she passed my resume to the staffer directly and told me to mention her name.",
    resume: "Investment Banking Resume",
    compensation: "$115,000 annualized",
    nextAction: "Second round next week — expect a live modelling test",
    notes:
      "Evercore is notoriously technical. They asked about accretion/dilution in round one. Expect deeper M&A mechanics next.",
    coverLetter: true,
    transcript: true,
    interviews: [
      {
        interviewType: "First Round",
        daysFromNow: -14,
        interviewerName: "Thomas Reid",
        interviewerTitle: "Analyst, M&A",
        notes: "Accretion/dilution walkthrough. Asked what happens to the three statements when D&A increases by 10.",
        outcome: "Advanced",
        durationMinutes: 45,
      },
      {
        interviewType: "Second Round",
        daysFromNow: 6,
        time: "15:00",
        interviewerName: "Jessica Park",
        interviewerTitle: "VP, M&A",
        meetingLink: "https://zoom.us/j/example-evercore-r2",
        outcome: "Pending",
        durationMinutes: 60,
      },
    ],
    tasks: [
      {
        title: "Practice accretion/dilution and merger model",
        taskType: "Prepare for Interview",
        dueInDays: 4,
        priority: "High",
      },
      {
        title: "Thank Alexis for the referral",
        taskType: "Networking",
        dueInDays: -20,
        priority: "Low",
        completed: true,
      },
    ],
    timeline: [
      { kind: "Note", title: "Alexis Chen offered to refer me", daysAgo: 36 },
      { kind: "Applied", title: "Applied with referral", daysAgo: 33 },
      { kind: "Communication", title: "Recruiter confirmed referral received", daysAgo: 27 },
      { kind: "Interview", title: "First round interview", daysAgo: 14 },
      { kind: "Interview", title: "Advanced to second round", daysAgo: 8 },
    ],
    contacts: [
      {
        name: "Alexis Chen",
        jobTitle: "Analyst, M&A",
        linkedinUrl: "https://www.linkedin.com/in/example-alexis-chen",
        relationship: "Alumni",
        lastContactDaysAgo: 20,
        nextFollowUpInDays: 8,
        notes: "Referred me. Wants an update after the second round.",
      },
    ],
    documents: [
      { documentType: "Resume", name: "Investment Banking Resume v4", submitted: true },
      { documentType: "Cover Letter", name: "Evercore cover letter", submitted: true },
    ],
  },
  {
    company: "Blackstone",
    position: "2027 Summer Analyst — Private Equity",
    internshipType: "Summer Analyst",
    industry: "Private Equity",
    location: "New York, NY",
    workType: "In-Person",
    status: "Online Assessment",
    appliedDaysAgo: 16,
    firstResponseDaysAgo: 9,
    source: "Handshake",
    resume: "Private Equity Resume",
    compensation: "$120,000 annualized",
    deadlineInDays: -16,
    nextAction: "Complete the online assessment before it expires",
    notes: "Assessment is 60 minutes: numerical reasoning plus a short LBO case. Expires 7 days after the invite.",
    coverLetter: true,
    transcript: true,
    recruiterName: "Hannah Liu",
    recruiterEmail: "hannah.liu@example.com",
    tasks: [
      {
        title: "Complete Blackstone online assessment",
        taskType: "Complete Assessment",
        dueInDays: 2,
        priority: "High",
        notes: "60 minutes, timed. Do it on a laptop with a stable connection.",
      },
      {
        title: "Review LBO mechanics and returns math",
        taskType: "Prepare for Interview",
        dueInDays: 1,
        priority: "High",
      },
    ],
    timeline: [
      { kind: "Applied", title: "Applied through Handshake", daysAgo: 16 },
      { kind: "Assessment", title: "Online assessment invitation received", daysAgo: 9 },
    ],
    contacts: [
      {
        name: "Hannah Liu",
        jobTitle: "Analyst Recruiting",
        email: "hannah.liu@example.com",
        relationship: "Recruiter",
        lastContactDaysAgo: 9,
      },
    ],
    documents: [
      { documentType: "Resume", name: "Private Equity Resume v3", submitted: true },
      { documentType: "Cover Letter", name: "Blackstone cover letter", submitted: true },
    ],
  },
  {
    company: "Jefferies",
    position: "2027 Summer Analyst — Investment Banking",
    internshipType: "Summer Analyst",
    industry: "Investment Banking",
    location: "New York, NY",
    workType: "In-Person",
    status: "Applied",
    appliedDaysAgo: 11,
    source: "Company Website",
    resume: "Investment Banking Resume",
    compensation: "$110,000 annualized",
    nextAction: "Follow up with campus recruiting",
    notes: "Applied the day the posting opened. No acknowledgement email yet beyond the auto-reply.",
    coverLetter: true,
    transcript: false,
    timeline: [{ kind: "Applied", title: "Applied through the careers site", daysAgo: 11 }],
    documents: [{ documentType: "Resume", name: "Investment Banking Resume v4", submitted: true }],
  },
  {
    company: "Bank of America",
    position: "2027 Summer Analyst — Global Markets",
    internshipType: "Summer Analyst",
    industry: "Sales & Trading",
    location: "New York, NY",
    workType: "In-Person",
    status: "HireVue",
    appliedDaysAgo: 21,
    firstResponseDaysAgo: 14,
    source: "Career Fair",
    resume: "General Finance Resume",
    compensation: "$105,000 annualized",
    nextAction: "Record HireVue before Friday",
    notes:
      "Met the Global Markets team at the fall career fair. HireVue covers markets knowledge — be ready to pitch a stock.",
    coverLetter: false,
    transcript: true,
    recruiterName: "Olivia Grant",
    recruiterEmail: "olivia.grant@example.com",
    tasks: [
      {
        title: "Record Bank of America HireVue",
        taskType: "Complete Assessment",
        dueInDays: 3,
        priority: "High",
        notes: "Prepare a two-minute stock pitch and a markets view.",
      },
    ],
    timeline: [
      { kind: "Note", title: "Met the team at the fall career fair", daysAgo: 26 },
      { kind: "Applied", title: "Applied after the career fair", daysAgo: 21 },
      { kind: "Assessment", title: "HireVue invitation received", daysAgo: 14 },
    ],
    contacts: [
      {
        name: "Olivia Grant",
        jobTitle: "Global Markets Campus Recruiting",
        email: "olivia.grant@example.com",
        relationship: "Recruiter",
        lastContactDaysAgo: 14,
      },
    ],
    documents: [{ documentType: "Resume", name: "General Finance Resume v1", submitted: true }],
  },
  {
    company: "Apollo Global Management",
    position: "2027 Summer Analyst — Private Equity",
    internshipType: "Summer Analyst",
    industry: "Private Equity",
    location: "New York, NY",
    workType: "In-Person",
    status: "Rejected",
    appliedDaysAgo: 52,
    firstResponseDaysAgo: 34,
    source: "LinkedIn",
    resume: "General Finance Resume",
    notes:
      "Rejected after the first round. Feedback was that they wanted more modelling experience — switched to the PE-specific resume after this.",
    coverLetter: false,
    transcript: false,
    interviews: [
      {
        interviewType: "First Round",
        daysFromNow: -38,
        interviewerName: "Ryan Mitchell",
        interviewerTitle: "Associate",
        notes: "Heavy LBO focus. Struggled on the debt paydown schedule question.",
        outcome: "Rejected",
        durationMinutes: 45,
      },
    ],
    timeline: [
      { kind: "Applied", title: "Applied via LinkedIn", daysAgo: 52 },
      { kind: "Interview", title: "First round interview", daysAgo: 38 },
      {
        kind: "Rejection",
        title: "Rejected",
        daysAgo: 34,
        description: "Email said they moved forward with other candidates.",
      },
    ],
    documents: [{ documentType: "Resume", name: "General Finance Resume v1", submitted: true }],
  },
  {
    company: "Deloitte",
    position: "2027 Strategy Analyst Intern",
    internshipType: "Summer Analyst",
    industry: "Consulting",
    location: "Chicago, IL",
    workType: "Hybrid",
    status: "Offer",
    appliedDaysAgo: 61,
    firstResponseDaysAgo: 52,
    source: "Networking",
    resume: "General Finance Resume",
    compensation: "$8,500/month",
    nextAction: "Respond to the offer by the deadline",
    deadlineInDays: 9,
    notes:
      "Offer came through after the case round. Deadline to accept is in nine days — useful leverage if Goldman moves quickly.",
    coverLetter: true,
    transcript: true,
    recruiterName: "Nathan Brooks",
    recruiterEmail: "nathan.brooks@example.com",
    interviews: [
      {
        interviewType: "Case Study",
        daysFromNow: -30,
        interviewerName: "Amara Diallo",
        interviewerTitle: "Senior Consultant",
        notes: "Market entry case for a regional grocery chain. Went well — structure held up.",
        outcome: "Advanced",
        durationMinutes: 45,
      },
      {
        interviewType: "Final Round",
        daysFromNow: -18,
        interviewerName: "Greg Salazar",
        interviewerTitle: "Manager",
        notes: "Second case plus fit. Asked why consulting over banking.",
        outcome: "Advanced",
        durationMinutes: 60,
      },
    ],
    tasks: [
      {
        title: "Decide on the Deloitte offer",
        taskType: "Other",
        dueInDays: 8,
        priority: "High",
        notes: "Compare against the Goldman superday outcome before responding.",
      },
    ],
    timeline: [
      { kind: "Note", title: "Coffee chat with a Deloitte consultant", daysAgo: 68 },
      { kind: "Applied", title: "Applied with an internal referral", daysAgo: 61 },
      { kind: "Interview", title: "Case interview", daysAgo: 30 },
      { kind: "Interview", title: "Final round", daysAgo: 18 },
      { kind: "Offer", title: "Offer received", daysAgo: 12, description: "$8,500/month, Chicago office." },
    ],
    contacts: [
      {
        name: "Nathan Brooks",
        jobTitle: "Campus Recruiting Manager",
        email: "nathan.brooks@example.com",
        relationship: "Recruiter",
        lastContactDaysAgo: 12,
        nextFollowUpInDays: 7,
      },
    ],
    documents: [
      { documentType: "Resume", name: "General Finance Resume v1", submitted: true },
      { documentType: "Cover Letter", name: "Deloitte cover letter", submitted: true },
    ],
  },
  {
    company: "Morgan Stanley",
    position: "2027 Summer Analyst — Investment Banking",
    internshipType: "Summer Analyst",
    industry: "Investment Banking",
    location: "New York, NY",
    workType: "In-Person",
    status: "Applied",
    appliedDaysAgo: 14,
    source: "Career Fair",
    resume: "Investment Banking Resume",
    compensation: "$110,000 annualized",
    nextAction: "Follow up with the banker I met at the career fair",
    notes:
      "Spoke with two bankers at the fall fair. Both said to email them after applying — have not done that yet.",
    coverLetter: true,
    transcript: true,
    timeline: [
      { kind: "Note", title: "Career fair conversation", daysAgo: 19 },
      { kind: "Applied", title: "Applied through the campus portal", daysAgo: 14 },
    ],
    contacts: [
      {
        name: "Elena Vasquez",
        jobTitle: "Associate, Technology IBD",
        linkedinUrl: "https://www.linkedin.com/in/example-elena-vasquez",
        relationship: "Employee",
        lastContactDaysAgo: 19,
        nextFollowUpInDays: -2,
        notes: "Met at the career fair. Said to email her once the application was in.",
      },
    ],
    documents: [{ documentType: "Resume", name: "Investment Banking Resume v4", submitted: true }],
  },
  {
    company: "BlackRock",
    position: "2027 Summer Analyst — Asset Management",
    internshipType: "Summer Analyst",
    industry: "Asset Management",
    location: "New York, NY",
    workType: "Hybrid",
    status: "Ghosted",
    appliedDaysAgo: 74,
    source: "Indeed",
    resume: "General Finance Resume",
    notes: "Never heard anything back. Marking as ghosted after ten weeks.",
    coverLetter: false,
    transcript: false,
    timeline: [{ kind: "Applied", title: "Applied via Indeed", daysAgo: 74 }],
  },
  {
    company: "Lazard",
    position: "2027 Summer Analyst — Restructuring",
    internshipType: "Summer Analyst",
    industry: "Investment Banking",
    location: "New York, NY",
    workType: "In-Person",
    status: "Saved",
    appliedDaysAgo: null,
    source: "Company Website",
    resume: "Investment Banking Resume",
    deadlineInDays: 5,
    nextAction: "Submit before the deadline",
    notes: "Restructuring group. Need to tailor the resume to highlight the distressed debt coursework.",
    tasks: [
      {
        title: "Submit Lazard restructuring application",
        taskType: "Submit Application",
        dueInDays: 4,
        priority: "High",
      },
    ],
  },
  {
    company: "Stripe",
    position: "2027 Strategy & Finance Intern",
    internshipType: "Summer Analyst",
    industry: "FinTech",
    location: "San Francisco, CA",
    workType: "Remote",
    status: "Interested",
    appliedDaysAgo: null,
    source: "LinkedIn",
    resume: "Corporate Finance Resume",
    deadlineInDays: 21,
    nextAction: "Decide whether to apply",
    notes: "Interesting alternative to banking. Loop is case-heavy and the comp is competitive.",
  },
  {
    company: "Goldman Sachs",
    position: "2027 Summer Analyst — Asset Management",
    internshipType: "Summer Analyst",
    industry: "Asset Management",
    location: "New York, NY",
    workType: "In-Person",
    status: "Applied",
    appliedDaysAgo: 9,
    source: "Company Website",
    resume: "General Finance Resume",
    compensation: "$100,000 annualized",
    nextAction: "Follow up if nothing by next week",
    notes: "Second Goldman application — GSAM runs a separate process from IBD.",
    coverLetter: false,
    transcript: true,
    timeline: [{ kind: "Applied", title: "Applied through the campus portal", daysAgo: 9 }],
  },
  {
    company: "Goldman Sachs",
    position: "2027 Summer Analyst — Wealth Management",
    internshipType: "Summer Analyst",
    industry: "Asset Management",
    location: "Dallas, TX",
    workType: "In-Person",
    status: "Withdrawn",
    appliedDaysAgo: 44,
    source: "Company Website",
    resume: "General Finance Resume",
    notes: "Withdrew — the Dallas location was not workable and IBD is the priority.",
    timeline: [
      { kind: "Applied", title: "Applied through the campus portal", daysAgo: 44 },
      { kind: "Status Change", title: "Withdrew the application", daysAgo: 29 },
    ],
  },
  {
    company: "JPMorgan Chase",
    position: "2027 Summer Analyst — Markets Quantitative Research",
    internshipType: "Summer Analyst",
    industry: "Technology",
    location: "New York, NY",
    workType: "Hybrid",
    status: "Applied",
    appliedDaysAgo: 6,
    source: "Handshake",
    resume: "General Finance Resume",
    nextAction: "Expect an assessment invite within two weeks",
    notes: "Quant-leaning role. Python screen likely.",
    timeline: [{ kind: "Applied", title: "Applied through Handshake", daysAgo: 6 }],
  },
  {
    company: "Jefferies",
    position: "2027 Summer Analyst — Leveraged Finance",
    internshipType: "Summer Analyst",
    industry: "Investment Banking",
    location: "New York, NY",
    workType: "In-Person",
    status: "Applied",
    appliedDaysAgo: 3,
    source: "Recruiter Outreach",
    resume: "Investment Banking Resume",
    notes: "A recruiter reached out on LinkedIn about this one.",
    timeline: [{ kind: "Applied", title: "Applied after recruiter outreach", daysAgo: 3 }],
  },
  {
    company: "Evercore",
    position: "2027 Off-Cycle Analyst — Restructuring",
    internshipType: "Off-Cycle",
    industry: "Investment Banking",
    location: "London, UK",
    workType: "In-Person",
    status: "Saved",
    appliedDaysAgo: null,
    source: "Networking",
    resume: "Investment Banking Resume",
    deadlineInDays: 12,
    nextAction: "Check visa requirements before applying",
    notes: "London office. Worth applying as a backup if the summer process does not convert.",
  },
  {
    company: "Deloitte",
    position: "2027 Summer Analyst — M&A Transaction Services",
    internshipType: "Summer Analyst",
    industry: "Accounting",
    location: "New York, NY",
    workType: "Hybrid",
    status: "Applied",
    appliedDaysAgo: 19,
    source: "Networking",
    resume: "Corporate Finance Resume",
    nextAction: "Follow up with Nathan",
    notes: "Different Deloitte group from the strategy offer. Same recruiter handles both.",
    timeline: [{ kind: "Applied", title: "Applied with a referral from Nathan", daysAgo: 19 }],
  },
];

interface StandaloneEventSeed {
  title: string;
  eventType: RecruitingEvent["eventType"];
  daysFromNow: number;
  time?: string;
  location?: string;
  companyKey?: string;
  notes?: string;
}

const EVENT_SEEDS: StandaloneEventSeed[] = [
  {
    title: "Fall Finance Career Fair",
    eventType: "Career Fair",
    daysFromNow: 8,
    time: "11:00",
    location: "Student Union, Grand Hall",
    notes: "Bring 15 printed resumes. Target: Morgan Stanley, Lazard, Jefferies.",
  },
  {
    title: "Morgan Stanley virtual info session",
    eventType: "Info Session",
    daysFromNow: 3,
    time: "18:00",
    companyKey: "ms",
    notes: "Registration link is in the recruiting newsletter.",
  },
  {
    title: "Coffee chat — Lazard restructuring analyst",
    eventType: "Networking Call",
    daysFromNow: 5,
    time: "16:30",
    companyKey: "lzd",
    notes: "Introduced through the finance club mentorship programme.",
  },
  {
    title: "Investment banking mock interview night",
    eventType: "Other",
    daysFromNow: 1,
    time: "19:00",
    location: "Business School, Room 214",
  },
];

const STANDALONE_TASKS: { title: string; taskType: TaskType; dueInDays: number; priority: Priority }[] = [
  { title: "Update the investment banking resume with the fall coursework", taskType: "Other", dueInDays: 5, priority: "Medium" },
  { title: "Reach out to three alumni at target banks", taskType: "Networking", dueInDays: 2, priority: "Medium" },
  { title: "Print resumes for the career fair", taskType: "Other", dueInDays: 7, priority: "Low" },
];

/* -------------------------------------------------------------------------- */
/*  Seeding                                                                   */
/* -------------------------------------------------------------------------- */

const TABLES_IN_DELETE_ORDER = [
  "dismissed_suggestions",
  "application_contacts",
  "application_documents",
  "timeline_events",
  "recruiting_events",
  "tasks",
  "interviews",
  "applications",
  "contacts",
  "companies",
  "resume_versions",
];

/** Marks that the database has been initialised, so it is never auto-seeded again. */
const INITIALISED_KEY = "initialised";

export function clearAll(): void {
  const db = getDb();
  transaction(() => {
    for (const table of TABLES_IN_DELETE_ORDER) db.exec(`DELETE FROM ${table}`);
  });
  // An empty tracker the user asked for must stay empty on the next load.
  setMeta(INITIALISED_KEY, new Date().toISOString());
}

function isEmpty(): boolean {
  const row = getDb().prepare(`SELECT COUNT(*) AS count FROM applications`).get() as
    | { count: number }
    | undefined;
  return !row || Number(row.count) === 0;
}

/**
 * Seeds demo data the first time the app runs, and only then. Emptiness alone
 * is not the signal — a user who cleared their data would have it handed back.
 */
export function ensureSeeded(): void {
  if (getMeta(INITIALISED_KEY) !== null) return;

  // A database with data but no marker predates this flag; adopt it as-is.
  if (!isEmpty()) {
    setMeta(INITIALISED_KEY, new Date().toISOString());
    return;
  }

  seedDemoData();
}

export function seedDemoData(): void {
  setMeta(INITIALISED_KEY, new Date().toISOString());
  transaction(() => {
    const ts = new Date().toISOString();

    /* Resume versions ----------------------------------------------------- */
    const resumeByName = new Map<string, ResumeVersion>();
    for (const seed of RESUME_SEEDS) {
      const resume: ResumeVersion = {
        id: randomUUID(),
        name: seed.name,
        description: seed.description,
        fileUrl: null,
        isDefault: seed.isDefault,
        createdAt: ts,
        updatedAt: ts,
      };
      insert(RESUME_VERSIONS, resume as unknown as Record<string, unknown>);
      resumeByName.set(resume.name, resume);
    }

    /* Companies ----------------------------------------------------------- */
    const companyByName = new Map<string, Company>();
    const companyByKey = new Map<string, Company>();
    for (const seed of COMPANY_SEEDS) {
      const company: Company = {
        id: randomUUID(),
        name: seed.name,
        logoUrl: null,
        industry: seed.industry,
        website: seed.website,
        careersUrl: seed.careersUrl,
        headquarters: seed.headquarters,
        notes: seed.notes,
        createdAt: ts,
        updatedAt: ts,
      };
      insert(COMPANIES, company as unknown as Record<string, unknown>);
      companyByName.set(company.name, company);
      companyByKey.set(seed.key, company);
    }

    /* Applications and their children ------------------------------------- */
    for (const seed of APPLICATION_SEEDS) {
      const company = companyByName.get(seed.company);
      if (!company) continue;
      const resume = resumeByName.get(seed.resume) ?? null;
      const createdAt = seed.appliedDaysAgo !== null ? stamp(seed.appliedDaysAgo) : stamp(5);

      const application: Application = {
        id: randomUUID(),
        companyId: company.id,
        position: seed.position,
        internshipType: seed.internshipType,
        industry: seed.industry,
        location: seed.location,
        workType: seed.workType,
        jobPostingUrl: seed.jobPostingUrl ?? company.careersUrl,
        jobId: seed.jobId ?? null,
        jobDescription: seed.jobDescription ?? null,
        compensation: seed.compensation ?? null,
        deadline: seed.deadlineInDays !== undefined ? dayAhead(seed.deadlineInDays) : null,
        status: seed.status,
        dateApplied: seed.appliedDaysAgo !== null ? dayAgo(seed.appliedDaysAgo) : null,
        source: seed.source,
        isReferral: seed.isReferral ?? false,
        resumeVersionId: resume?.id ?? null,
        coverLetterSubmitted: seed.coverLetter ?? false,
        transcriptSubmitted: seed.transcript ?? false,
        recruiterName: seed.recruiterName ?? null,
        recruiterEmail: seed.recruiterEmail ?? null,
        recruiterLinkedin: seed.recruiterLinkedin ?? null,
        referralName: seed.referralName ?? null,
        connectionNotes: seed.connectionNotes ?? null,
        notes: seed.notes ?? null,
        nextAction: seed.nextAction ?? null,
        firstResponseDate:
          seed.firstResponseDaysAgo !== undefined ? dayAgo(seed.firstResponseDaysAgo) : null,
        createdAt,
        updatedAt: ts,
      };
      insert(APPLICATIONS, application as unknown as Record<string, unknown>);

      for (const seedEvent of seed.timeline ?? []) {
        const event: TimelineEvent = {
          id: randomUUID(),
          applicationId: application.id,
          kind: seedEvent.kind,
          title: seedEvent.title,
          description: seedEvent.description ?? null,
          occurredAt: stamp(seedEvent.daysAgo),
          createdAt: ts,
        };
        insert(TIMELINE_EVENTS, event as unknown as Record<string, unknown>);
      }

      for (const seedInterview of seed.interviews ?? []) {
        const scheduledAt = instant(seedInterview.daysFromNow, seedInterview.time ?? "10:00");
        const interview: Interview = {
          id: randomUUID(),
          applicationId: application.id,
          interviewType: seedInterview.interviewType,
          scheduledAt,
          durationMinutes: seedInterview.durationMinutes ?? 45,
          interviewerName: seedInterview.interviewerName ?? null,
          interviewerTitle: seedInterview.interviewerTitle ?? null,
          interviewerLinkedin: seedInterview.interviewerLinkedin ?? null,
          meetingLink: seedInterview.meetingLink ?? null,
          location: seedInterview.location ?? null,
          notes: seedInterview.notes ?? null,
          outcome: seedInterview.outcome ?? "Pending",
          createdAt: ts,
          updatedAt: ts,
        };
        insert(INTERVIEWS, interview as unknown as Record<string, unknown>);

        // Interviews double as calendar entries so the two views agree.
        const calendarEntry: RecruitingEvent = {
          id: randomUUID(),
          applicationId: application.id,
          companyId: company.id,
          title: `${company.name} — ${interview.interviewType}`,
          eventType: interview.interviewType === "HireVue" ? "Assessment" : "Interview",
          startsAt: scheduledAt,
          endsAt: null,
          location: interview.location,
          meetingLink: interview.meetingLink,
          notes: null,
          createdAt: ts,
          updatedAt: ts,
        };
        insert(RECRUITING_EVENTS, calendarEntry as unknown as Record<string, unknown>);
      }

      for (const seedTask of seed.tasks ?? []) {
        const task: Task = {
          id: randomUUID(),
          applicationId: application.id,
          contactId: null,
          title: seedTask.title,
          taskType: seedTask.taskType,
          dueDate: dayAhead(seedTask.dueInDays),
          priority: seedTask.priority,
          completed: seedTask.completed ?? false,
          completedAt: seedTask.completed ? stamp(Math.abs(seedTask.dueInDays)) : null,
          notes: seedTask.notes ?? null,
          autoSuggested: false,
          createdAt: ts,
          updatedAt: ts,
        };
        insert(TASKS, task as unknown as Record<string, unknown>);
      }

      for (const seedContact of seed.contacts ?? []) {
        const contact: Contact = {
          id: randomUUID(),
          companyId: company.id,
          name: seedContact.name,
          jobTitle: seedContact.jobTitle,
          email: seedContact.email ?? null,
          phone: null,
          linkedinUrl: seedContact.linkedinUrl ?? null,
          relationship: seedContact.relationship,
          lastContactDate:
            seedContact.lastContactDaysAgo !== undefined ? dayAgo(seedContact.lastContactDaysAgo) : null,
          nextFollowUpDate:
            seedContact.nextFollowUpInDays !== undefined ? dayAhead(seedContact.nextFollowUpInDays) : null,
          notes: seedContact.notes ?? null,
          createdAt: ts,
          updatedAt: ts,
        };
        insert(CONTACTS, contact as unknown as Record<string, unknown>);
        insert(APPLICATION_CONTACTS, {
          applicationId: application.id,
          contactId: contact.id,
          role: seedContact.relationship,
        });
      }

      for (const seedDoc of seed.documents ?? []) {
        const doc: ApplicationDocument = {
          id: randomUUID(),
          applicationId: application.id,
          documentType: seedDoc.documentType,
          name: seedDoc.name,
          fileUrl: null,
          submitted: seedDoc.submitted,
          createdAt: ts,
        };
        insert(APPLICATION_DOCUMENTS, doc as unknown as Record<string, unknown>);
      }

      if (application.deadline) {
        const deadlineEvent: RecruitingEvent = {
          id: randomUUID(),
          applicationId: application.id,
          companyId: company.id,
          title: `${company.name} — application deadline`,
          eventType: "Deadline",
          startsAt: application.deadline,
          endsAt: null,
          location: null,
          meetingLink: null,
          notes: null,
          createdAt: ts,
          updatedAt: ts,
        };
        insert(RECRUITING_EVENTS, deadlineEvent as unknown as Record<string, unknown>);
      }
    }

    /* Standalone calendar events and tasks -------------------------------- */
    for (const seed of EVENT_SEEDS) {
      const event: RecruitingEvent = {
        id: randomUUID(),
        applicationId: null,
        companyId: seed.companyKey ? (companyByKey.get(seed.companyKey)?.id ?? null) : null,
        title: seed.title,
        eventType: seed.eventType,
        startsAt: instant(seed.daysFromNow, seed.time ?? "12:00"),
        endsAt: null,
        location: seed.location ?? null,
        meetingLink: null,
        notes: seed.notes ?? null,
        createdAt: ts,
        updatedAt: ts,
      };
      insert(RECRUITING_EVENTS, event as unknown as Record<string, unknown>);
    }

    for (const seed of STANDALONE_TASKS) {
      const task: Task = {
        id: randomUUID(),
        applicationId: null,
        contactId: null,
        title: seed.title,
        taskType: seed.taskType,
        dueDate: dayAhead(seed.dueInDays),
        priority: seed.priority,
        completed: false,
        completedAt: null,
        notes: null,
        autoSuggested: false,
        createdAt: ts,
        updatedAt: ts,
      };
      insert(TASKS, task as unknown as Record<string, unknown>);
    }
  });
}
