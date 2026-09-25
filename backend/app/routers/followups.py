from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.database import get_db
from app.models import Followup, FollowupStatus, Patient, User
from app.schemas import FollowupCreate, FollowupOut, FollowupUpdate
from app.utils.activity import audit

router = APIRouter(prefix="/api/followups", tags=["Follow-ups"])


def _refresh_overdue(db: Session) -> None:
    now = datetime.utcnow()
    due = db.query(Followup).filter(Followup.status == FollowupStatus.DUE.value, Followup.due_date < now).all()
    for f in due:
        f.status = FollowupStatus.OVERDUE.value


def _out(f: Followup, db: Session) -> FollowupOut:
    p = db.get(Patient, f.patient_id)
    data = FollowupOut.model_validate(f)
    data.patient_name = p.name if p else None
    return data


@router.post("", response_model=FollowupOut, status_code=201)
def create_followup(
    body: FollowupCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    f = Followup(
        patient_id=body.patient_id,
        referral_id=body.referral_id,
        assigned_worker_id=body.assigned_worker_id or user.id,
        due_date=body.due_date,
        status=FollowupStatus.DUE.value,
        notes=body.notes,
        created_at=datetime.utcnow(),
    )
    db.add(f)
    db.commit()
    db.refresh(f)
    return _out(f, db)


@router.get("", response_model=list[FollowupOut])
def list_followups(
    bucket: str | None = Query(None, description="today | overdue | upcoming | all"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _refresh_overdue(db)
    db.commit()
    q = db.query(Followup)
    now = datetime.utcnow()
    start = datetime(now.year, now.month, now.day)
    end = start.replace(hour=23, minute=59, second=59)
    if bucket == "today":
        q = q.filter(Followup.due_date >= start, Followup.due_date <= end, Followup.status != FollowupStatus.COMPLETED.value)
    elif bucket == "overdue":
        q = q.filter(Followup.status == FollowupStatus.OVERDUE.value)
    elif bucket == "upcoming":
        q = q.filter(Followup.due_date > end, Followup.status != FollowupStatus.COMPLETED.value)
    rows = q.order_by(Followup.due_date.asc()).limit(200).all()
    return [_out(f, db) for f in rows]


@router.put("/{followup_id}", response_model=FollowupOut)
def update_followup(
    followup_id: int,
    body: FollowupUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    f = db.get(Followup, followup_id)
    if not f:
        raise HTTPException(status_code=404, detail="Follow-up not found")
    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(f, k, v)
    if body.status == FollowupStatus.COMPLETED.value:
        f.completed_at = datetime.utcnow()
        audit(db, user, "Follow-up completed", "followup", str(f.id))
    db.commit()
    db.refresh(f)
    return _out(f, db)
