"""Pytest fixtures. Points the app at a dedicated golf_test database and rebuilds
the schema fresh for each test for isolation.
"""
import os

# Must be set before importing app modules (Settings reads env at import).
os.environ.setdefault(
    "DATABASE_URL", "postgresql+psycopg://golf:golf@localhost:5432/golf_test"
)
os.environ.setdefault("JWT_SECRET", "test-secret")
os.environ.setdefault("PUBLIC_BASE_URL", "http://testserver")

import pytest
from fastapi.testclient import TestClient

from api.auth import hash_password
from api.db import Base, SessionLocal, engine, get_db
from api.main import app
from api.models import User


@pytest.fixture(autouse=True)
def fresh_schema():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db():
    with SessionLocal() as session:
        yield session


@pytest.fixture
def client():
    return TestClient(app)


def _make_user(db, email, password="password123", admin=False, name=None):
    user = User(
        email=email.lower(),
        password_hash=hash_password(password),
        display_name=name,
        is_admin=admin,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def admin(db):
    return _make_user(db, "admin@example.com", admin=True, name="Admin")


@pytest.fixture
def user(db):
    return _make_user(db, "player@example.com", name="Player")


def auth_headers(client, email, password="password123"):
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}
