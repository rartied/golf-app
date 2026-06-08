#!/usr/bin/env bash
# One-time full-stack setup for golf.jbohlen.dev on the Linode.
# Run as root from a clone of the repo at /opt/golf/repo:
#
#   sudo REPO_URL=git@github.com:YOU/golf-app.git bash /opt/golf/repo/deploy/server-setup.sh
#
# Idempotent — safe to re-run. Privileged steps run as root; build/venv/migrate
# run as the `deploy` user. Assumes the static site + cert already exist (the
# earlier golf-setup.sh stage). Creates: golf DB+role, venv, .env, schema,
# systemd service, and the nginx /api proxy.

set -euo pipefail

REPO_DIR="/opt/golf/repo"
ENV_FILE="$REPO_DIR/.env"
DOMAIN="golf.jbohlen.dev"
EMAIL="9d7wt9y959@privaterelay.appleid.com"

if [ "$(id -u)" -ne 0 ]; then echo "Run with sudo/root." >&2; exit 1; fi
if [ ! -d "$REPO_DIR/.git" ]; then
  echo "Clone your repo to $REPO_DIR first (as the deploy user):" >&2
  echo "  sudo -u deploy git clone \$REPO_URL $REPO_DIR" >&2
  exit 1
fi

echo "==> [1/8] Postgres role + database"
# Reuse the DB password from an existing .env, otherwise generate one.
if [ -f "$ENV_FILE" ] && grep -q '^DATABASE_URL=' "$ENV_FILE"; then
  echo "    .env exists — reusing its DATABASE_URL password"
  DB_URL="$(grep '^DATABASE_URL=' "$ENV_FILE" | cut -d= -f2-)"
  GOLFPW="$(echo "$DB_URL" | sed -E 's#.*://golf:([^@]*)@.*#\1#')"
else
  GOLFPW="$(openssl rand -hex 16)"
fi
# Create the role if missing, then set/rotate its password to match .env.
sudo -u postgres psql -v ON_ERROR_STOP=1 -c \
  "DO \$\$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='golf') THEN CREATE ROLE golf LOGIN; END IF; END \$\$;"
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "ALTER ROLE golf LOGIN PASSWORD '${GOLFPW}';"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='golf'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE DATABASE golf OWNER golf"

echo "==> [2/8] .env (secrets)"
if [ ! -f "$ENV_FILE" ]; then
  JWT="$(openssl rand -hex 32)"
  cat > "$ENV_FILE" <<EOF
DATABASE_URL=postgresql+psycopg://golf:${GOLFPW}@localhost:5432/golf
JWT_SECRET=${JWT}
PUBLIC_BASE_URL=https://${DOMAIN}
EOF
  chown deploy:deploy "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  echo "    wrote $ENV_FILE"
else
  echo "    $ENV_FILE already present — left as-is"
fi

echo "==> [3/8] Python venv + deps (as deploy)"
sudo -u deploy bash -lc "cd $REPO_DIR && python3 -m venv api/venv && api/venv/bin/pip install -q --upgrade pip && api/venv/bin/pip install -q -r api/requirements.txt"

echo "==> [4/8] DB migrations (as deploy)"
sudo -u deploy bash -lc "cd $REPO_DIR && PYTHONPATH=. api/venv/bin/alembic -c api/alembic.ini upgrade head"

echo "==> [5/8] Frontend build (as deploy)"
sudo -u deploy bash -lc "cd $REPO_DIR && npm ci && npm run build"

echo "==> [6/8] systemd service"
cp "$REPO_DIR/deploy/golf-api.service" /etc/systemd/system/golf-api.service
systemctl daemon-reload
systemctl enable --now golf-api
sleep 2
systemctl --no-pager --lines=0 status golf-api || true

echo "==> [7/8] nginx /api proxy + repo dist root"
cp "$REPO_DIR/deploy/nginx-golf.conf" /etc/nginx/sites-available/golf
# Re-run certbot so it re-creates the 443 block (with the new locations + root).
certbot --nginx -d "$DOMAIN" -n --agree-tos -m "$EMAIL" --redirect
nginx -t && systemctl reload nginx

echo "==> [8/8] Smoke check"
curl -s -o /dev/null -w "https://$DOMAIN/api/health -> HTTP %{http_code}\n" "https://$DOMAIN/api/health" || true

echo ""
echo "Setup complete. Next:"
echo "  sudo -u deploy bash -lc 'cd $REPO_DIR && PYTHONPATH=. api/venv/bin/python -m api.scripts.create_user --email YOU@example.com --name \"You\" --admin'"
echo "  sudo -u deploy bash -lc 'cd $REPO_DIR && PYTHONPATH=. api/venv/bin/python -m api.scripts.create_user --email author@example.com --name \"rartied\"'"
echo "  sudo -u deploy bash -lc 'cd $REPO_DIR && PYTHONPATH=. api/venv/bin/python -m api.scripts.migrate_supabase --rounds-user author@example.com'"
