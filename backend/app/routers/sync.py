from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.database import get_db
from app.models import (
    ClinicalRecord,
    Consultation,
    Followup,
    FollowupStatus,
    Patient,
    Referral,
    ReferralStatus,
    SyncOperation,
    SyncStatus,
    User,
)
from app.schemas import SyncOperationOut, SyncRequest, SyncResultItem
from app.services.queue import estimated_wait, next_token, pick_least_loaded_doctor
from app.services.triage import compute_triage_level, priority_from_triage
from app.utils.activity import audit, notify

router = APIRouter(prefix="/api/sync", tags=["Sync"])


def _apply(db: Session, user: User, op_type: str, entity_type: str, payload: dict) -> str:
    et = entity_type.lower()
    ot = op_type.upper()
    if et == "patient" and ot in ("CREATE", "UPSERT"):
        if payload.get("client_id"):
            existing = db.query(Patient).filter(Patient.client_id == payload["client_id"]).first()
            if existing:
                return str(existing.id)
        p = Patient(
            health_id=payload.get("health_id") or f"SS-ABHA-OFF-{int(datetime.utcnow().timestamp())}",
            name=payload["name"],
            age=int(payload["age"]),
            gender=payload.get("gender", "OTHER"),
            phone=payload["phone"],
            village=payload.get("village", ""),
            district=payload.get("district", ""),
            state=payload.get("state", "Karnataka"),
            preferred_language=payload.get("preferred_language", "en"),
            migrant_status=bool(payload.get("migrant_status", False)),
            registered_facility_id=payload.get("registered_facility_id") or user.facility_id,
            client_id=payload.get("client_id"),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(p)
        db.flush()
        audit(db, user, "Patient created", "patient", str(p.id), "offline-sync")
        return str(p.id)
    if et == "triage" and ot in ("CREATE", "UPSERT"):
        level = compute_triage_level(
            temperature=payload.get("temperature"),
            systolic_bp=payload.get("systolic_bp"),
            pulse=payload.get("pulse"),
            spo2=payload.get("spo2"),
            red_flag_symptoms=payload.get("red_flag_symptoms", ""),
            existing_conditions=payload.get("existing_conditions", ""),
        )
        rec = ClinicalRecord(
            patient_id=int(payload["patient_id"]),
            worker_id=user.id,
            chief_complaint=payload.get("chief_complaint", "Offline triage"),
            symptoms=payload.get("symptoms", ""),
            duration=payload.get("duration", ""),
            temperature=payload.get("temperature"),
            systolic_bp=payload.get("systolic_bp"),
            diastolic_bp=payload.get("diastolic_bp"),
            pulse=payload.get("pulse"),
            spo2=payload.get("spo2"),
            existing_conditions=payload.get("existing_conditions", ""),
            current_medications=payload.get("current_medications", ""),
            red_flag_symptoms=payload.get("red_flag_symptoms", ""),
            triage_level=level,
            notes=payload.get("notes", "Synced from offline store"),
            created_at=datetime.utcnow(),
        )
        db.add(rec)
        db.flush()
        return str(rec.id)
    if et == "referral" and ot in ("CREATE", "UPSERT"):
        r = Referral(
            patient_id=int(payload["patient_id"]),
            from_facility_id=int(payload.get("from_facility_id") or user.facility_id or 1),
            to_facility_id=int(payload["to_facility_id"]),
            referred_by=user.id,
            specialist_id=payload.get("specialist_id"),
            reason=payload.get("reason", "Offline referral"),
            priority=payload.get("priority", "HIGH"),
            status=ReferralStatus.CREATED.value,
            created_at=datetime.utcnow(),
        )
        db.add(r)
        db.flush()
        return str(r.id)
    if et == "followup" and ot in ("UPDATE", "UPSERT", "CREATE"):
        if payload.get("id"):
            f = db.get(Followup, int(payload["id"]))
            if f:
                if payload.get("status"):
                    f.status = payload["status"]
                if payload.get("notes") is not None:
                    f.notes = payload["notes"]
                if f.status == FollowupStatus.COMPLETED.value:
                    f.completed_at = datetime.utcnow()
                return str(f.id)
        f = Followup(
            patient_id=int(payload["patient_id"]),
            referral_id=payload.get("referral_id"),
            assigned_worker_id=user.id,
            due_date=datetime.fromisoformat(payload["due_date"].replace("Z", "")) if payload.get("due_date") else datetime.utcnow(),
            status=payload.get("status", FollowupStatus.DUE.value),
            notes=payload.get("notes", ""),
            created_at=datetime.utcnow(),
        )
        db.add(f)
        db.flush()
        return str(f.id)
    if et == "consultation" and ot in ("CREATE", "UPSERT"):
        doctor = pick_least_loaded_doctor(db)
        c = Consultation(
            patient_id=int(payload["patient_id"]),
            doctor_id=doctor.id if doctor else None,
            frontline_worker_id=user.id,
            facility_id=int(payload.get("facility_id") or user.facility_id or 1),
            token_number=next_token(db, user.facility_id or 1),
            priority=payload.get("priority") or priority_from_triage(payload.get("triage_level", "GREEN")),
            status="WAITING",
            estimated_wait_minutes=estimated_wait(0, payload.get("priority", "ROUTINE")),
            specialist_type=payload.get("specialist_type", "General Medicine"),
            client_id=payload.get("client_id"),
            created_at=datetime.utcnow(),
        )
        db.add(c)
        db.flush()
        return str(c.id)
    raise ValueError(f"Unsupported operation {op_type} {entity_type}")


@router.post("", response_model=list[SyncResultItem])
def sync_operations(
    body: SyncRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    results: list[SyncResultItem] = []
    synced = 0
    for item in body.operations:
        existing = db.query(SyncOperation).filter(SyncOperation.idempotency_key == item.idempotency_key).first()
        if existing and existing.status == SyncStatus.SYNCED.value:
            results.append(
                SyncResultItem(
                    idempotency_key=item.idempotency_key,
                    status="SYNCED",
                    entity_id=existing.entity_id,
                )
            )
            continue
        row = existing or SyncOperation(
            user_id=user.id,
            operation_type=item.operation_type,
            entity_type=item.entity_type,
            payload=item.payload,
            status=SyncStatus.PENDING.value,
            idempotency_key=item.idempotency_key,
            created_at=datetime.utcnow(),
        )
        if not existing:
            db.add(row)
            db.flush()
        try:
            entity_id = _apply(db, user, item.operation_type, item.entity_type, item.payload)
            row.entity_id = entity_id
            row.status = SyncStatus.SYNCED.value
            row.synced_at = datetime.utcnow()
            row.error_message = None
            synced += 1
            results.append(SyncResultItem(idempotency_key=item.idempotency_key, status="SYNCED", entity_id=entity_id))
        except Exception as exc:
            row.status = SyncStatus.FAILED.value
            row.error_message = str(exc)[:400]
            results.append(
                SyncResultItem(idempotency_key=item.idempotency_key, status="FAILED", error="Sync failed for this operation")
            )
    if synced:
        notify(
            db,
            user.id,
            "Network restored. Records synchronized.",
            f"{synced} records synchronized",
            "SYNC",
        )
    db.commit()
    return results


@router.get("/operations", response_model=list[SyncOperationOut])
def list_sync(
    status: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(SyncOperation)
    if user.role != "ADMIN":
        q = q.filter(SyncOperation.user_id == user.id)
    if status:
        q = q.filter(SyncOperation.status == status)
    return q.order_by(SyncOperation.created_at.desc()).limit(300).all()


@router.get("/summary")
def sync_summary(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    q = db.query(SyncOperation)
    if user.role != "ADMIN":
        q = q.filter(SyncOperation.user_id == user.id)
    rows = q.all()
    pending = sum(1 for r in rows if r.status == SyncStatus.PENDING.value)
    synced = sum(1 for r in rows if r.status == SyncStatus.SYNCED.value)
    failed = sum(1 for r in rows if r.status == SyncStatus.FAILED.value)
    last = max((r.synced_at for r in rows if r.synced_at), default=None)
    return {
        "pending": pending,
        "synced": synced,
        "failed": failed,
        "last_sync": last.isoformat() if last else None,
    }
