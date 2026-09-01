from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.auth.security import create_access_token, verify_password
from app.config import get_settings
from app.database import get_db
from app.models import User
from app.schemas import AvailabilityUpdate, LoginRequest, TokenResponse, UserOut

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
settings = get_settings()


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email.lower()).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    token = create_access_token(str(user.id), user.role, extra={"email": user.email})
    return TokenResponse(access_token=token, role=user.role, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.post("/availability", response_model=UserOut)
def set_availability(
    body: AvailabilityUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user.is_available = body.is_available
    db.commit()
    db.refresh(user)
    return user


@router.get("/demo-info")
def demo_info():
    return {
        "disclaimer": "DEMO / SYNTHETIC DATA — NOT FOR CLINICAL USE",
        "accounts": [
            {"role": "FRONTLINE_WORKER", "email": "asha.demo@arogyaconnect.local"},
            {"role": "DOCTOR", "email": "doctor.demo@arogyaconnect.local"},
            {"role": "ADMIN", "email": "admin.demo@arogyaconnect.local"},
        ],
        "password": settings.DEMO_PASSWORD,
        "note": "These are fictional demo credentials for the prototype only.",
    }
