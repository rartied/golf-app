"""Create or update a user account from the command line.

Used to bootstrap the first admin, and to create named accounts (e.g. the
account the migrated rounds attach to). Run from the repo root:

    python -m api.scripts.create_user --email me@example.com --admin
    python -m api.scripts.create_user --email player@example.com --name "Player One"

If --password is omitted you'll be prompted (hidden input). Re-running for an
existing email updates that user's password / name / admin flag (idempotent).
"""
import argparse
import getpass
import sys

from sqlalchemy import select

from api.auth import hash_password
from api.db import SessionLocal
from api.models import User


def main() -> int:
    p = argparse.ArgumentParser(description="Create or update a golf app user")
    p.add_argument("--email", required=True)
    p.add_argument("--password", help="prompted if omitted")
    p.add_argument("--name", dest="display_name", default=None)
    p.add_argument("--admin", action="store_true", help="grant admin")
    args = p.parse_args()

    email = args.email.strip().lower()
    password = args.password or getpass.getpass("Password: ")
    if len(password) < 8:
        print("Password must be at least 8 characters.", file=sys.stderr)
        return 1

    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == email))
        if user is None:
            user = User(email=email)
            db.add(user)
            action = "Created"
        else:
            action = "Updated"
        user.password_hash = hash_password(password)
        if args.display_name is not None:
            user.display_name = args.display_name
        if args.admin:
            user.is_admin = True
        db.commit()
        db.refresh(user)
        print(f"{action} user {user.email} (id={user.id}, admin={user.is_admin})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
