"""One-time migration from the original author's shared Supabase project.

Pulls the shared course library (14 courses) into golf.courses, and the author's
rounds (25) into golf.rounds attached to a named user account you specify.

Idempotent: rows are upserted by primary key, so re-running is safe.

Run from the repo root, after `alembic upgrade head` and after creating the
target user (api.scripts.create_user):

    python -m api.scripts.migrate_supabase --rounds-user player@example.com

Use --no-rounds to import only courses.
"""
import argparse
import sys

import httpx
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from api.db import SessionLocal
from api.models import Course, Round, User

SUPABASE_URL = "https://nqqzngabmuiyfkapfryt.supabase.co"
# Anon key committed in the source repo (scripts/recalculate-differentials.mjs);
# courses/rounds are public-read by the app's design.
SUPABASE_ANON_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xcXpuZ2FibXVpeWZrYXBmcnl0Iiwicm9sZSI6"
    "ImFub24iLCJpYXQiOjE3Nzc1NjM5OTUsImV4cCI6MjA5MzEzOTk5NX0."
    "zdtNaJT92j8ICNd74abUprOXSsYMidWSDE-j_BsvfUE"
)

ROUND_COLS = (
    "id", "date", "course_id", "course_name", "tee_id", "tee_name",
    "course_rating", "slope", "course_par", "total_score",
    "adjusted_gross_score", "score_differential", "hole_scores",
    "holes_played", "nine_hole_type",
)


def _fetch(table: str) -> list[dict]:
    headers = {"apikey": SUPABASE_ANON_KEY, "Authorization": f"Bearer {SUPABASE_ANON_KEY}"}
    r = httpx.get(
        f"{SUPABASE_URL}/rest/v1/{table}",
        params={"select": "*"},
        headers=headers,
        timeout=30,
    )
    r.raise_for_status()
    return r.json()


def migrate_courses(db) -> int:
    rows = _fetch("courses")
    for c in rows:
        stmt = pg_insert(Course).values(
            id=c["id"],
            name=c["name"],
            location=c.get("location"),
            tees=c.get("tees") or [],
            holes=c.get("holes") or [],
        )
        # Don't clobber locally-edited courses; only insert if new.
        stmt = stmt.on_conflict_do_nothing(index_elements=["id"])
        db.execute(stmt)
    db.commit()
    return len(rows)


def migrate_rounds(db, user_id) -> int:
    rows = _fetch("rounds")
    for r in rows:
        values = {col: r.get(col) for col in ROUND_COLS}
        values["hole_scores"] = r.get("hole_scores") or []
        values["holes_played"] = r.get("holes_played") or 18
        values["user_id"] = user_id
        stmt = pg_insert(Round).values(**values).on_conflict_do_nothing(index_elements=["id"])
        db.execute(stmt)
    db.commit()
    return len(rows)


def main() -> int:
    p = argparse.ArgumentParser(description="Migrate data from shared Supabase")
    p.add_argument("--rounds-user", help="email of the account the rounds attach to")
    p.add_argument("--no-rounds", action="store_true", help="import courses only")
    args = p.parse_args()

    with SessionLocal() as db:
        n_courses = migrate_courses(db)
        print(f"Courses: imported up to {n_courses} (existing skipped).")

        if args.no_rounds:
            print("Skipping rounds (--no-rounds).")
            return 0

        if not args.rounds_user:
            print("ERROR: --rounds-user is required (or pass --no-rounds).", file=sys.stderr)
            return 1
        email = args.rounds_user.strip().lower()
        user = db.scalar(select(User).where(User.email == email))
        if user is None:
            print(
                f"ERROR: no user with email {email}. Create it first:\n"
                f"  python -m api.scripts.create_user --email {email} --name '...'",
                file=sys.stderr,
            )
            return 1
        n_rounds = migrate_rounds(db, user.id)
        print(f"Rounds: imported up to {n_rounds} (existing skipped) → {email}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
