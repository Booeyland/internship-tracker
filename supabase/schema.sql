-- Internship Tracker — Postgres / Supabase schema
--
-- This mirrors the local SQLite schema in `src/lib/db/schema.ts` one-for-one:
-- the same tables, columns, relationships and cascade rules, expressed with
-- Postgres types. Apply it with `supabase db push`, or paste it into the SQL
-- editor, then point the repository layer at Supabase instead of SQLite.
--
-- Row Level Security is enabled with owner-scoped policies so the same schema
-- works for a single user today and multiple users later. Every table carries
-- an `owner_id` defaulting to the authenticated user.

create extension if not exists "pgcrypto";

/* -------------------------------------------------------------------------- */
/*  Enumerated domains                                                        */
/*  Kept as check constraints rather than Postgres enums so adding a value     */
/*  is a one-line migration instead of an enum rewrite.                        */
/* -------------------------------------------------------------------------- */

create domain application_status as text check (
  value in (
    'Interested', 'Saved', 'Applied', 'Online Assessment', 'HireVue',
    'First Round', 'Second Round', 'Superday / Final Round', 'Offer',
    'Accepted', 'Rejected', 'Withdrawn', 'Ghosted'
  )
);

create domain work_type as text check (value in ('Remote', 'Hybrid', 'In-Person'));

create domain priority_level as text check (value in ('Low', 'Medium', 'High'));

/* -------------------------------------------------------------------------- */
/*  Tables                                                                    */
/* -------------------------------------------------------------------------- */

create table if not exists companies (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name          text not null,
  logo_url      text,
  industry      text,
  website       text,
  careers_url   text,
  headquarters  text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (owner_id, name)
);

create table if not exists resume_versions (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name         text not null,
  description  text,
  file_url     text,
  is_default   boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists contacts (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null default auth.uid() references auth.users(id) on delete cascade,
  company_id          uuid references companies(id) on delete set null,
  name                text not null,
  job_title           text,
  email               text,
  phone               text,
  linkedin_url        text,
  relationship        text not null default 'Recruiter',
  last_contact_date   date,
  next_follow_up_date date,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table if not exists applications (
  id                     uuid primary key default gen_random_uuid(),
  owner_id               uuid not null default auth.uid() references auth.users(id) on delete cascade,
  company_id             uuid not null references companies(id) on delete cascade,
  position               text not null,
  internship_type        text,
  industry               text,
  location               text,
  work_type              work_type,
  job_posting_url        text,
  job_id                 text,
  job_description        text,
  compensation           text,
  deadline               date,
  status                 application_status not null default 'Saved',
  date_applied           date,
  source                 text,
  is_referral            boolean not null default false,
  resume_version_id      uuid references resume_versions(id) on delete set null,
  cover_letter_submitted boolean not null default false,
  transcript_submitted   boolean not null default false,
  recruiter_name         text,
  recruiter_email        text,
  recruiter_linkedin     text,
  referral_name          text,
  connection_notes       text,
  notes                  text,
  next_action            text,
  first_response_date    date,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists idx_applications_owner   on applications(owner_id);
create index if not exists idx_applications_company on applications(company_id);
create index if not exists idx_applications_status  on applications(status);
create index if not exists idx_applications_applied on applications(date_applied);

create table if not exists interviews (
  id                   uuid primary key default gen_random_uuid(),
  owner_id             uuid not null default auth.uid() references auth.users(id) on delete cascade,
  application_id       uuid not null references applications(id) on delete cascade,
  interview_type       text not null,
  scheduled_at         timestamptz,
  duration_minutes     integer,
  interviewer_name     text,
  interviewer_title    text,
  interviewer_linkedin text,
  meeting_link         text,
  location             text,
  notes                text,
  outcome              text not null default 'Pending',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists idx_interviews_application on interviews(application_id);

create table if not exists tasks (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  application_id uuid references applications(id) on delete cascade,
  contact_id     uuid references contacts(id) on delete set null,
  title          text not null,
  task_type      text not null default 'Other',
  due_date       date,
  priority       priority_level not null default 'Medium',
  completed      boolean not null default false,
  completed_at   timestamptz,
  notes          text,
  auto_suggested boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_tasks_application on tasks(application_id);
create index if not exists idx_tasks_due on tasks(due_date);

create table if not exists timeline_events (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  application_id uuid not null references applications(id) on delete cascade,
  kind           text not null default 'Other',
  title          text not null,
  description    text,
  occurred_at    timestamptz not null default now(),
  created_at     timestamptz not null default now()
);

create index if not exists idx_timeline_application on timeline_events(application_id);

create table if not exists recruiting_events (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  application_id uuid references applications(id) on delete cascade,
  company_id     uuid references companies(id) on delete cascade,
  title          text not null,
  event_type     text not null default 'Other',
  starts_at      timestamptz not null,
  ends_at        timestamptz,
  location       text,
  meeting_link   text,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_events_starts on recruiting_events(starts_at);

create table if not exists application_documents (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  application_id uuid not null references applications(id) on delete cascade,
  document_type  text not null,
  name           text not null,
  file_url       text,
  submitted      boolean not null default false,
  created_at     timestamptz not null default now()
);

create table if not exists application_contacts (
  application_id uuid not null references applications(id) on delete cascade,
  contact_id     uuid not null references contacts(id) on delete cascade,
  role           text,
  primary key (application_id, contact_id)
);

create table if not exists dismissed_suggestions (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  application_id uuid not null references applications(id) on delete cascade,
  reason         text not null,
  dismissed_at   timestamptz not null default now()
);

/* -------------------------------------------------------------------------- */
/*  updated_at maintenance                                                    */
/* -------------------------------------------------------------------------- */

create or replace function set_updated_at() returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  target text;
begin
  foreach target in array array[
    'companies', 'resume_versions', 'contacts', 'applications',
    'interviews', 'tasks', 'recruiting_events'
  ]
  loop
    execute format(
      'drop trigger if exists set_updated_at_%1$s on %1$s;
       create trigger set_updated_at_%1$s before update on %1$s
       for each row execute function set_updated_at();',
      target
    );
  end loop;
end;
$$;

/* -------------------------------------------------------------------------- */
/*  Row Level Security                                                        */
/* -------------------------------------------------------------------------- */

do $$
declare
  target text;
begin
  foreach target in array array[
    'companies', 'resume_versions', 'contacts', 'applications', 'interviews',
    'tasks', 'timeline_events', 'recruiting_events', 'application_documents',
    'dismissed_suggestions'
  ]
  loop
    execute format('alter table %1$s enable row level security;', target);
    execute format('drop policy if exists owner_all on %1$s;', target);
    execute format(
      'create policy owner_all on %1$s
         for all using (owner_id = auth.uid())
         with check (owner_id = auth.uid());',
      target
    );
  end loop;
end;
$$;

-- The join table has no owner column of its own; it inherits access from the
-- application it belongs to.
alter table application_contacts enable row level security;
drop policy if exists owner_all on application_contacts;
create policy owner_all on application_contacts
  for all
  using (
    exists (
      select 1 from applications a
      where a.id = application_contacts.application_id and a.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from applications a
      where a.id = application_contacts.application_id and a.owner_id = auth.uid()
    )
  );
