-- ============================================================
-- DreamSeat — Clean rebuild (run this once in Supabase SQL Editor)
-- This drops the old tables and creates fresh ones.
-- ALL existing data will be wiped.
-- ============================================================

-- Step 1: Wipe everything related to our app (safe, ignores if not present)
drop table if exists public.outcomes cascade;
drop table if exists public.submissions cascade;

create extension if not exists "pgcrypto";

-- ============================================================
-- TABLE: submissions
-- One row per student calculation
-- ============================================================
create table public.submissions (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  name              text not null,
  category          text not null check (category in ('UR','OBC','SC','ST','EWS','PwBD')),
  scores            jsonb not null,
  subjects_taken    text[] not null,
  dream_program_id  integer,
  dream_label       text,
  composite_top     numeric,
  dream_probability numeric,
  user_agent        text,
  ip_hash           text
);

create index submissions_created_at_idx on public.submissions (created_at desc);
create index submissions_category_idx   on public.submissions (category);

-- ============================================================
-- TABLE: outcomes (for future CSAS feedback collection)
-- ============================================================
create table public.outcomes (
  id              uuid primary key default gen_random_uuid(),
  submission_id   uuid references public.submissions(id) on delete cascade,
  round           text check (round in ('R1','R2','R3','SPOT','UPGRADE')),
  allocated_label text,
  joined          boolean,
  reported_at     timestamptz not null default now()
);

-- ============================================================
-- ROW-LEVEL SECURITY
-- Because every database operation in our app goes through a
-- server-side API route that uses the SECRET KEY (which bypasses
-- RLS), we don't actually need permissive policies — RLS is on,
-- and only the secret key can read/write/delete. The browser-side
-- anon key has zero permissions on these tables.
-- This is the most secure pattern.
-- ============================================================
alter table public.submissions enable row level security;
alter table public.outcomes    enable row level security;

-- ============================================================
-- Verify
-- ============================================================
select 'Tables created. Submissions table is empty and ready.' as status;
select count(*) as current_submission_count from public.submissions;
