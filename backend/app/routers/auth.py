from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.auth.security import create_access_token, hash_password, verify_password
from app.config import get_settings
from app.database import get_db
from app.models import User
from app.schemas import AvailabilityUpdate, LoginRequest, TokenResponse, UserOut


class UserRegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    phone: Optional[str] = None
    role: str = "DOCTOR"
    specialization: Optional[str] = None


router = APIRouter(prefix="/api/auth", tags=["Authentication"])
settings = get_settings()


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_user(user_data: UserRegisterRequest, db: Session = Depends(get_db)):
    clean_email = user_data.email.strip().lower()

    # 1. Check if the email is already registered
    existing_user = db.query(User).filter(User.email == clean_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # 2. Hash the password
    hashed_pw = hash_password(user_data.password)

    # 3. Instantiate the new user model
    new_user = User(
        name=user_data.name,
        email=clean_email,
        phone=user_data.phone,
        password_hash=hashed_pw,
        role=user_data.role,
        specialization=user_data.specialization,
        is_available=True,
    )

    # 4. Save to the database
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "User registered successfully",
        "user_id": new_user.id,
        "email": new_user.email,
    }


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email.lower()).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    token = create_access_token(str(user.id), user.role, extra={"email": user.email})
    return TokenResponse(
        access_token=token, role=user.role, user=UserOut.model_validate(user)
    )


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