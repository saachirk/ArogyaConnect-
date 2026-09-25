from datetime import datetime
from enum import Enum

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UserRole(str, Enum):
    FRONTLINE_WORKER = "FRONTLINE_WORKER"
    DOCTOR = "DOCTOR"
    ADMIN = "ADMIN"


class FacilityType(str, Enum):
    PHC = "PHC"
    CHC = "CHC"
    DISTRICT_HOSPITAL = "DISTRICT_HOSPITAL"
    TELEMEDICINE_HUB = "TELEMEDICINE_HUB"


class ConnectivityStatus(str, Enum):
    ONLINE = "ONLINE"
    DEGRADED = "DEGRADED"
    OFFLINE = "OFFLINE"


class Gender(str, Enum):
    FEMALE = "FEMALE"
    MALE = "MALE"
    OTHER = "OTHER"


class TriageLevel(str, Enum):
    RED = "RED"
    YELLOW = "YELLOW"
    GREEN = "GREEN"


class ConsultationStatus(str, Enum):
    WAITING = "WAITING"
    CALLED = "CALLED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    RESCHEDULED = "RESCHEDULED"


class Priority(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    ROUTINE = "ROUTINE"


class ReferralStatus(str, Enum):
    CREATED = "CREATED"
    ACCEPTED = "ACCEPTED"
    SCHEDULED = "SCHEDULED"
    CONSULTED = "CONSULTED"
    FOLLOW_UP_DUE = "FOLLOW_UP_DUE"
    COMPLETED = "COMPLETED"
    RE_REFERRED = "RE_REFERRED"


class FollowupStatus(str, Enum):
    DUE = "DUE"
    OVERDUE = "OVERDUE"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class SyncStatus(str, Enum):
    PENDING = "PENDING"
    SYNCED = "SYNCED"
    FAILED = "FAILED"


class ResourceCategory(str, Enum):
    MEDICINE = "MEDICINE"
    EQUIPMENT = "EQUIPMENT"
    STAFF = "STAFF"
    BED = "BED"


class Facility(Base):
    __tablename__ = "facilities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    type: Mapped[str] = mapped_column(String(40), nullable=False)
    village: Mapped[str] = mapped_column(String(120), nullable=False)
    district: Mapped[str] = mapped_column(String(120), nullable=False)
    state: Mapped[str] = mapped_column(String(80), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    connectivity_status: Mapped[str] = mapped_column(String(20), default=ConnectivityStatus.ONLINE.value)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    users = relationship("User", back_populates="facility")
    resources = relationship("FacilityResource", back_populates="facility")


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    email: Mapped[str] = mapped_column(String(160), unique=True, nullable=False, index=True)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    facility_id: Mapped[int | None] = mapped_column(ForeignKey("facilities.id"), nullable=True)
    preferred_language: Mapped[str] = mapped_column(String(8), default="en")
    specialization: Mapped[str | None] = mapped_column(String(80), nullable=True)
    worker_type: Mapped[str | None] = mapped_column(String(40), nullable=True)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    facility = relationship("Facility", back_populates="users")


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    health_id: Mapped[str] = mapped_column(String(40), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    age: Mapped[int] = mapped_column(Integer, nullable=False)
    gender: Mapped[str] = mapped_column(String(16), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    village: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    district: Mapped[str] = mapped_column(String(120), nullable=False)
    state: Mapped[str] = mapped_column(String(80), nullable=False)
    preferred_language: Mapped[str] = mapped_column(String(8), default="en")
    migrant_status: Mapped[bool] = mapped_column(Boolean, default=False)
    registered_facility_id: Mapped[int | None] = mapped_column(ForeignKey("facilities.id"), nullable=True)
    client_id: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    clinical_records = relationship("ClinicalRecord", back_populates="patient")
    consultations = relationship("Consultation", back_populates="patient")
    referrals = relationship("Referral", back_populates="patient")
    followups = relationship("Followup", back_populates="patient")


class ClinicalRecord(Base):
    __tablename__ = "clinical_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), nullable=False, index=True)
    worker_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    chief_complaint: Mapped[str] = mapped_column(String(300), nullable=False)
    symptoms: Mapped[str] = mapped_column(Text, default="")
    duration: Mapped[str] = mapped_column(String(80), default="")
    temperature: Mapped[float | None] = mapped_column(Float, nullable=True)
    systolic_bp: Mapped[int | None] = mapped_column(Integer, nullable=True)
    diastolic_bp: Mapped[int | None] = mapped_column(Integer, nullable=True)
    pulse: Mapped[int | None] = mapped_column(Integer, nullable=True)
    spo2: Mapped[int | None] = mapped_column(Integer, nullable=True)
    existing_conditions: Mapped[str] = mapped_column(Text, default="")
    current_medications: Mapped[str] = mapped_column(Text, default="")
    red_flag_symptoms: Mapped[str] = mapped_column(Text, default="")
    triage_level: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="clinical_records")
    worker = relationship("User")


class Consultation(Base):
    __tablename__ = "consultations"
    __table_args__ = (Index("ix_consultations_status_priority", "status", "priority"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), nullable=False, index=True)
    doctor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    frontline_worker_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    facility_id: Mapped[int] = mapped_column(ForeignKey("facilities.id"), nullable=False)
    token_number: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    priority: Mapped[str] = mapped_column(String(16), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    estimated_wait_minutes: Mapped[int] = mapped_column(Integer, default=0)
    specialist_type: Mapped[str] = mapped_column(String(80), default="General Medicine")
    clinical_record_id: Mapped[int | None] = mapped_column(ForeignKey("clinical_records.id"), nullable=True)
    client_id: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="consultations")
    doctor = relationship("User", foreign_keys=[doctor_id])
    frontline_worker = relationship("User", foreign_keys=[frontline_worker_id])
    facility = relationship("Facility")
    prescriptions = relationship("Prescription", back_populates="consultation")


class Referral(Base):
    __tablename__ = "referrals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), nullable=False, index=True)
    from_facility_id: Mapped[int] = mapped_column(ForeignKey("facilities.id"), nullable=False)
    to_facility_id: Mapped[int] = mapped_column(ForeignKey("facilities.id"), nullable=False)
    referred_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    specialist_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    priority: Mapped[str] = mapped_column(String(16), nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    consultation_id: Mapped[int | None] = mapped_column(ForeignKey("consultations.id"), nullable=True)

    patient = relationship("Patient", back_populates="referrals")
    from_facility = relationship("Facility", foreign_keys=[from_facility_id])
    to_facility = relationship("Facility", foreign_keys=[to_facility_id])


class Followup(Base):
    __tablename__ = "followups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), nullable=False, index=True)
    referral_id: Mapped[int | None] = mapped_column(ForeignKey("referrals.id"), nullable=True)
    assigned_worker_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    due_date: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    notes: Mapped[str] = mapped_column(Text, default="")
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="followups")
    referral = relationship("Referral")


class Prescription(Base):
    __tablename__ = "prescriptions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    consultation_id: Mapped[int] = mapped_column(ForeignKey("consultations.id"), nullable=False, index=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    medicine_name: Mapped[str] = mapped_column(String(160), nullable=False)
    dosage: Mapped[str] = mapped_column(String(80), nullable=False)
    frequency: Mapped[str] = mapped_column(String(80), nullable=False)
    duration: Mapped[str] = mapped_column(String(80), nullable=False)
    instructions: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    consultation = relationship("Consultation", back_populates="prescriptions")


class SyncOperation(Base):
    __tablename__ = "sync_operations"
    __table_args__ = (UniqueConstraint("idempotency_key", name="uq_sync_idempotency"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    operation_type: Mapped[str] = mapped_column(String(40), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(40), nullable=False)
    entity_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    idempotency_key: Mapped[str] = mapped_column(String(80), nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    synced_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(String(40), nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class FacilityResource(Base):
    __tablename__ = "facility_resources"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    facility_id: Mapped[int] = mapped_column(ForeignKey("facilities.id"), nullable=False, index=True)
    resource_name: Mapped[str] = mapped_column(String(160), nullable=False)
    category: Mapped[str] = mapped_column(String(40), nullable=False)
    availability_status: Mapped[str] = mapped_column(String(24), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    facility = relationship("Facility", back_populates="resources")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    entity_type: Mapped[str] = mapped_column(String(40), nullable=False)
    entity_id: Mapped[str] = mapped_column(String(64), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
