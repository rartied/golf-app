"""initial schema: users, invites, courses, rounds

Revision ID: 0001_initial
Revises:
Create Date: 2026-06-07
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

UUID = postgresql.UUID(as_uuid=True)
JSONB = postgresql.JSONB(astext_type=sa.Text())


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", UUID, server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("email", sa.String(), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("display_name", sa.String(), nullable=True),
        sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
    )

    op.create_table(
        "invites",
        sa.Column("id", UUID, server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("token", sa.String(), nullable=False, unique=True),
        sa.Column("email", sa.String(), nullable=True),
        sa.Column("created_by", UUID, sa.ForeignKey("users.id"), nullable=True),
        sa.Column("used_by", UUID, sa.ForeignKey("users.id"), nullable=True),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
    )

    op.create_table(
        "courses",
        sa.Column("id", UUID, server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("location", sa.String(), nullable=True),
        sa.Column("tees", JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("holes", JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("created_by", UUID, sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
    )

    op.create_table(
        "rounds",
        sa.Column("id", UUID, server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("user_id", UUID, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("course_id", sa.String(), nullable=True),
        sa.Column("course_name", sa.String(), nullable=True),
        sa.Column("tee_id", sa.String(), nullable=True),
        sa.Column("tee_name", sa.String(), nullable=True),
        sa.Column("course_rating", sa.Numeric(), nullable=True),
        sa.Column("slope", sa.Integer(), nullable=True),
        sa.Column("course_par", sa.Integer(), nullable=True),
        sa.Column("total_score", sa.Integer(), nullable=True),
        sa.Column("adjusted_gross_score", sa.Integer(), nullable=True),
        sa.Column("score_differential", sa.Numeric(), nullable=True),
        sa.Column("hole_scores", JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("holes_played", sa.Integer(), nullable=False, server_default=sa.text("18")),
        sa.Column("nine_hole_type", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
    )
    op.create_index("ix_rounds_user_id", "rounds", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_rounds_user_id", table_name="rounds")
    op.drop_table("rounds")
    op.drop_table("courses")
    op.drop_table("invites")
    op.drop_table("users")
