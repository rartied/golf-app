"""Shared course library — any logged-in user can read and edit."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..db import get_db
from ..models import Course, User
from ..schemas import CourseIn, CourseOut

router = APIRouter(prefix="/api/courses", tags=["courses"])


@router.get("", response_model=list[CourseOut])
def list_courses(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    courses = db.scalars(select(Course).order_by(Course.created_at.desc())).all()
    return [CourseOut.model_validate(c) for c in courses]


@router.post("", response_model=CourseOut, status_code=status.HTTP_201_CREATED)
def create_course(
    body: CourseIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    course = Course(
        id=body.id or uuid.uuid4(),
        name=body.name,
        location=body.location,
        tees=body.tees,
        holes=body.holes,
        created_by=user.id,
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return CourseOut.model_validate(course)


@router.put("/{course_id}", response_model=CourseOut)
def update_course(
    course_id: uuid.UUID,
    body: CourseIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    course = db.get(Course, course_id)
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    course.name = body.name
    course.location = body.location
    course.tees = body.tees
    course.holes = body.holes
    db.commit()
    db.refresh(course)
    return CourseOut.model_validate(course)


@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course(
    course_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    course = db.get(Course, course_id)
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    db.delete(course)
    db.commit()
