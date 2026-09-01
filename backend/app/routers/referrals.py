from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user, require_roles
from app.database import get_db
from app.models import Followup, FollowupStatus, Patient, Referral, ReferralStatus, User, UserRole
from app.schemas import ReferralCreate, ReferralOut, StatusUpdate
from app.utils.activity import audit, notify

router = APIRouter(prefix="/api/referrals", tags=["Referrals"])

FORWARD = {
    ReferralStatus.CREATED.value: ReferralStatus.ACCEPTED.value,
    ReferralStatus.ACCEPTED.value: ReferralStatus.SCHEDULED.value,
    ReferralStatus.SCHEDULED.value: ReferralStatus.CONSULTED.value,
    ReferralStatus.CONSULTED.value: ReferralStatus.FOLLOW_UP_DUE.value,
    ReferralStatus.FOLLOW_UP_DUE.value: ReferralStatus.COMPLETED.value,
}


def _out(r: Referral, db: Session) -> ReferralOut:
    p = db.get(Patient, r.patient_id)
    data = ReferralOut.model_validate(r)
    data.patient_name = p.name if p else None
    return data


@router.post("", response_model=ReferralOut, status_code=201)
def create_referral(
    body: ReferralCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    patient = db.get(Patient, body.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    r = Referral(
        patient_id=patient.id,
        from_facility_id=body.from_facility_id or user.facility_id or 1,
        to_facility_id=body.to_facility_id,
        referred_by=user.id,
        specialist_id=body.specialist_id,
        reason=body.reason,
        priority=body.priority,
        status=ReferralStatus.CREATED.value,
        consultation_id=body.consultation_id,
        created_at=datetime.utcnow(),
    )
    db.add(r)
    db.flush()
    audit(db, user, "Referral created", "referral", str(r.id), body.reason[:80])
    if r.specialist_id:
        notify(db, r.specialist_id, "New referral received", r.reason, "REFERRAL")
    db.commit()
    db.refresh(r)
    return _out(r, db)


@router.get("", response_model=list[ReferralOut])
def list_referrals(
    status_filter: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(Referral)
    if user.role == UserRole.DOCTOR.value:
        q = q.filter((Referral.specialist_id == user.id) | (Referral.referred_by == user.id))
    if status_filter:
        q = q.filter(Referral.status == status_filter)
    rows = q.order_by(Referral.created_at.desc()).limit(200).all()
    return [_out(r, db) for r in rows]


@router.get("/{referral_id}")
def get_referral(referral_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    r = db.get(Referral, referral_id)
    if not r:
        raise HTTPException(status_code=404, detail="Referral not found")
    timeline = [
        {"status": ReferralStatus.CREATED.value, "at": r.created_at.isoformat()},
        {"status": ReferralStatus.ACCEPTED.value, "at": r.accepted_at.isoformat() if r.accepted_at else None},
        {"status": ReferralStatus.SCHEDULED.value, "at": None},
        {"status": ReferralStatus.CONSULTED.value, "at": None},
        {"status": ReferralStatus.FOLLOW_UP_DUE.value, "at": None},
        {"status": ReferralStatus.COMPLETED.value, "at": r.completed_at.isoformat() if r.completed_at else None},
    ]
    return {"referral": _out(r, db).model_dump(), "timeline": timeline, "current": r.status}


@router.put("/{referral_id}/status", response_model=ReferralOut)
def update_referral_status(
    referral_id: int,
    body: StatusUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    r = db.get(Referral, referral_id)
    if not r:
        raise HTTPException(status_code=404, detail="Referral not found")
    allowed = {s.value for s in ReferralStatus}
    if body.status not in allowed:
        raise HTTPException(status_code=400, detail="Invalid status")
    r.status = body.status
    now = datetime.utcnow()
    if body.status == ReferralStatus.ACCEPTED.value:
        r.accepted_at = now
        notify(db, r.referred_by, "Referral accepted by General Medicine.", f"Referral #{r.id} accepted.", "REFERRAL")
    if body.status == ReferralStatus.COMPLETED.value:
        r.completed_at = now
    if body.status == ReferralStatus.CONSULTED.value:
        r.status = ReferralStatus.FOLLOW_UP_DUE.value
        fu = Followup(
            patient_id=r.patient_id,
            referral_id=r.id,
            assigned_worker_id=None,
            due_date=now + timedelta(days=3),
            status=FollowupStatus.DUE.value,
            notes="Auto-created after consulted referral",
            created_at=now,
        )
        db.add(fu)
        notify(db, r.referred_by, "Follow-up due soon", f"Follow-up scheduled after referral #{r.id}", "FOLLOWUP")
    audit(db, user, "Referral status changed", "referral", str(r.id), body.status)
    db.commit()
    db.refresh(r)
    return _out(r, db)


@router.post("/{referral_id}/re-refer", response_model=ReferralOut, status_code=201)
def re_refer(
    referral_id: int,
    body: ReferralCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    original = db.get(Referral, referral_id)
    if not original:
        raise HTTPException(status_code=404, detail="Referral not found")
    original.status = ReferralStatus.RE_REFERRED.value
    new = Referral(
        patient_id=original.patient_id,
        from_facility_id=body.from_facility_id or original.to_facility_id,
        to_facility_id=body.to_facility_id,
        referred_by=user.id,
        specialist_id=body.specialist_id,
        reason=body.reason or f"Re-referred from #{original.id}",
        priority=body.priority,
        status=ReferralStatus.CREATED.value,
        created_at=datetime.utcnow(),
    )
    db.add(new)
    db.flush()
    audit(db, user, "Referral created", "referral", str(new.id), "re-refer")
    db.commit()
    db.refresh(new)
    return _out(new, db)
