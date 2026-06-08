"""FastAPI entrypoint for the golf app.

Same-origin in production (nginx serves the SPA and proxies /api to here), so
no CORS is needed. A permissive CORS allowance for localhost is enabled only to
support the Vite dev server when not using its proxy.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import auth, courses, invites, rounds

app = FastAPI(title="Golf Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(invites.router)
app.include_router(courses.router)
app.include_router(rounds.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
