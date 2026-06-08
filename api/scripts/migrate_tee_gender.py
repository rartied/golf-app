"""One-time migration: classify existing tee rating/slope as women's.

The existing course data was entered for women's tees, so each tee's legacy
single ``rating``/``slope`` is copied into ``womensRating``/``womensSlope``
(only when those gendered fields are not already set). The legacy fields are
left in place for backward compatibility. Idempotent — safe to re-run.

Run from the repo root:

    python -m api.scripts.migrate_tee_gender          # apply
    python -m api.scripts.migrate_tee_gender --dry-run # preview only
"""
import argparse

from sqlalchemy import select
from sqlalchemy.orm.attributes import flag_modified

from api.db import SessionLocal
from api.models import Course


def _blank(v):
    return v is None or v == ""


def main() -> int:
    p = argparse.ArgumentParser(description="Copy legacy tee rating/slope into women's fields")
    p.add_argument("--dry-run", action="store_true", help="report changes without writing")
    args = p.parse_args()

    db = SessionLocal()
    changed_courses = changed_tees = 0
    try:
        for course in db.scalars(select(Course)).all():
            course_touched = False
            for tee in (course.tees or []):
                rating, slope = tee.get("rating"), tee.get("slope")
                touched = False
                if _blank(tee.get("womensRating")) and not _blank(rating):
                    tee["womensRating"] = rating
                    touched = True
                if _blank(tee.get("womensSlope")) and not _blank(slope):
                    tee["womensSlope"] = slope
                    touched = True
                # Normalise missing keys so the shape is consistent going forward.
                tee.setdefault("mensRating", None)
                tee.setdefault("mensSlope", None)
                tee.setdefault("womensRating", None)
                tee.setdefault("womensSlope", None)
                tee.setdefault("color2", tee.get("color2"))
                if touched:
                    changed_tees += 1
                    course_touched = True
            if course_touched:
                changed_courses += 1
                if not args.dry_run:
                    flag_modified(course, "tees")
        if args.dry_run:
            db.rollback()
            print(f"[dry-run] would update {changed_tees} tee(s) across {changed_courses} course(s)")
        else:
            db.commit()
            print(f"Updated {changed_tees} tee(s) across {changed_courses} course(s)")
    finally:
        db.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
