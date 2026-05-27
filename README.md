# Golf Tracker

A mobile-first golf handicap and stats tracker built with React, Vite, and Supabase. Track rounds hole-by-hole, compute your WHS handicap index, and analyze your game over time.

## Features

- **Handicap Index** — WHS 2024-compliant score differential calculation
- **Hole-by-hole scoring** — score, putts, fairway direction, green hit, bunkers, chip shots, penalties
- **Stats** — averages, trends, personal records, last round vs. previous
- **Courses** — add courses with full tee/hole data (par, rating, slope, stroke index)
- **Stroke calculator** — course handicap and net scoring

## Tech stack

- [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- [Supabase](https://supabase.com/) (Postgres + REST API)
- [Tailwind CSS](https://tailwindcss.com/)
- Deployed on [Vercel](https://vercel.com/)

---

## Getting started

### 1. Clone the repo

```bash
git clone https://github.com/rartied/golf-app.git
cd golf-app
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free project.
2. In the SQL Editor, run the contents of [`supabase/schema.sql`](supabase/schema.sql) to create the `courses` and `rounds` tables.

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in your project's URL and anon key from **Supabase → Project Settings → API**:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Run locally

```bash
npm run dev
```

---

## Deploy to Vercel

1. Push your fork to GitHub.
2. Import the repo in [Vercel](https://vercel.com/new).
3. Add the two environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) in Vercel's project settings.
4. Deploy — Vercel auto-detects Vite.

---

## Database schema

The full schema is in [`supabase/schema.sql`](supabase/schema.sql). The app uses two tables:

| Table | Purpose |
|-------|---------|
| `courses` | Course info — name, location, tees (jsonb), holes (jsonb) |
| `rounds` | Round results — scores, differentials, per-hole data (jsonb) |

> **Note:** The app is single-user by default (no auth). To support multiple users, enable Supabase Auth and add Row Level Security policies — the commented-out lines in `schema.sql` are a starting point.

---

## Using a different database

The data layer lives entirely in [`src/hooks/useAppData.js`](src/hooks/useAppData.js). Supabase is only used there. To swap it out (Firebase, PlanetScale, local SQLite, etc.):

1. Replace the `supabase` calls in `useAppData.js` with your own async fetch/mutation logic.
2. Keep the same return shape (`rounds`, `courses`, `addRound`, `deleteRound`, etc.) and nothing else in the app needs to change.
