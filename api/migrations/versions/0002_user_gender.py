"""add users.gender (default tee gender for handicap math)

Revision ID: 0002_user_gender
Revises: 0001_initial
Create Date: 2026-06-07
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002_user_gender"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("gender", sa.String(), nullable=False, server_default=sa.text("'mens'")),
    )


def downgrade() -> None:
    op.drop_column("users", "gender")
