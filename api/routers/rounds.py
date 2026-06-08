"""Per-user rounds — every operation is scoped to the current user."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..db import get_db
from ..models import Round, User
from ..schemas import RoundIn, RoundOut

router = APIRouter(prefix="/api/rounds", tags=["rounds"])

_FIELDS = (
    "date", "course_id", "course_name", "tee_id", "tee_name", "course_rating",
    "slope", "course_par", "total_score", "adjusted_gross_score",
    "score_differential", "hole_scores", "holes_played", "nine_hole_type",
)


def _owned(db: Session, round_id: uuid.UUID, user: User) -> Round:
    rnd = db.get(Round, round_id)
    if rnd is None or rnd.user_id != user.id:
        # Same 404 whether missing or not yours — don't leak existence.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Round not found")
    return rnd


@router.get("", response_model=list[RoundOut])
def list_rounds(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rounds = db.scalars(
        select(Round).where(Round.user_id == user.id).order_by(Round.date.desc())
    ).all()
    return [RoundOut.model_validate(r) for r in rounds]


@router.post("", response_model=RoundOut, status_code=status.HTTP_201_CREATED)
def create_round(
    body: RoundIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    rnd = Round(id=body.id or uuid.uuid4(), user_id=user.id,
                **{f: getattr(body, f) for f in _FIELDS})
    db.add(rnd)
    db.commit()
    db.refresh(rnd)
    return RoundOut.model_validate(rnd)


@router.put("/{round_id}", response_model=RoundOut)
def update_round(
    round_id: uuid.UUID,
    body: RoundIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rnd = _owned(db, round_id, user)
    for f in _FIELDS:
        setattr(rnd, f, getattr(body, f))
    db.commit()
    db.refresh(rnd)
    return RoundOut.model_validate(rnd)


@router.delete("/{round_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_round(
    round_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rnd = _owned(db, round_id, user)
    db.delete(rnd)
    db.commit()
