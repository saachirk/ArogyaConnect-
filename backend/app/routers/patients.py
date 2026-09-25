from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user, require_roles
from app.database import get_db
from app.models import (
    ClinicalRecord,
    Consultation,
    Followup,
    Patient,
    Prescription,
    Referral,
    User,
    UserRole,
)
from app.schemas import DuplicateCheckOut, PatientCreate, PatientOut, PatientUpdate
from app.utils.activity import audit

router = APIRouter(prefix="/api/patients", tags=["Patients"])


def _next_health_id(db: Session) -> str:
    last = db.query(Patient).order_by(Patient.id.desc()).first()
    n = (last.id + 10001) if last else 10001
    return f"SS-ABHA-{n}"


@router.get("", response_model=list[PatientOut])
def list_patients(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return db.query(Patient).order_by(Patient.updated_at.desc()).offset(skip).limit(limit).all()


@router.get("/search", response_model=list[PatientOut])
def search_patients(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    like = f"%{q.strip()}%"
    return (
        db.query(Patient)
        .filter(
            or_(
                Patient.health_id.ilike(like),
                Patient.name.ilike(like),
                Patient.phone.ilike(like),
                Patient.village.ilike(like),
            )
        )
        .limit(40)
        .all()
    )


@router.get("/check-duplicate", response_model=DuplicateCheckOut)
def check_duplicate(
    name: str | None = None,
    phone: str | None = None,
    health_id: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    filters = []
    if phone:
        filters.append(Patient.phone == phone)
    if health_id:
        filters.append(Patient.health_id == health_id)
    if name:
        filters.append(Patient.name.ilike(name.strip()))
    if not filters:
        return DuplicateCheckOut(possible_duplicates=[], message=None)
    found = db.query(Patient).filter(or_(*filters)).limit(10).all()
    msg = "Existing longitudinal record found." if found else None
    return DuplicateCheckOut(possible_duplicates=found, message=msg)


@router.post("", response_model=PatientOut, status_code=status.HTTP_201_CREATED)
def create_patient(
    body: PatientCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.FRONTLINE_WORKER.value, UserRole.ADMIN.value)),
):
    if body.client_id:
        existing = db.query(Patient).filter(Patient.client_id == body.client_id).first()
        if existing:
            return existing
    if body.health_id:
        clash = db.query(Patient).filter(Patient.health_id == body.health_id).first()
        if clash:
            raise HTTPException(status_code=409, detail="Health ID already exists")
    phone_hit = db.query(Patient).filter(Patient.phone == body.phone, Patient.name.ilike(body.name)).first()
    if phone_hit:
        raise HTTPException(
            status_code=409,
            detail="Possible duplicate: existing longitudinal record found.",
            headers={"X-Existing-Patient-Id": str(phone_hit.id)},
        )
    health_id = body.health_id or _next_health_id(db)
    while db.query(Patient).filter(Patient.health_id == health_id).first():
        health_id = _next_health_id(db) + "-X"
    patient = Patient(
        health_id=health_id,
        name=body.name.strip(),
        age=body.age,
        gender=body.gender.upper(),
        phone=body.phone,
        village=body.village,
        district=body.district,
        state=body.state,
        preferred_language=body.preferred_language,
        migrant_status=body.migrant_status,
        registered_facility_id=body.registered_facility_id or user.facility_id,
        client_id=body.client_id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(patient)
    db.flush()
    audit(db, user, "Patient created", "patient", str(patient.id), patient.health_id)
    db.commit()
    db.refresh(patient)
    return patient


@router.get("/{patient_id}", response_model=PatientOut)
def get_patient(patient_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    patient = db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@router.put("/{patient_id}", response_model=PatientOut)
def update_patient(
    patient_id: int,
    body: PatientUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.FRONTLINE_WORKER.value, UserRole.ADMIN.value)),
):
    patient = db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(patient, field, value)
    patient.updated_at = datetime.utcnow()
    audit(db, user, "Patient updated", "patient", str(patient.id))
    db.commit()
    db.refresh(patient)
    return patient


@router.get("/{patient_id}/history")
def patient_history(patient_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    patient = db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    clinical = (
        db.query(ClinicalRecord)
        .filter(ClinicalRecord.patient_id == patient_id)
        .order_by(ClinicalRecord.created_at.desc())
        .all()
    )
    consultations = (
        db.query(Consultation)
        .filter(Consultation.patient_id == patient_id)
        .order_by(Consultation.created_at.desc())
        .all()
    )
    referrals = db.query(Referral).filter(Referral.patient_id == patient_id).order_by(Referral.created_at.desc()).all()
    followups = db.query(Followup).filter(Followup.patient_id == patient_id).order_by(Followup.due_date.desc()).all()
    consult_ids = [c.id for c in consultations]
    prescriptions = (
        db.query(Prescription).filter(Prescription.consultation_id.in_(consult_ids)).all() if consult_ids else []
    )
    return {
        "patient": PatientOut.model_validate(patient).model_dump(),
        "portable_longitudinal_record": True,
        "abdm_note": "ABDM Integration Ready — this prototype does not connect to ABHA or ABDM.",
        "existing_record_message": "Existing longitudinal record found.",
        "migrant_status": patient.migrant_status,
        "clinical_records": [
            {
                "id": r.id,
                "chief_complaint": r.chief_complaint,
                "triage_level": r.triage_level,
                "temperature": r.temperature,
                "systolic_bp": r.systolic_bp,
                "diastolic_bp": r.diastolic_bp,
                "pulse": r.pulse,
                "spo2": r.spo2,
                "symptoms": r.symptoms,
                "red_flag_symptoms": r.red_flag_symptoms,
                "existing_conditions": r.existing_conditions,
                "current_medications": r.current_medications,
                "notes": r.notes,
                "created_at": r.created_at.isoformat(),
                "disclaimer": "Rule-based triage assistance — NOT a medical diagnosis.",
            }
            for r in clinical
        ],
        "consultations": [
            {
                "id": c.id,
                "token_number": c.token_number,
                "status": c.status,
                "priority": c.priority,
                "doctor_id": c.doctor_id,
                "created_at": c.created_at.isoformat(),
                "completed_at": c.completed_at.isoformat() if c.completed_at else None,
            }
            for c in consultations
        ],
        "referrals": [
            {
                "id": r.id,
                "status": r.status,
                "reason": r.reason,
                "priority": r.priority,
                "created_at": r.created_at.isoformat(),
            }
            for r in referrals
        ],
        "followups": [
            {
                "id": f.id,
                "status": f.status,
                "due_date": f.due_date.isoformat(),
                "notes": f.notes,
            }
            for f in followups
        ],
        "prescriptions": [
            {
                "id": p.id,
                "medicine_name": p.medicine_name,
                "dosage": p.dosage,
                "frequency": p.frequency,
                "duration": p.duration,
                "instructions": p.instructions,
                "disclaimer": "Prototype documentation only — not a validated prescription.",
            }
            for p in prescriptions
        ],
    }
