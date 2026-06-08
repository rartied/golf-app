"""Invite management — admin only. Invites are one-time registration links."""
import secrets

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import require_admin
from ..config import settings
from ..db import get_db
from ..models import Invite, User
from ..schemas import InviteCreatedOut, InviteCreateIn, InviteOut

router = APIRouter(prefix="/api/invites", tags=["invites"])


@router.post("", response_model=InviteCreatedOut)
def create_invite(
    body: InviteCreateIn,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    token = secrets.token_urlsafe(24)
    invite = Invite(
        token=token,
        email=(body.email.strip().lower() if body.email else None),
        created_by=admin.id,
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)

    url = f"{settings.public_base_url.rstrip('/')}/register?invite={token}"
    return InviteCreatedOut(**InviteOut.model_validate(invite).model_dump(), url=url)


@router.get("", response_model=list[InviteOut])
def list_invites(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    invites = db.scalars(select(Invite).order_by(Invite.created_at.desc())).all()
    return [InviteOut.model_validate(i) for i in invites]
