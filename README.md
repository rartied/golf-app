# Golf Tracker

A mobile-first golf handicap and stats tracker built with React, Vite, and Supabase. Track rounds hole-by-hole, compute your WHS handicap index, and analyze your game over time.

## Features

- **Handicap Index** — WHS 2024-compliant score differential and handicap index calculation
- **Hole-by-hole scoring** — score, putts, fairway direction, green hit, bunkers, chip shots, penalties
- **Stats** — averages, trends, personal records, last round vs. previous
- **Courses** — add courses with full tee/hole data (par, rating, slope, stroke index)
- **Stroke calculator** — course handicap and net scoring per hole

See [CALCULATIONS.md](CALCULATIONS.md) for a full explanation of every formula used in the app.

## Tech stack

- [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- [Supabase](https://supabase.com/) (Postgres + REST API)
- [Tailwind CSS](https://tailwindcss.com/)

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

## Deploying

The app builds to a static bundle (`npm run build` → `dist/`). You can host it anywhere that serves static files:

- **Vercel** — import the repo, add the two env vars in project settings, deploy.
- **Netlify** — same process; set build command to `npm run build` and publish directory to `dist`.
- **Cloudflare Pages** — connect the repo, same build settings.
- **Self-hosted** — serve the `dist/` folder with any static file server (nginx, Caddy, etc.).

Set the two `VITE_` environment variables in whatever host you use — that's the only configuration required.

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

The data layer lives entirely in [`src/hooks/useAppData.js`](src/hooks/useAppData.js). Supabase is only used there. To swap it out (Firebase, PlanetScale, local SQLite, a simple REST API, etc.):

1. Replace the `supabase` calls in `useAppData.js` with your own async fetch/mutation logic.
2. Keep the same return shape (`rounds`, `courses`, `addRound`, `deleteRound`, etc.) and nothing else in the app needs to change.
