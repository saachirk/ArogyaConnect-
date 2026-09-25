from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.deps import require_roles
from app.database import get_db
from app.models import ClinicalRecord, Consultation, ConsultationStatus, Patient, User, UserRole
from app.schemas import ClinicalRecordOut, TriageCreate
from app.services.queue import estimated_wait, next_token, pick_least_loaded_doctor, refresh_wait_estimates
from app.services.triage import compute_triage_level, priority_from_triage
from app.utils.activity import audit, notify

router = APIRouter(prefix="/api/triage", tags=["Triage"])


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
def submit_triage(
    body: TriageCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.FRONTLINE_WORKER.value, UserRole.ADMIN.value, UserRole.DOCTOR.value)),
):
    patient = db.get(Patient, body.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    level = compute_triage_level(
        temperature=body.temperature,
        systolic_bp=body.systolic_bp,
        pulse=body.pulse,
        spo2=body.spo2,
        red_flag_symptoms=body.red_flag_symptoms,
        existing_conditions=body.existing_conditions,
    )
    record = ClinicalRecord(
        patient_id=patient.id,
        worker_id=user.id,
        chief_complaint=body.chief_complaint,
        symptoms=body.symptoms,
        duration=body.duration,
        temperature=body.temperature,
        systolic_bp=body.systolic_bp,
        diastolic_bp=body.diastolic_bp,
        pulse=body.pulse,
        spo2=body.spo2,
        existing_conditions=body.existing_conditions,
        current_medications=body.current_medications,
        red_flag_symptoms=body.red_flag_symptoms,
        triage_level=level,
        notes=body.notes,
        created_at=datetime.utcnow(),
    )
    db.add(record)
    db.flush()
    audit(db, user, "Triage submitted", "clinical_record", str(record.id), level)
    consultation = None
    if body.enqueue:
        doctor = pick_least_loaded_doctor(db, body.specialist_type, user.facility_id)
        facility_id = user.facility_id or patient.registered_facility_id or 1
        waiting = (
            db.query(Consultation)
            .filter(
                Consultation.status == ConsultationStatus.WAITING.value,
                Consultation.doctor_id == (doctor.id if doctor else None),
            )
            .count()
        )
        priority = priority_from_triage(level)
        consultation = Consultation(
            patient_id=patient.id,
            doctor_id=doctor.id if doctor else None,
            frontline_worker_id=user.id,
            facility_id=facility_id,
            token_number=next_token(db, facility_id),
            priority=priority,
            status=ConsultationStatus.WAITING.value,
            estimated_wait_minutes=estimated_wait(waiting, priority),
            specialist_type=body.specialist_type,
            clinical_record_id=record.id,
            client_id=body.client_id,
            created_at=datetime.utcnow(),
        )
        db.add(consultation)
        db.flush()
        refresh_wait_estimates(db)
        if doctor:
            notify(
                db,
                doctor.id,
                "New consultation queued",
                f"Token {consultation.token_number} — {patient.name} ({priority})",
                "QUEUE",
            )
    db.commit()
    db.refresh(record)
    out = ClinicalRecordOut.model_validate(record)
    return {
        "clinical_record": out.model_dump(),
        "consultation_id": consultation.id if consultation else None,
        "token_number": consultation.token_number if consultation else None,
        "estimated_wait_minutes": consultation.estimated_wait_minutes if consultation else None,
        "disclaimer": "Rule-based triage assistance — NOT a medical diagnosis.",
    }
