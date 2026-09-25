from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth.deps import require_roles
from app.database import get_db
from app.models import AuditLog, User, UserRole
from app.schemas import AuditLogOut

router = APIRouter(prefix="/api/audit", tags=["Audit"])


@router.get("", response_model=list[AuditLogOut])
def list_audit(
    skip: int = 0,
    limit: int = 100,
    action: str | None = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN.value)),
):
    q = db.query(AuditLog)
    if action:
        q = q.filter(AuditLog.action.ilike(f"%{action}%"))
    return q.order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit).all()
