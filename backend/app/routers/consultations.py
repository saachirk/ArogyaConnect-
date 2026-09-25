from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user, require_roles
from app.database import get_db
from app.models import Consultation, ConsultationStatus, Patient, Prescription, User, UserRole
from app.schemas import (
    AssignUpdate,
    ConsultationCreate,
    ConsultationOut,
    OptimizeQueueRequest,
    PrescriptionCreate,
    PrescriptionOut,
    QueueAction,
    RescheduleUpdate,
    StatusUpdate,
)
from app.services.queue import (
    ACTIVE_QUEUE,
    estimated_wait,
    next_token,
    optimize_assignments,
    pick_least_loaded_doctor,
    refresh_wait_estimates,
)
from app.utils.activity import audit, notify

router = APIRouter(tags=["Consultations"])


def _out(c: Consultation, db: Session) -> ConsultationOut:
    patient = db.get(Patient, c.patient_id)
    doctor = db.get(User, c.doctor_id) if c.doctor_id else None
    data = ConsultationOut.model_validate(c)
    data.patient_name = patient.name if patient else None
    data.doctor_name = doctor.name if doctor else None
    return data


@router.post("/api/consultations", response_model=ConsultationOut, status_code=201)
def create_consultation(
    body: ConsultationCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.FRONTLINE_WORKER.value, UserRole.ADMIN.value, UserRole.DOCTOR.value)),
):
    if body.client_id:
        existing = db.query(Consultation).filter(Consultation.client_id == body.client_id).first()
        if existing:
            return _out(existing, db)
    patient = db.get(Patient, body.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    doctor = db.get(User, body.doctor_id) if body.doctor_id else pick_least_loaded_doctor(db, body.specialist_type)
    facility_id = body.facility_id or user.facility_id or 1
    waiting = (
        db.query(Consultation)
        .filter(Consultation.status.in_(ACTIVE_QUEUE), Consultation.doctor_id == (doctor.id if doctor else None))
        .count()
    )
    priority = body.priority or "ROUTINE"
    c = Consultation(
        patient_id=patient.id,
        doctor_id=doctor.id if doctor else None,
        frontline_worker_id=user.id,
        facility_id=facility_id,
        token_number=next_token(db, facility_id),
        priority=priority,
        status=ConsultationStatus.WAITING.value,
        estimated_wait_minutes=estimated_wait(waiting, priority),
        specialist_type=body.specialist_type,
        clinical_record_id=body.clinical_record_id,
        client_id=body.client_id,
        created_at=datetime.utcnow(),
    )
    db.add(c)
    db.flush()
    refresh_wait_estimates(db)
    audit(db, user, "Consultation assigned", "consultation", str(c.id), c.token_number)
    db.commit()
    db.refresh(c)
    return _out(c, db)


@router.get("/api/queue", response_model=list[ConsultationOut])
def get_queue(
    doctor_id: int | None = None,
    facility_id: int | None = None,
    status_filter: str | None = Query(None, alias="status"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(Consultation)
    if user.role == UserRole.DOCTOR.value and doctor_id is None:
        doctor_id = user.id
    if doctor_id:
        q = q.filter(Consultation.doctor_id == doctor_id)
    if facility_id:
        q = q.filter(Consultation.facility_id == facility_id)
    if status_filter:
        q = q.filter(Consultation.status == status_filter)
    else:
        q = q.filter(Consultation.status.in_(ACTIVE_QUEUE))
    rows = q.order_by(Consultation.priority.asc(), Consultation.created_at.asc()).all()
    return [_out(c, db) for c in rows]


@router.put("/api/consultations/{consultation_id}/assign", response_model=ConsultationOut)
def assign_doctor(
    consultation_id: int,
    body: AssignUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.FRONTLINE_WORKER.value, UserRole.DOCTOR.value)),
):
    c = db.get(Consultation, consultation_id)
    if not c:
        raise HTTPException(status_code=404, detail="Consultation not found")
    doctor = db.get(User, body.doctor_id)
    if not doctor or doctor.role != UserRole.DOCTOR.value:
        raise HTTPException(status_code=400, detail="Invalid doctor")
    c.doctor_id = doctor.id
    refresh_wait_estimates(db)
    audit(db, user, "Consultation assigned", "consultation", str(c.id), f"doctor={doctor.id}")
    db.commit()
    db.refresh(c)
    return _out(c, db)


@router.put("/api/consultations/{consultation_id}/status", response_model=ConsultationOut)
def update_status(
    consultation_id: int,
    body: StatusUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    c = db.get(Consultation, consultation_id)
    if not c:
        raise HTTPException(status_code=404, detail="Consultation not found")
    allowed = {s.value for s in ConsultationStatus}
    if body.status not in allowed:
        raise HTTPException(status_code=400, detail="Invalid status")
    c.status = body.status
    now = datetime.utcnow()
    if body.status == ConsultationStatus.IN_PROGRESS.value:
        c.started_at = c.started_at or now
        if c.doctor_id:
            notify(db, c.doctor_id, "Consultation started", f"Token {c.token_number} is in progress.", "CONSULT")
        notify(
            db,
            c.frontline_worker_id,
            "Your consultation is approaching.",
            f"Token {c.token_number} is now in progress.",
            "QUEUE",
        )
    if body.status == ConsultationStatus.COMPLETED.value:
        c.completed_at = now
    refresh_wait_estimates(db)
    db.commit()
    db.refresh(c)
    return _out(c, db)


@router.put("/api/consultations/{consultation_id}/reschedule", response_model=ConsultationOut)
def reschedule(
    consultation_id: int,
    body: RescheduleUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    c = db.get(Consultation, consultation_id)
    if not c:
        raise HTTPException(status_code=404, detail="Consultation not found")
    c.status = ConsultationStatus.RESCHEDULED.value
    c.scheduled_at = body.scheduled_at
    # Token remains associated with the patient even if the doctor is delayed.
    db.commit()
    db.refresh(c)
    return _out(c, db)


@router.post("/api/consultations/{consultation_id}/doctor-unavailable", response_model=ConsultationOut)
def doctor_unavailable(
    consultation_id: int,
    body: QueueAction,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    c = db.get(Consultation, consultation_id)
    if not c:
        raise HTTPException(status_code=404, detail="Consultation not found")
    action = body.action.upper()
    if action == "KEEP":
        c.status = ConsultationStatus.WAITING.value
    elif action == "REASSIGN":
        doctor = db.get(User, body.doctor_id) if body.doctor_id else pick_least_loaded_doctor(db, c.specialist_type)
        if not doctor:
            raise HTTPException(status_code=400, detail="No available specialist")
        c.doctor_id = doctor.id
        c.status = ConsultationStatus.WAITING.value
    elif action == "RESCHEDULE":
        c.status = ConsultationStatus.RESCHEDULED.value
        c.scheduled_at = body.scheduled_at or datetime.utcnow()
    else:
        raise HTTPException(status_code=400, detail="Action must be KEEP, REASSIGN, or RESCHEDULE")
    refresh_wait_estimates(db)
    db.commit()
    db.refresh(c)
    return _out(c, db)


@router.post("/api/queue/optimize")
def optimize_queue(
    body: OptimizeQueueRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.FRONTLINE_WORKER.value)),
):
    result = optimize_assignments(db, body.specialist_type, body.facility_id)
    db.commit()
    return result


@router.post("/api/prescriptions", response_model=PrescriptionOut, status_code=201)
def create_prescription(
    body: PrescriptionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.DOCTOR.value, UserRole.ADMIN.value)),
):
    consult = db.get(Consultation, body.consultation_id)
    if not consult:
        raise HTTPException(status_code=404, detail="Consultation not found")
    p = Prescription(
        consultation_id=consult.id,
        doctor_id=user.id,
        medicine_name=body.medicine_name,
        dosage=body.dosage,
        frequency=body.frequency,
        duration=body.duration,
        instructions=body.instructions,
        created_at=datetime.utcnow(),
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return p
