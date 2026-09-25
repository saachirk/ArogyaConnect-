from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import init_db
from app.routers import (
    audit,
    auth,
    consultations,
    dashboard,
    facilities,
    followups,
    notifications,
    patients,
    referrals,
    specialists,
    sync,
    triage,
)

settings = get_settings()

app = FastAPI(
    title="ArogyaConnect API",
    description=(
        "SIH 2026 prototype for rural healthcare access (Problem SH26133). "
        "DEMO / SYNTHETIC DATA — NOT FOR CLINICAL USE. "
        "No ABDM/ABHA connectivity is implemented; labels marked Integration Ready are placeholders."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(triage.router)
app.include_router(consultations.router)
app.include_router(referrals.router)
app.include_router(followups.router)
app.include_router(facilities.router)
app.include_router(specialists.router)
app.include_router(sync.router)
app.include_router(dashboard.router)
app.include_router(notifications.router)
app.include_router(audit.router)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/health")
def health():
    return {"status": "ok", "service": "ArogyaConnect", "disclaimer": "DEMO / SYNTHETIC DATA — NOT FOR CLINICAL USE"}
