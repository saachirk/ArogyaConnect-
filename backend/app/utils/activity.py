from datetime import datetime

from sqlalchemy.orm import Session

from app.models import AuditLog, Notification, User


def audit(db: Session, user: User | None, action: str, entity_type: str, entity_id: str, details: str | None = None) -> None:
    db.add(
        AuditLog(
            user_id=user.id if user else None,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id),
            details=details,
            timestamp=datetime.utcnow(),
        )
    )


def notify(db: Session, user_id: int, title: str, message: str, ntype: str) -> None:
    db.add(
        Notification(
            user_id=user_id,
            title=title,
            message=message,
            type=ntype,
            is_read=False,
            created_at=datetime.utcnow(),
        )
    )
