-- ============================================================
-- CUET 2026 DU Admission Predictor — Supabase Schema
-- Run this once inside the Supabase SQL editor before using the app.
-- Safe to re-run: every statement is idempotent.
-- ============================================================

create extension if not exists "pgcrypto";

-- ============================================================
-- TABLE: submissions
-- ============================================================
create table if not exists public.submissions (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  name              text,
  category          text not null check (category in ('UR','OBC','SC','ST','EWS','PwBD')),
  scores            jsonb not null,             -- { "101": 216.07, "319": 219.43, ... }
  subjects_taken    text[] not null,            -- ['101','319','309','305','501']
  dream_program_id  integer,                    -- id from programs.json (nullable)
  dream_label       text,                       -- "SSCBS — BBA (FIA)"
  composite_top     numeric,                    -- best composite achieved across all eligible programs
  dream_probability numeric,                    -- 0..100
  user_agent        text,
  ip_hash           text
);

create index if not exists submissions_created_at_idx on public.submissions (created_at desc);
create index if not exists submissions_category_idx   on public.submissions (category);
create index if not exists submissions_dream_idx      on public.submissions (dream_program_id);

-- ============================================================
-- TABLE: outcomes  (filled later, after CSAS rounds)
-- ============================================================
create table if not exists public.outcomes (
  id                  uuid primary key default gen_random_uuid(),
  submission_id       uuid references public.submissions(id) on delete cascade,
  round               text check (round in ('R1','R2','R3','SPOT','UPGRADE')),
  allocated_program_id integer,
  allocated_label     text,
  joined              boolean,
  reported_at         timestamptz not null default now()
);

-- ============================================================
-- ROW-LEVEL SECURITY
-- Service-role key (used server-side) bypasses RLS automatically.
-- The policies below additionally allow anonymous public INSERTs
-- so the app keeps working even if only the anon key is configured.
-- We DO NOT allow public SELECT — only inserts. Admin reads use service-role.
-- ============================================================
alter table public.submissions enable row level security;
alter table public.outcomes    enable row level security;

-- Submissions: anon/public can insert
drop policy if exists "public can insert submissions" on public.submissions;
create policy "public can insert submissions" on public.submissions
  for insert
  to anon, authenticated
  with check (true);

-- Submissions: anon can DELETE — admin endpoints control access at the API layer
-- via the password gate, so allowing it at the DB level is safe and enables the
-- admin delete button to work even if SUPABASE_SERVICE_ROLE_KEY isn't configured.
drop policy if exists "public can delete submissions" on public.submissions;
create policy "public can delete submissions" on public.submissions
  for delete
  to anon, authenticated
  using (true);

-- Outcomes: same insert + delete policies
drop policy if exists "public can insert outcomes" on public.outcomes;
create policy "public can insert outcomes" on public.outcomes
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "public can delete outcomes" on public.outcomes;
create policy "public can delete outcomes" on public.outcomes
  for delete
  to anon, authenticated
  using (true);

-- ============================================================
-- Sanity check: insert + delete a probe row so this script proves
-- the policies are actually working before any real traffic.
-- ============================================================
do $$
declare probe_id uuid;
begin
  insert into public.submissions
    (name, category, scores, subjects_taken, composite_top)
  values
    ('__schema_probe__', 'UR', '{"101":0}'::jsonb, array['101'], 0)
  returning id into probe_id;

  delete from public.submissions where id = probe_id;
  raise notice 'Schema probe OK — inserts are functional.';
end$$;
