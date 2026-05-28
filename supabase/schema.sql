-- Golf Tracker — Supabase schema
-- Run this in the Supabase SQL Editor to set up your database.

create table public.courses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  location    text,
  -- tees: array of { id, name, color, rating, slope, par }
  tees        jsonb not null default '[]'::jsonb,
  -- holes: array of { number, par, strokeIndex } for each hole on the course
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
  -- hole_scores: array of hole objects (see structure below)
  hole_scores          jsonb not null default '[]'::jsonb,
  holes_played         integer not null default 18,
  -- nine_hole_type: 'front' | 'back' | null (null = full 18)
  nine_hole_type       text,
  created_at           timestamptz not null default now()
);

-- hole_scores array — each element has this shape:
--
-- {
--   "number":           4,        -- hole number (1–18)
--   "par":              4,        -- hole par
--   "strokeIndex":      3,        -- stroke index / handicap allocation (1 = hardest)
--   "score":            5,        -- gross strokes taken
--   "putts":            2,        -- putts taken on the green
--   "fairway":          "right",  -- "hit" | "right" | "left" | "na" (par 3s)
--   "greenHit":         "short",  -- "hit" | "long" | "short" | "left" | "right"
--   "fairwayBunkers":   0,        -- number of fairway bunker shots
--   "greensideBunkers": 1,        -- number of greenside bunker shots
--   "chipShots":        1,        -- chip/pitch shots played around the green
--   "waterHazards":     0,        -- penalty strokes for water hazards
--   "outOfBounds":      0,        -- penalty strokes for out of bounds
--   "dropShots":        0         -- other drop/relief penalties
-- }
--
-- All stat fields (putts through dropShots) default to 0 / null for legacy rounds
-- that were logged before stat tracking was added. computeRoundStats() in
-- src/utils/roundStats.js handles missing fields gracefully.

-- Optional: enable Row Level Security if you add Supabase Auth
-- alter table public.courses enable row level security;
-- alter table public.rounds enable row level security;
