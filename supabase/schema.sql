-- Golf Tracker — Supabase schema
-- Run this in the Supabase SQL Editor to set up your database.

create table public.courses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  location    text,
  tees        jsonb not null default '[]'::jsonb,
  holes       jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);

create table public.rounds (
  id                   uuid primary key default gen_random_uuid(),
  date                 date not null,
  course_id            text,
  course_name          text,
  tee_id               text,
  tee_name             text,
  course_rating        numeric,
  slope                integer,
  course_par           integer,
  total_score          integer,
  adjusted_gross_score integer,
  score_differential   numeric,
  hole_scores          jsonb not null default '[]'::jsonb,
  holes_played         integer not null default 18,
  nine_hole_type       text,
  created_at           timestamptz not null default now()
);

-- Optional: enable Row Level Security if you add Supabase Auth
-- alter table public.courses enable row level security;
-- alter table public.rounds enable row level security;
