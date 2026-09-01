from math import atan2, cos, radians, sin, sqrt

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.database import get_db
from app.models import Consultation, Facility, FacilityResource, User, UserRole
from app.schemas import FacilityOut, ResourceOut
from app.services.queue import ACTIVE_QUEUE

router = APIRouter(prefix="/api/facilities", tags=["Facilities"])


def haversine(lat1, lon1, lat2, lon2) -> float:
    r = 6371
    dlat, dlon = radians(lat2 - lat1), radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return r * 2 * atan2(sqrt(a), sqrt(1 - a))


@router.get("", response_model=list[FacilityOut])
def list_facilities(
    lat: float | None = Query(None),
    lon: float | None = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    facilities = db.query(Facility).all()
    out = []
    for f in facilities:
        qlen = (
            db.query(Consultation)
            .filter(Consultation.facility_id == f.id, Consultation.status.in_(ACTIVE_QUEUE))
            .count()
        )
        specs = db.query(User).filter(User.facility_id == f.id, User.role == UserRole.DOCTOR.value).count()
        item = FacilityOut.model_validate(f)
        item.queue_length = qlen
        item.specialist_count = specs
        if lat is not None and lon is not None:
            item.distance_km = round(haversine(lat, lon, f.latitude, f.longitude), 1)
        out.append(item)
    if lat is not None:
        out.sort(key=lambda x: x.distance_km or 9999)
    return out


@router.get("/{facility_id}")
def get_facility(facility_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    f = db.get(Facility, facility_id)
    if not f:
        raise HTTPException(status_code=404, detail="Facility not found")
    resources = db.query(FacilityResource).filter(FacilityResource.facility_id == f.id).all()
    qlen = (
        db.query(Consultation)
        .filter(Consultation.facility_id == f.id, Consultation.status.in_(ACTIVE_QUEUE))
        .count()
    )
    doctors = db.query(User).filter(User.facility_id == f.id, User.role == UserRole.DOCTOR.value).all()
    item = FacilityOut.model_validate(f)
    item.queue_length = qlen
    item.specialist_count = len(doctors)
    return {
        "facility": item.model_dump(),
        "resources": [ResourceOut.model_validate(r).model_dump() for r in resources],
        "specialists": [{"id": d.id, "name": d.name, "specialization": d.specialization, "is_available": d.is_available} for d in doctors],
        "connectivity": f.connectivity_status,
    }
