"""End-to-end API tests for auth, invites, course sharing, and round ownership."""
from api.tests.conftest import auth_headers

ROUND_BODY = {
    "date": "2026-05-01",
    "course_name": "Test GC",
    "tee_name": "Blue",
    "course_rating": 71.9,
    "slope": 131,
    "course_par": 72,
    "total_score": 85,
    "adjusted_gross_score": 83,
    "score_differential": 11.4,
    "hole_scores": [{"number": 1, "par": 4, "strokeIndex": 7, "score": 5}],
    "holes_played": 18,
    "nine_hole_type": None,
}


# ─── Auth ────────────────────────────────────────────────────────────────────
def test_login_success_and_me(client, user):
    h = auth_headers(client, "player@example.com")
    me = client.get("/api/auth/me", headers=h)
    assert me.status_code == 200
    assert me.json()["email"] == "player@example.com"
    assert me.json()["is_admin"] is False
    assert me.json()["gender"] == "mens"  # default


def test_update_profile_gender(client, user):
    h = auth_headers(client, "player@example.com")
    r = client.put("/api/auth/me", json={"gender": "womens"}, headers=h)
    assert r.status_code == 200, r.text
    assert r.json()["gender"] == "womens"
    # persisted
    assert client.get("/api/auth/me", headers=h).json()["gender"] == "womens"


def test_update_profile_rejects_bad_gender(client, user):
    h = auth_headers(client, "player@example.com")
    r = client.put("/api/auth/me", json={"gender": "other"}, headers=h)
    assert r.status_code == 422


def test_login_wrong_password(client, user):
    r = client.post("/api/auth/login", json={"email": "player@example.com", "password": "nope"})
    assert r.status_code == 401


def test_me_requires_auth(client):
    assert client.get("/api/auth/me").status_code == 401


# ─── Invites + registration ──────────────────────────────────────────────────
def test_admin_creates_invite_and_user_registers(client, admin):
    ah = auth_headers(client, "admin@example.com")
    inv = client.post("/api/invites", json={}, headers=ah)
    assert inv.status_code == 200
    token = inv.json()["token"]
    assert inv.json()["url"].endswith(f"/register?invite={token}")

    reg = client.post("/api/auth/register", json={
        "token": token, "email": "newbie@example.com",
        "password": "password123", "display_name": "Newbie",
    })
    assert reg.status_code == 200
    assert reg.json()["user"]["email"] == "newbie@example.com"
    assert reg.json()["user"]["is_admin"] is False
    # login works afterward
    assert auth_headers(client, "newbie@example.com")


def test_invite_is_single_use(client, admin):
    ah = auth_headers(client, "admin@example.com")
    token = client.post("/api/invites", json={}, headers=ah).json()["token"]
    first = client.post("/api/auth/register", json={
        "token": token, "email": "a@example.com", "password": "password123"})
    assert first.status_code == 200
    second = client.post("/api/auth/register", json={
        "token": token, "email": "b@example.com", "password": "password123"})
    assert second.status_code == 400


def test_register_rejects_bad_token(client):
    r = client.post("/api/auth/register", json={
        "token": "garbage", "email": "x@example.com", "password": "password123"})
    assert r.status_code == 400


def test_non_admin_cannot_create_invite(client, user):
    h = auth_headers(client, "player@example.com")
    assert client.post("/api/invites", json={}, headers=h).status_code == 403


# ─── Courses (shared) ────────────────────────────────────────────────────────
def test_courses_are_shared_across_users(client, admin, user):
    ah = auth_headers(client, "admin@example.com")
    ph = auth_headers(client, "player@example.com")
    created = client.post("/api/courses", headers=ah, json={
        "name": "Shared Links", "location": "Somewhere",
        "tees": [{"id": "t1", "color": "Blue", "rating": 71.9, "slope": 131, "par": 72}],
        "holes": [{"number": 1, "par": 4, "strokeIndex": 1}],
    })
    assert created.status_code == 201
    # the other user sees it
    listed = client.get("/api/courses", headers=ph)
    assert listed.status_code == 200
    assert any(c["name"] == "Shared Links" for c in listed.json())


def test_courses_require_auth(client):
    assert client.get("/api/courses").status_code == 401


# ─── Rounds (per-user ownership) ─────────────────────────────────────────────
def test_round_crud_and_scoping(client, admin, user):
    ph = auth_headers(client, "player@example.com")
    ah = auth_headers(client, "admin@example.com")

    created = client.post("/api/rounds", headers=ph, json=ROUND_BODY)
    assert created.status_code == 201
    rid = created.json()["id"]
    assert created.json()["total_score"] == 85

    # owner sees it; other user does not
    assert len(client.get("/api/rounds", headers=ph).json()) == 1
    assert len(client.get("/api/rounds", headers=ah).json()) == 0

    # other user cannot update or delete it (404, no existence leak)
    assert client.put(f"/api/rounds/{rid}", headers=ah, json=ROUND_BODY).status_code == 404
    assert client.delete(f"/api/rounds/{rid}", headers=ah).status_code == 404

    # owner can update + delete
    upd = dict(ROUND_BODY, total_score=80)
    assert client.put(f"/api/rounds/{rid}", headers=ph, json=upd).json()["total_score"] == 80
    assert client.delete(f"/api/rounds/{rid}", headers=ph).status_code == 204
    assert len(client.get("/api/rounds", headers=ph).json()) == 0


def test_rounds_require_auth(client):
    assert client.get("/api/rounds").status_code == 401
