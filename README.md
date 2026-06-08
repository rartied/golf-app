# Golf Tracker

A mobile-first golf handicap and stats tracker. Track rounds hole-by-hole, compute
your WHS handicap index, and analyze your game over time. **Multi-user** with a
shared course library and private per-user rounds.

## Features

- **Handicap Index** — WHS 2024-compliant score differential and handicap index
- **Hole-by-hole scoring** — score, putts, fairway direction, green hit, bunkers, chips, penalties
- **Stats** — averages, trends, personal records, last round vs. previous
- **Shared courses** — any user can add/edit courses (tees, ratings, slope, stroke index)
- **Stroke calculator** — course handicap and net scoring per hole
- **Accounts** — invite-only sign-up; each user's rounds are private to them

See [CALCULATIONS.md](CALCULATIONS.md) for every formula used.

## Tech stack

- **Frontend:** [React](https://react.dev/) + [Vite](https://vitejs.dev/) + [Tailwind CSS](https://tailwindcss.com/)
- **Backend:** [FastAPI](https://fastapi.tiangolo.com/) + [SQLAlchemy](https://www.sqlalchemy.org/) + [Alembic](https://alembic.sqlalchemy.org/)
- **Database:** PostgreSQL
- **Auth:** email + password (bcrypt), JWT sessions, invite-only registration

```
React SPA  ──fetch /api──▶  FastAPI  ──▶  PostgreSQL
(same origin; nginx serves the SPA and proxies /api in prod)
```

---

## Local development

**Prereqs:** Node 18+, Python 3.11+, PostgreSQL running locally.

```bash
# 1. Database
createdb golf            # or: psql -c "CREATE DATABASE golf OWNER golf"

# 2. Backend
python3 -m venv api/venv
api/venv/bin/pip install -r api/requirements.txt
cp api/.env.example api/.env       # set DATABASE_URL, JWT_SECRET
PYTHONPATH=. api/venv/bin/alembic -c api/alembic.ini upgrade head
PYTHONPATH=. api/venv/bin/uvicorn api.main:app --reload --port 8001

# 3. Frontend (separate terminal) — Vite proxies /api → :8001
npm install
npm run dev

# 4. Create an admin to log in with
PYTHONPATH=. api/venv/bin/python -m api.scripts.create_user --email you@example.com --name You --admin
```

Open the dev URL Vite prints, sign in, and use **Invites** (admin) to add others.

### Tests
```bash
PYTHONPATH=. api/venv/bin/python -m pytest api/tests/   # uses a golf_test database
```

### Seed reference data
Import the original shared course library (+ optional author rounds):
```bash
PYTHONPATH=. api/venv/bin/python -m api.scripts.migrate_supabase --no-rounds          # courses only
# or attach the 25 author rounds to a named account:
PYTHONPATH=. api/venv/bin/python -m api.scripts.create_user --email author@example.com --name rartied
PYTHONPATH=. api/venv/bin/python -m api.scripts.migrate_supabase --rounds-user author@example.com
```

---

## Deployment

Self-hosted on a Linode behind nginx at `golf.jbohlen.dev`. Full instructions in
[deploy/README.md](deploy/README.md).

## Database schema

Managed by Alembic ([api/migrations/](api/migrations/)). Tables: `users`, `invites`,
`courses` (shared), `rounds` (per-user). `courses.tees`/`courses.holes`/
`rounds.hole_scores` are JSONB. To change the schema, edit
[api/models.py](api/models.py) and add a migration.
