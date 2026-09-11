/**
 * SQLite DDL for the tracker.
 *
 * The shape mirrors `supabase/schema.sql` one-for-one (UUID text primary keys,
 * `created_at` / `updated_at` on every mutable table, foreign keys with
 * cascading deletes) so the storage engine can be swapped for Postgres without
 * touching the repository layer's query shapes.
 */
export const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS companies (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,
  logo_url      TEXT,
  industry      TEXT,
  website       TEXT,
  careers_url   TEXT,
  headquarters  TEXT,
  notes         TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS resume_versions (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  description  TEXT,
  file_url     TEXT,
  is_default   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS contacts (
  id                  TEXT PRIMARY KEY,
  company_id          TEXT REFERENCES companies(id) ON DELETE SET NULL,
  name                TEXT NOT NULL,
  job_title           TEXT,
  email               TEXT,
  phone               TEXT,
  linkedin_url        TEXT,
  relationship        TEXT NOT NULL DEFAULT 'Recruiter',
  last_contact_date   TEXT,
  next_follow_up_date TEXT,
  notes               TEXT,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS applications (
  id                     TEXT PRIMARY KEY,
  company_id             TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  position               TEXT NOT NULL,
  internship_type        TEXT,
  industry               TEXT,
  location               TEXT,
  work_type              TEXT,
  job_posting_url        TEXT,
  job_id                 TEXT,
  job_description        TEXT,
  compensation           TEXT,
  deadline               TEXT,
  status                 TEXT NOT NULL DEFAULT 'Saved',
  date_applied           TEXT,
  source                 TEXT,
  is_referral            INTEGER NOT NULL DEFAULT 0,
  resume_version_id      TEXT REFERENCES resume_versions(id) ON DELETE SET NULL,
  cover_letter_submitted INTEGER NOT NULL DEFAULT 0,
  transcript_submitted   INTEGER NOT NULL DEFAULT 0,
  recruiter_name         TEXT,
  recruiter_email        TEXT,
  recruiter_linkedin     TEXT,
  referral_name          TEXT,
  connection_notes       TEXT,
  notes                  TEXT,
  next_action            TEXT,
  first_response_date    TEXT,
  created_at             TEXT NOT NULL,
  updated_at             TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_applications_company ON applications(company_id);
CREATE INDEX IF NOT EXISTS idx_applications_status  ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_applied ON applications(date_applied);

CREATE TABLE IF NOT EXISTS interviews (
  id                  TEXT PRIMARY KEY,
  application_id      TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  interview_type      TEXT NOT NULL,
  scheduled_at        TEXT,
  duration_minutes    INTEGER,
  interviewer_name    TEXT,
  interviewer_title   TEXT,
  interviewer_linkedin TEXT,
  meeting_link        TEXT,
  location            TEXT,
  notes               TEXT,
  outcome             TEXT NOT NULL DEFAULT 'Pending',
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_interviews_application ON interviews(application_id);

CREATE TABLE IF NOT EXISTS tasks (
  id             TEXT PRIMARY KEY,
  application_id TEXT REFERENCES applications(id) ON DELETE CASCADE,
  contact_id     TEXT REFERENCES contacts(id) ON DELETE SET NULL,
  title          TEXT NOT NULL,
  task_type      TEXT NOT NULL DEFAULT 'Other',
  due_date       TEXT,
  priority       TEXT NOT NULL DEFAULT 'Medium',
  completed      INTEGER NOT NULL DEFAULT 0,
  completed_at   TEXT,
  notes          TEXT,
  auto_suggested INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_application ON tasks(application_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date);

CREATE TABLE IF NOT EXISTS timeline_events (
  id             TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  kind           TEXT NOT NULL DEFAULT 'Other',
  title          TEXT NOT NULL,
  description    TEXT,
  occurred_at    TEXT NOT NULL,
  created_at     TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_timeline_application ON timeline_events(application_id);

CREATE TABLE IF NOT EXISTS recruiting_events (
  id             TEXT PRIMARY KEY,
  application_id TEXT REFERENCES applications(id) ON DELETE CASCADE,
  company_id     TEXT REFERENCES companies(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  event_type     TEXT NOT NULL DEFAULT 'Other',
  starts_at      TEXT NOT NULL,
  ends_at        TEXT,
  location       TEXT,
  meeting_link   TEXT,
  notes          TEXT,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_starts ON recruiting_events(starts_at);

CREATE TABLE IF NOT EXISTS application_documents (
  id             TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  document_type  TEXT NOT NULL,
  name           TEXT NOT NULL,
  file_url       TEXT,
  submitted      INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS application_contacts (
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  contact_id     TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  role           TEXT,
  PRIMARY KEY (application_id, contact_id)
);

-- Small key/value store for facts about the database itself. It deliberately
-- survives "clear all data" so an intentionally emptied tracker is not mistaken
-- for a brand new one and re-seeded with demo data.
CREATE TABLE IF NOT EXISTS app_meta (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dismissed_suggestions (
  id             TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  reason         TEXT NOT NULL,
  dismissed_at   TEXT NOT NULL
);
`;
