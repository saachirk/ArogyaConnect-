from datetime import datetime

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import Consultation, ConsultationStatus, User, UserRole

ACTIVE_QUEUE = (
    ConsultationStatus.WAITING.value,
    ConsultationStatus.CALLED.value,
    ConsultationStatus.IN_PROGRESS.value,
)

PRIORITY_WEIGHT = {"CRITICAL": 0, "HIGH": 1, "ROUTINE": 2}
MINUTES_PER_PATIENT = 12


def next_token(db: Session, facility_id: int) -> str:
    today = datetime.utcnow().strftime("%Y%m%d")
    prefix = f"AC-{facility_id}-{today}-"
    count = (
        db.query(func.count(Consultation.id))
        .filter(Consultation.token_number.like(f"{prefix}%"))
        .scalar()
        or 0
    )
    return f"{prefix}{count + 1:03d}"


def estimated_wait(queue_len: int, priority: str) -> int:
    base = max(queue_len, 0) * MINUTES_PER_PATIENT
    if priority == "CRITICAL":
        return max(5, base // 3)
    if priority == "HIGH":
        return max(10, int(base * 0.6))
    return max(15, base)


def active_queue_count(db: Session, doctor_id: int | None = None, specialist_type: str | None = None) -> int:
    q = db.query(func.count(Consultation.id)).filter(Consultation.status.in_(ACTIVE_QUEUE))
    if doctor_id:
        q = q.filter(Consultation.doctor_id == doctor_id)
    if specialist_type:
        q = q.filter(Consultation.specialist_type == specialist_type)
    return int(q.scalar() or 0)


def pick_least_loaded_doctor(db: Session, specialist_type: str | None = None, facility_id: int | None = None) -> User | None:
    q = db.query(User).filter(User.role == UserRole.DOCTOR.value, User.is_available.is_(True))
    if specialist_type:
        q = q.filter((User.specialization == specialist_type) | (User.specialization == "General Medicine"))
    if facility_id:
        doctors = q.all()
        if not doctors:
            doctors = db.query(User).filter(User.role == UserRole.DOCTOR.value, User.is_available.is_(True)).all()
    else:
        doctors = q.all()
    if not doctors:
        return None
    doctors.sort(key=lambda d: active_queue_count(db, doctor_id=d.id))
    return doctors[0]


def refresh_wait_estimates(db: Session) -> None:
    waiting = (
        db.query(Consultation)
        .filter(Consultation.status.in_(ACTIVE_QUEUE))
        .order_by(Consultation.priority.asc(), Consultation.created_at.asc())
        .all()
    )
    by_doctor: dict[int | None, int] = {}
    for c in sorted(waiting, key=lambda x: (PRIORITY_WEIGHT.get(x.priority, 9), x.created_at)):
        key = c.doctor_id
        ahead = by_doctor.get(key, 0)
        c.estimated_wait_minutes = estimated_wait(ahead, c.priority)
        by_doctor[key] = ahead + 1


def optimize_assignments(db: Session, specialist_type: str | None = None, facility_id: int | None = None) -> dict:
    """Prototype queue optimization: move WAITING items toward least-loaded available doctors."""
    q = db.query(Consultation).filter(Consultation.status == ConsultationStatus.WAITING.value)
    if specialist_type:
        q = q.filter(Consultation.specialist_type == specialist_type)
    if facility_id:
        q = q.filter(Consultation.facility_id == facility_id)
    waiting = q.order_by(Consultation.created_at.asc()).all()

    doctors_q = db.query(User).filter(User.role == UserRole.DOCTOR.value, User.is_available.is_(True))
    doctors = doctors_q.all()
    if specialist_type:
        matched = [d for d in doctors if d.specialization == specialist_type]
        if matched:
            doctors = matched
    before = {d.id: active_queue_count(db, doctor_id=d.id) for d in doctors}
    loads = dict(before)
    moves: list[dict] = []
    for c in waiting:
        if not doctors:
            break
        target = min(doctors, key=lambda d: loads.get(d.id, 0))
        if c.doctor_id != target.id:
            moves.append(
                {
                    "consultation_id": c.id,
                    "token_number": c.token_number,
                    "from_doctor_id": c.doctor_id,
                    "to_doctor_id": target.id,
                }
            )
            if c.doctor_id in loads:
                loads[c.doctor_id] = max(0, loads[c.doctor_id] - 1)
            c.doctor_id = target.id
            loads[target.id] = loads.get(target.id, 0) + 1
    refresh_wait_estimates(db)
    after = {d.id: active_queue_count(db, doctor_id=d.id) for d in doctors}
    return {
        "algorithm": "Prototype queue optimization algorithm.",
        "before": before,
        "after": after,
        "moves": moves,
        "note": "Patients are reassigned only to reduce load imbalance. Tokens are preserved.",
    }
