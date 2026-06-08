# Deploying Golf Tracker to `golf.jbohlen.dev`

Full-stack, self-hosted, multi-user — **no Supabase**. Lives on the same Linode as
the MLB app but completely separate: own subdomain, nginx server block, Postgres
database + role, backend service, and TLS cert. The MLB config is never touched.

```
Server (Linode, Ubuntu 24.04 — shared with MLB)
  nginx
    ├── jbohlen.dev      → /opt/mlb/repo/frontend/dist + :8000   (MLB, untouched)
    └── golf.jbohlen.dev
          ├── /api/  → 127.0.0.1:8001   (golf-api.service — FastAPI/uvicorn)
          └── /      → /opt/golf/repo/dist   (React build)
  PostgreSQL 16
    ├── kline   (MLB)
    └── golf    (this app — role `golf`)
```

Auth is **invite-only**: an admin generates a one-time registration link and
shares it. Courses are a shared library; rounds are private per user.

---

## Status / what's already done
- DNS `golf.jbohlen.dev` → server IP ✅
- nginx server block + Let's Encrypt cert (HTTPS) ✅ (currently serves a placeholder)

## Prerequisite — your own git repo
This project has diverged from `rartied/golf-app` (added a backend, removed
Supabase) and you can't push there. Create your **own private GitHub repo**, then
the server pulls from it.

---

## One-time server setup

```bash
# 1. Clone YOUR repo to /opt/golf/repo (deploy owns /opt/golf already)
ssh deploy@jbohlen.dev
git clone <your-private-repo-url> /opt/golf/repo

# 2. Run the full-stack setup (DB, venv, .env, schema, service, nginx /api proxy)
sudo bash /opt/golf/repo/deploy/server-setup.sh
```

`server-setup.sh` is idempotent and:
1. creates the `golf` Postgres role + database,
2. writes `/opt/golf/repo/.env` (generates `DATABASE_URL` password + `JWT_SECRET`),
3. creates the Python venv and installs `api/requirements.txt`,
4. runs `alembic upgrade head`,
5. `npm ci && npm run build`,
6. installs + starts `golf-api.service` (uvicorn on :8001),
7. updates the nginx block (adds `/api` proxy, sets root to `repo/dist`) and
   re-runs certbot so the 443 block keeps the new config,
8. smoke-checks `https://golf.jbohlen.dev/api/health`.

```bash
# 3. Bootstrap your admin account, the author account, and migrate the data
cd /opt/golf/repo
PYTHONPATH=. api/venv/bin/python -m api.scripts.create_user --email YOU@example.com --name "You" --admin
PYTHONPATH=. api/venv/bin/python -m api.scripts.create_user --email author@example.com --name "rartied"
PYTHONPATH=. api/venv/bin/python -m api.scripts.migrate_supabase --rounds-user author@example.com
```

Then open `https://golf.jbohlen.dev`, sign in as the admin, go to **Invites**, and
generate links for other players.

---

## Deploying updates

After pushing changes to your repo:

```bash
ssh deploy@jbohlen.dev 'cd /opt/golf/repo && ./deploy/deploy.sh'
```

`deploy.sh` pulls, updates backend deps, runs migrations, rebuilds the frontend,
and restarts `golf-api`.

> **Tight RAM note:** the box is a 1 GB Nanode. `vite build` is light (~1 s here)
> but if it ever OOMs, build locally (`npm run build`) and `rsync dist/` up — the
> frontend needs no build-time secrets.

---

## Useful commands
- Logs: `journalctl -u golf-api -f`
- Restart API: `sudo systemctl restart golf-api`
- DB shell: `sudo -u postgres psql golf`
- Re-issue/repair cert: `sudo certbot --nginx -d golf.jbohlen.dev`

## Environment (`/opt/golf/repo/.env`, never committed)
| Var | Purpose |
|-----|---------|
| `DATABASE_URL` | `postgresql+psycopg://golf:…@localhost:5432/golf` |
| `JWT_SECRET` | signs auth tokens |
| `PUBLIC_BASE_URL` | base for invite links (`https://golf.jbohlen.dev`) |
