from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user, require_roles
from app.database import get_db
from app.models import (
    Consultation,
    Facility,
    Followup,
    FollowupStatus,
    Patient,
    Referral,
    ReferralStatus,
    SyncOperation,
    SyncStatus,
    User,
    UserRole,
)
from app.schemas import AdminDashboard, AttentionItem, DoctorDashboard, FrontlineDashboard
from app.services.queue import ACTIVE_QUEUE

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/frontline", response_model=FrontlineDashboard)
def frontline(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    today = datetime.utcnow().date()
    start = datetime(today.year, today.month, today.day)
    todays_patients = db.query(func.count(Patient.id)).filter(Patient.created_at >= start).scalar() or 0
    waiting = db.query(func.count(Consultation.id)).filter(Consultation.status.in_(ACTIVE_QUEUE)).scalar() or 0
    active_ref = (
        db.query(func.count(Referral.id))
        .filter(Referral.status.notin_([ReferralStatus.COMPLETED.value, ReferralStatus.RE_REFERRED.value]))
        .scalar()
        or 0
    )
    follow_due = (
        db.query(func.count(Followup.id))
        .filter(Followup.status.in_([FollowupStatus.DUE.value, FollowupStatus.OVERDUE.value]))
        .scalar()
        or 0
    )
    pending_sync = (
        db.query(func.count(SyncOperation.id))
        .filter(SyncOperation.user_id == user.id, SyncOperation.status == SyncStatus.PENDING.value)
        .scalar()
        or 0
    )
    return FrontlineDashboard(
        todays_patients=int(todays_patients),
        waiting_consultations=int(waiting),
        active_referrals=int(active_ref),
        followups_due=int(follow_due),
        offline_pending_sync=int(pending_sync),
    )


@router.get("/doctor", response_model=DoctorDashboard)
def doctor(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    q = db.query(func.count(Consultation.id)).filter(
        Consultation.doctor_id == user.id, Consultation.status.in_(ACTIVE_QUEUE)
    )
    incoming = db.query(func.count(Referral.id)).filter(
        Referral.specialist_id == user.id,
        Referral.status.in_([ReferralStatus.CREATED.value, ReferralStatus.ACCEPTED.value]),
    )
    fu = db.query(func.count(Followup.id)).filter(Followup.status != FollowupStatus.COMPLETED.value)
    inp = db.query(func.count(Consultation.id)).filter(
        Consultation.doctor_id == user.id, Consultation.status == "IN_PROGRESS"
    )
    return DoctorDashboard(
        current_queue=int(q.scalar() or 0),
        incoming_referrals=int(incoming.scalar() or 0),
        followups=int(fu.scalar() or 0),
        in_progress=int(inp.scalar() or 0),
    )


@router.get("/admin", response_model=AdminDashboard)
def admin(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN.value)),
):
    today = datetime.utcnow().date()
    start = datetime(today.year, today.month, today.day)
    total_patients = int(db.query(func.count(Patient.id)).scalar() or 0)
    todays = int(db.query(func.count(Consultation.id)).filter(Consultation.created_at >= start).scalar() or 0)
    active_ref = int(
        db.query(func.count(Referral.id))
        .filter(Referral.status.notin_([ReferralStatus.COMPLETED.value, ReferralStatus.RE_REFERRED.value]))
        .scalar()
        or 0
    )
    completed_ref = int(
        db.query(func.count(Referral.id)).filter(Referral.status == ReferralStatus.COMPLETED.value).scalar() or 0
    )
    waits = [
        w[0]
        for w in db.query(Consultation.estimated_wait_minutes)
        .filter(Consultation.status.in_(ACTIVE_QUEUE))
        .all()
        if w[0] is not None
    ]
    avg_wait = float(sum(waits) / len(waits)) if waits else 0.0
    overdue = int(db.query(func.count(Followup.id)).filter(Followup.status == FollowupStatus.OVERDUE.value).scalar() or 0)
    pending_sync = int(
        db.query(func.count(SyncOperation.id)).filter(SyncOperation.status == SyncStatus.PENDING.value).scalar() or 0
    )

    day_rows = []
    for i in range(6, -1, -1):
        d0 = start - timedelta(days=i)
        d1 = d0 + timedelta(days=1)
        n = int(db.query(func.count(Consultation.id)).filter(Consultation.created_at >= d0, Consultation.created_at < d1).scalar() or 0)
        day_rows.append({"date": d0.date().isoformat(), "count": n})

    ref_status = (
        db.query(Referral.status, func.count(Referral.id)).group_by(Referral.status).all()
    )
    load = (
        db.query(Facility.name, func.count(Consultation.id))
        .join(Consultation, Consultation.facility_id == Facility.id)
        .group_by(Facility.name)
        .all()
    )
    util = (
        db.query(User.name, func.count(Consultation.id))
        .join(Consultation, Consultation.doctor_id == User.id)
        .filter(User.role == UserRole.DOCTOR.value)
        .group_by(User.name)
        .all()
    )
    conn = (
        db.query(Facility.connectivity_status, func.count(Facility.id))
        .group_by(Facility.connectivity_status)
        .all()
    )
    return AdminDashboard(
        total_patients=total_patients,
        todays_consultations=todays,
        active_referrals=active_ref,
        completed_referrals=completed_ref,
        average_waiting_time=round(avg_wait, 1),
        overdue_followups=overdue,
        pending_sync_operations=pending_sync,
        consultations_by_day=day_rows,
        referrals_by_status=[{"status": s, "count": int(c)} for s, c in ref_status],
        patient_load_by_facility=[{"facility": n, "count": int(c)} for n, c in load],
        specialist_utilization=[{"doctor": n, "count": int(c)} for n, c in util],
        connectivity_interruptions=[{"status": s, "count": int(c)} for s, c in conn],
        waiting_time_series=day_rows,
    )


@router.get("/attention", response_model=list[AttentionItem])
def attention(
    district: str | None = None,
    facility_id: int | None = None,
    specialist_id: int | None = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN.value)),
):
    items: list[AttentionItem] = []
    cutoff = datetime.utcnow() - timedelta(hours=48)
    refs = db.query(Referral).filter(
        Referral.status.in_([ReferralStatus.CREATED.value, ReferralStatus.ACCEPTED.value]),
        Referral.created_at < cutoff,
    )
    if facility_id:
        refs = refs.filter((Referral.from_facility_id == facility_id) | (Referral.to_facility_id == facility_id))
    if specialist_id:
        refs = refs.filter(Referral.specialist_id == specialist_id)
    for r in refs.limit(50).all():
        fac = db.get(Facility, r.from_facility_id)
        if district and fac and fac.district.lower() != district.lower():
            continue
        items.append(
            AttentionItem(
                kind="STALE_REFERRAL",
                title="Referral pending > 48 hours",
                detail=f"Referral #{r.id} still {r.status}",
                entity_type="referral",
                entity_id=str(r.id),
                district=fac.district if fac else None,
                facility_id=r.from_facility_id,
                severity="HIGH",
            )
        )
    for f in db.query(Followup).filter(Followup.status == FollowupStatus.OVERDUE.value).limit(50).all():
        items.append(
            AttentionItem(
                kind="OVERDUE_FOLLOWUP",
                title="Overdue follow-up",
                detail=f"Follow-up #{f.id} due {f.due_date.date().isoformat()}",
                entity_type="followup",
                entity_id=str(f.id),
                facility_id=None,
                severity="HIGH",
            )
        )
    for fac in db.query(Facility).filter(Facility.connectivity_status.in_(["OFFLINE", "DEGRADED"])).all():
        if district and fac.district.lower() != district.lower():
            continue
        items.append(
            AttentionItem(
                kind="CONNECTIVITY",
                title="Facility with poor connectivity",
                detail=f"{fac.name}: {fac.connectivity_status}",
                entity_type="facility",
                entity_id=str(fac.id),
                district=fac.district,
                facility_id=fac.id,
                severity="MEDIUM",
            )
        )
    for fac in db.query(Facility).all():
        qlen = db.query(func.count(Consultation.id)).filter(
            Consultation.facility_id == fac.id, Consultation.status.in_(ACTIVE_QUEUE)
        ).scalar() or 0
        if int(qlen) >= 8:
            items.append(
                AttentionItem(
                    kind="LARGE_QUEUE",
                    title="Large consultation queue",
                    detail=f"{fac.name} has {int(qlen)} waiting consultations",
                    entity_type="facility",
                    entity_id=str(fac.id),
                    district=fac.district,
                    facility_id=fac.id,
                    severity="MEDIUM",
                )
            )
    return items
