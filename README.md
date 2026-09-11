# Internship Tracker

A recruiting command center for internship applications: pipeline, interviews, follow-ups and
analytics that tell you which strategies are actually working.

## Install

You need [Node.js](https://nodejs.org) 24 or newer. Then **double-click `Setup`** in this folder —
`Setup.cmd` on Windows, `Setup.command` on Mac. No terminal required.

If you would rather use a terminal, this does the same thing:

```bash
npm run setup
```

Either way it installs everything, builds the app, puts an **Internship Tracker** shortcut on your
desktop, and opens the tracker in your browser.

**After that you never need a terminal again:**

- Double-click **Internship Tracker** on your desktop to open it
- Double-click **Stop Internship Tracker** in this folder to shut it down

The launcher looks after itself — if something is missing it reinstalls and rebuilds on its own,
and if the app is already running it just opens the browser.

### Your data

Everything is saved on your own computer, in `data/tracker.db`. It stays between sessions and is
never uploaded anywhere. Nobody else can see it.

The first launch fills the tracker with a realistic sample search (Goldman Sachs, JPMorgan, Evercore,
Blackstone, Jefferies, Bank of America, Apollo, Deloitte and others) at a spread of recruiting
stages, so every screen has something to show. Wipe it and start on your own applications from
**Settings → Your data → Clear all data** — once cleared, it stays cleared.

### Working on the code

```bash
npm run dev
```

`npm run app` starts the production build the same way the desktop launcher does, and `npm run stop`
shuts it down.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router) + React 19 |
| Language | TypeScript, `strict` |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui conventions over Radix primitives |
| Icons | Lucide |
| Charts | Recharts |
| Drag and drop | dnd-kit |
| Database | SQLite via Node's built-in `node:sqlite` |

### About the database

The app ships on SQLite through `node:sqlite`, which is part of Node 22.5+ — no native module to
compile, no service to run, and real SQL with foreign keys, cascades, UUID primary keys and
`created_at` / `updated_at` timestamps.

`supabase/schema.sql` mirrors that schema for Postgres one-for-one, with `owner_id` columns,
`updated_at` triggers and row-level-security policies already in place. Because every query goes
through the repository layer in `src/lib/db/repo.ts`, moving to Supabase means swapping that one
module — nothing in the UI or the API routes changes shape.

Point the database somewhere else with `DATABASE_FILE` (see `.env.example`).

## Architecture

```
scripts/                  Setup and the desktop launcher (Node built-ins only)
src/
  app/                    Routes and API handlers
    api/                  REST endpoints, one folder per resource
  components/
    ui/                   shadcn/ui primitives
    common/               Cross-feature building blocks (Field, Section, TaskList, …)
    applications/         Table, composer, timeline, interviews, documents
    dashboard/ pipeline/ calendar/ companies/ contacts/ analytics/
  hooks/
    use-tracker.tsx       The single data store: loads the dataset, runs mutations
    use-ui.tsx            Global composer, command palette, keyboard shortcuts
  lib/
    db/                   Schema, column maps, connection, repository
    analytics.ts          Funnel, conversion rates, response times, breakdowns
    follow-ups.ts         The "needs attention" engine
    selectors.ts          Joins, filtering, sorting, search
    status.ts             Status colours, stage mapping, status groupings
    dates.ts              Relative-date phrasing used across the UI
```

### Data flow

One store (`useTracker`) fetches the whole dataset from `/api/dataset` and holds it. Every mutation
applies an optimistic patch, calls its endpoint, then refetches to reconcile. That is what keeps a
status change made on the Kanban board instantly visible in the table, the dashboard metrics and the
analytics funnel — they all read from the same store, and none of them hold their own copy.

### Derived, not hand-maintained

The server derives the things a tracker should not make you remember:

- changing status appends a **timeline entry**
- moving to *Applied* fills in the **applied date** if it is blank
- the first substantive reply sets **`first_response_date`**, which drives response-rate analytics
- adding an interview creates the matching **calendar event**
- setting a deadline creates a **deadline event**

### A note on the conversion funnel

Funnel stages are cumulative — each counts applications that reached that stage *or went further* —
because a percentage between two stages only means something when one set is a subset of the other.
Recruiting processes are not uniform: plenty go straight from application to interview with no
assessment. The funnel therefore also reports how many applications *actually* sat an assessment, so
the cumulative figure cannot be misread.

## Features

- **Dashboard** — seven headline metrics, live pipeline, recruiting activity chart (7/30/90/all),
  recent applications, upcoming tasks and interviews, and the follow-up queue.
- **Applications** — sortable, filterable table across every field, with saved views, multi-select,
  bulk status changes, bulk delete, column visibility and CSV export.
- **Add application** — a side panel that needs only a company and a position; the company field is a
  type-ahead that creates new companies inline. `N` opens it, `⌘/Ctrl + Enter` saves it, and
  *Save and add another* keeps the shared fields for back-to-back entry.
- **Application detail** — recruiting timeline, interviews with interviewer and outcome, tasks,
  linked contacts, documents, and auto-saving notes.
- **Pipeline** — Kanban across the seven stages; dragging a card changes the application's status.
- **Calendar** — month, week and agenda views over deadlines, interviews, assessments and events.
- **Companies** — every role you have applied for there, plus contacts and notes.
- **Contacts** — recruiters, alumni and interviewers, linkable to multiple applications.
- **Analytics** — conversion funnel, response and offer rates, response times, volume cadence, and
  outcome breakdowns by industry, source, location, company and resume version.
- **Settings** — resume versions with live interview-rate comparison, theme, data export and reset.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `N` | Add an application |
| `⌘/Ctrl + K` or `/` | Global search |
| `⌘/Ctrl + Enter` | Save the open application form |
| `Esc` | Close a dialog or panel |

## Checks

```bash
npm run typecheck && npm run lint && npm run build
```
