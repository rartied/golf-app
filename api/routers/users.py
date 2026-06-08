"""Read-only roster of app users plus the courses each has played.

This is an invite-only, shared-library app, so any authenticated user may see
the small roster and which courses others have played — it powers the course
ranking's "played by" filter. Only non-sensitive fields are exposed (no email).
"""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..db import get_db
from ..models import Round, User
from ..schemas import UserWithPlaysOut

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=list[UserWithPlaysOut])
def list_users(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    users = db.scalars(select(User)).all()
    rows = db.execute(
        select(Round.user_id, Round.course_id).where(Round.course_id.is_not(None)).distinct()
    ).all()
    played: dict = {}
    for uid, cid in rows:
        played.setdefault(uid, set()).add(cid)
    return [
        UserWithPlaysOut(
            id=u.id,
            display_name=u.display_name,
            gender=u.gender,
            played_course_ids=sorted(played.get(u.id, set())),
        )
        for u in users
    ]
