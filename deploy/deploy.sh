#!/usr/bin/env bash
# Deploy golf updates to golf.jbohlen.dev.
#
# Runs ON THE SERVER (in /opt/golf/repo). From your laptop:
#   ssh deploy@jbohlen.dev 'cd /opt/golf/repo && ./deploy/deploy.sh'
#
# Pulls latest, updates backend deps + DB, rebuilds the frontend, restarts the API.
# First-time setup is in deploy/README.md.

set -euo pipefail
cd "$(dirname "$0")/.."   # repo root (/opt/golf/repo)

echo "==> git pull"
git pull --ff-only

echo "==> backend deps"
api/venv/bin/pip install -q -r api/requirements.txt

echo "==> db migrations"
PYTHONPATH=. api/venv/bin/alembic -c api/alembic.ini upgrade head

echo "==> frontend build"
npm ci
npm run build

echo "==> restart API"
sudo systemctl restart golf-api

echo "==> status"
sudo systemctl --no-pager --lines=0 status golf-api || true
echo "==> done. https://golf.jbohlen.dev"
