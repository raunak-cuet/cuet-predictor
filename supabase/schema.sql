-- ============================================================
-- CUET 2026 DU Admission Predictor — Supabase Schema
-- Run this once inside the Supabase SQL editor before using the app.
-- ============================================================

create extension if not exists "pgcrypto";

create table if not exists public.submissions (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  name            text,
  category        text not null check (category in ('UR','OBC','SC','ST','EWS','PwBD')),
  scores          jsonb not null,             -- { "101": 216.07, "319": 219.43, ... }
  subjects_taken  text[] not null,            -- ['101','319','309','305','501']
  dream_program_id integer,                   -- id from programs.json (nullable)
  dream_label     text,                       -- "SSCBS — BBA (FIA)"
  composite_top   numeric,                    -- best composite achieved across all eligible programs
  dream_probability numeric,                  -- 0..100
  user_agent      text,
  ip_hash         text
);

create index if not exists submissions_created_at_idx on public.submissions (created_at desc);
create index if not exists submissions_category_idx   on public.submissions (category);
create index if not exists submissions_dream_idx      on public.submissions (dream_program_id);

-- Outcome capture (Phase 2 — fed back after CSAS rounds)
create table if not exists public.outcomes (
  id              uuid primary key default gen_random_uuid(),
  submission_id   uuid references public.submissions(id) on delete cascade,
  round           text check (round in ('R1','R2','R3','SPOT','UPGRADE')),
  allocated_program_id integer,
  allocated_label text,
  joined          boolean,
  reported_at     timestamptz not null default now()
);

-- Row-level security (locked by default; service role bypasses)
alter table public.submissions enable row level security;
alter table public.outcomes    enable row level security;

-- Allow anonymous inserts (the API uses the anon key for inserts).
-- Admin reads use the SERVICE_ROLE key server-side only.
drop policy if exists "anon can insert submissions" on public.submissions;
create policy "anon can insert submissions" on public.submissions
  for insert to anon, authenticated with check (true);

drop policy if exists "anon can insert outcomes" on public.outcomes;
create policy "anon can insert outcomes" on public.outcomes
  for insert to anon, authenticated with check (true);
