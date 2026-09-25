from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.database import get_db
from app.models import Facility, User, UserRole
from app.schemas import SpecialistAvailability
from app.services.queue import active_queue_count, estimated_wait

router = APIRouter(prefix="/api/specialists", tags=["Specialists"])


@router.get("/availability", response_model=list[SpecialistAvailability])
def availability(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    doctors = db.query(User).filter(User.role == UserRole.DOCTOR.value).all()
    out = []
    for d in doctors:
        q = active_queue_count(db, doctor_id=d.id)
        fac = db.get(Facility, d.facility_id) if d.facility_id else None
        out.append(
            SpecialistAvailability(
                doctor_id=d.id,
                name=d.name,
                specialization=d.specialization or "General Medicine",
                facility_id=d.facility_id,
                facility_name=fac.name if fac else None,
                is_available=d.is_available,
                current_queue=q,
                estimated_wait_minutes=estimated_wait(q, "ROUTINE"),
            )
        )
    out.sort(key=lambda x: x.current_queue)
    return out
