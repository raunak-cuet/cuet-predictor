-- ============================================================
-- DreamSeat — Supabase Schema (SAFE VERSION)
-- ============================================================
-- 🛡️ THIS FILE WILL NEVER WIPE YOUR DATA.
-- Every "create" uses "if not exists" — safe to re-run anytime.
--
-- If you EVER need to wipe and rebuild from scratch (e.g. starting
-- fresh for a new admission cycle), MANUALLY uncomment the two
-- "drop table" lines at the bottom of this file. They are commented
-- out by default to prevent accidental data loss.
-- ============================================================

create extension if not exists "pgcrypto";

-- ============================================================
-- TABLE: submissions
-- ============================================================
create table if not exists public.submissions (
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

create index if not exists submissions_created_at_idx on public.submissions (created_at desc);
create index if not exists submissions_category_idx   on public.submissions (category);

-- ============================================================
-- TABLE: outcomes
-- ============================================================
create table if not exists public.outcomes (
  id              uuid primary key default gen_random_uuid(),
  submission_id   uuid references public.submissions(id) on delete cascade,
  round           text check (round in ('R1','R2','R3','SPOT','UPGRADE')),
  allocated_label text,
  joined          boolean,
  reported_at     timestamptz not null default now()
);

-- ============================================================
-- TABLE: settings (for maintenance toggle + future flags)
-- ============================================================
create table if not exists public.settings (
  key        text primary key,
  value      jsonb,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- ROW-LEVEL SECURITY
-- ============================================================
alter table public.submissions enable row level security;
alter table public.outcomes    enable row level security;
alter table public.settings    enable row level security;

-- ============================================================
-- Verify (returns the current submission count — should NOT be 0
-- after re-running this on an existing DB)
-- ============================================================
select 'Schema is up to date. Existing data preserved.' as status;
select count(*) as current_submission_count from public.submissions;

-- ============================================================
-- ☠️ DANGER ZONE — DO NOT UNCOMMENT UNLESS YOU MEAN IT ☠️
-- Uncommenting these will PERMANENTLY DELETE all student submissions.
-- They exist only for true "start from scratch" scenarios (e.g. new
-- admission cycle in 2027).
-- ============================================================
-- drop table if exists public.outcomes cascade;
-- drop table if exists public.submissions cascade;
-- drop table if exists public.settings cascade;
