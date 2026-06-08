"""Pydantic request/response models.

Rounds use snake_case to match the frontend's existing rowToRound/roundToRow
mapping in src/hooks/useAppData.js. Courses are passed through as-is.
"""
import uuid
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# ─── Auth / users ────────────────────────────────────────────────────────────
class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    email: str
    display_name: str | None = None
    gender: str = "mens"
    is_admin: bool


class UserUpdateIn(BaseModel):
    display_name: str | None = None
    gender: str | None = None  # 'mens' | 'womens'


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class RegisterIn(BaseModel):
    token: str
    email: EmailStr
    password: str = Field(min_length=8)
    display_name: str | None = None


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ─── Invites ─────────────────────────────────────────────────────────────────
class InviteCreateIn(BaseModel):
    email: EmailStr | None = None


class InviteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    token: str
    email: str | None = None
    used_by: uuid.UUID | None = None
    used_at: datetime | None = None
    created_at: datetime


class InviteCreatedOut(InviteOut):
    url: str


# ─── Courses (shared; pass-through shape) ─────────────────────────────────────
class CourseIn(BaseModel):
    id: uuid.UUID | None = None
    name: str
    location: str | None = None
    tees: list[Any] = []
    holes: list[Any] = []


class CourseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    location: str | None = None
    tees: list[Any] = []
    holes: list[Any] = []
    created_at: datetime


# ─── Rounds (per-user; snake_case to match frontend) ─────────────────────────
class RoundIn(BaseModel):
    id: uuid.UUID | None = None
    date: date
    course_id: str | None = None
    course_name: str | None = None
    tee_id: str | None = None
    tee_name: str | None = None
    course_rating: float | None = None
    slope: int | None = None
    course_par: int | None = None
    total_score: int | None = None
    adjusted_gross_score: int | None = None
    score_differential: float | None = None
    hole_scores: list[Any] = []
    holes_played: int = 18
    nine_hole_type: str | None = None


class RoundOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    date: date
    course_id: str | None = None
    course_name: str | None = None
    tee_id: str | None = None
    tee_name: str | None = None
    course_rating: float | None = None
    slope: int | None = None
    course_par: int | None = None
    total_score: int | None = None
    adjusted_gross_score: int | None = None
    score_differential: float | None = None
    hole_scores: list[Any] = []
    holes_played: int = 18
    nine_hole_type: str | None = None
