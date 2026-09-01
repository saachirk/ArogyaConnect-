from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user: "UserOut"


class UserOut(ORMModel):
    id: int
    name: str
    email: str
    phone: str
    role: str
    facility_id: int | None
    preferred_language: str
    specialization: str | None
    worker_type: str | None
    is_available: bool


class AvailabilityUpdate(BaseModel):
    is_available: bool


class PatientCreate(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    age: int = Field(ge=0, le=120)
    gender: str
    phone: str = Field(min_length=8, max_length=20)
    village: str
    district: str
    state: str = "Karnataka"
    preferred_language: str = "en"
    migrant_status: bool = False
    registered_facility_id: int | None = None
    client_id: str | None = None
    health_id: str | None = None


class PatientUpdate(BaseModel):
    name: str | None = None
    age: int | None = None
    phone: str | None = None
    village: str | None = None
    district: str | None = None
    preferred_language: str | None = None
    migrant_status: bool | None = None


class PatientOut(ORMModel):
    id: int
    health_id: str
    name: str
    age: int
    gender: str
    phone: str
    village: str
    district: str
    state: str
    preferred_language: str
    migrant_status: bool
    registered_facility_id: int | None
    created_at: datetime
    updated_at: datetime


class DuplicateCheckOut(BaseModel):
    possible_duplicates: list[PatientOut]
    message: str | None = None


class TriageCreate(BaseModel):
    patient_id: int
    chief_complaint: str
    duration: str = ""
    symptoms: str = ""
    temperature: float | None = None
    systolic_bp: int | None = None
    diastolic_bp: int | None = None
    pulse: int | None = None
    spo2: int | None = None
    existing_conditions: str = ""
    current_medications: str = ""
    red_flag_symptoms: str = ""
    notes: str = ""
    enqueue: bool = True
    specialist_type: str = "General Medicine"
    client_id: str | None = None


class ClinicalRecordOut(ORMModel):
    id: int
    patient_id: int
    worker_id: int
    chief_complaint: str
    symptoms: str
    duration: str
    temperature: float | None
    systolic_bp: int | None
    diastolic_bp: int | None
    pulse: int | None
    spo2: int | None
    existing_conditions: str
    current_medications: str
    red_flag_symptoms: str
    triage_level: str
    notes: str
    created_at: datetime
    disclaimer: str = "Rule-based triage assistance — NOT a medical diagnosis."


class ConsultationCreate(BaseModel):
    patient_id: int
    facility_id: int | None = None
    doctor_id: int | None = None
    priority: str | None = None
    specialist_type: str = "General Medicine"
    clinical_record_id: int | None = None
    client_id: str | None = None


class ConsultationOut(ORMModel):
    id: int
    patient_id: int
    doctor_id: int | None
    frontline_worker_id: int
    facility_id: int
    token_number: str
    priority: str
    status: str
    scheduled_at: datetime | None
    started_at: datetime | None
    completed_at: datetime | None
    estimated_wait_minutes: int
    specialist_type: str
    clinical_record_id: int | None
    created_at: datetime
    patient_name: str | None = None
    doctor_name: str | None = None


class StatusUpdate(BaseModel):
    status: str


class AssignUpdate(BaseModel):
    doctor_id: int


class RescheduleUpdate(BaseModel):
    scheduled_at: datetime
    keep_token: bool = True


class QueueAction(BaseModel):
    action: str = Field(description="KEEP | REASSIGN | RESCHEDULE")
    doctor_id: int | None = None
    scheduled_at: datetime | None = None


class OptimizeQueueRequest(BaseModel):
    specialist_type: str | None = None
    facility_id: int | None = None


class ReferralCreate(BaseModel):
    patient_id: int
    from_facility_id: int | None = None
    to_facility_id: int
    specialist_id: int | None = None
    reason: str
    priority: str = "HIGH"
    consultation_id: int | None = None
    client_id: str | None = None


class ReferralOut(ORMModel):
    id: int
    patient_id: int
    from_facility_id: int
    to_facility_id: int
    referred_by: int
    specialist_id: int | None
    reason: str
    priority: str
    status: str
    created_at: datetime
    accepted_at: datetime | None
    completed_at: datetime | None
    consultation_id: int | None
    patient_name: str | None = None


class FollowupCreate(BaseModel):
    patient_id: int
    referral_id: int | None = None
    assigned_worker_id: int | None = None
    due_date: datetime
    notes: str = ""
    client_id: str | None = None


class FollowupUpdate(BaseModel):
    status: str | None = None
    notes: str | None = None
    due_date: datetime | None = None
    assigned_worker_id: int | None = None


class FollowupOut(ORMModel):
    id: int
    patient_id: int
    referral_id: int | None
    assigned_worker_id: int | None
    due_date: datetime
    status: str
    notes: str
    completed_at: datetime | None
    created_at: datetime
    patient_name: str | None = None


class PrescriptionCreate(BaseModel):
    consultation_id: int
    medicine_name: str
    dosage: str
    frequency: str
    duration: str
    instructions: str = ""


class PrescriptionOut(ORMModel):
    id: int
    consultation_id: int
    doctor_id: int
    medicine_name: str
    dosage: str
    frequency: str
    duration: str
    instructions: str
    created_at: datetime
    disclaimer: str = "Prototype documentation only — not a validated prescription."


class FacilityOut(ORMModel):
    id: int
    name: str
    type: str
    village: str
    district: str
    state: str
    latitude: float
    longitude: float
    connectivity_status: str
    created_at: datetime
    queue_length: int = 0
    specialist_count: int = 0
    distance_km: float | None = None


class ResourceOut(ORMModel):
    id: int
    facility_id: int
    resource_name: str
    category: str
    availability_status: str
    quantity: int
    updated_at: datetime


class SpecialistAvailability(BaseModel):
    doctor_id: int
    name: str
    specialization: str
    facility_id: int | None
    facility_name: str | None
    is_available: bool
    current_queue: int
    estimated_wait_minutes: int


class SyncItem(BaseModel):
    idempotency_key: str
    operation_type: str
    entity_type: str
    payload: dict[str, Any]


class SyncRequest(BaseModel):
    operations: list[SyncItem]


class SyncResultItem(BaseModel):
    idempotency_key: str
    status: str
    entity_id: str | None = None
    error: str | None = None


class SyncOperationOut(ORMModel):
    id: int
    user_id: int
    operation_type: str
    entity_type: str
    entity_id: str | None
    payload: dict[str, Any]
    status: str
    idempotency_key: str
    error_message: str | None
    created_at: datetime
    synced_at: datetime | None


class NotificationOut(ORMModel):
    id: int
    user_id: int
    title: str
    message: str
    type: str
    is_read: bool
    created_at: datetime


class AuditLogOut(ORMModel):
    id: int
    user_id: int | None
    action: str
    entity_type: str
    entity_id: str
    timestamp: datetime
    details: str | None


class FrontlineDashboard(BaseModel):
    todays_patients: int
    waiting_consultations: int
    active_referrals: int
    followups_due: int
    offline_pending_sync: int
    network_hint: str = "ONLINE"


class DoctorDashboard(BaseModel):
    current_queue: int
    incoming_referrals: int
    followups: int
    in_progress: int


class AdminDashboard(BaseModel):
    total_patients: int
    todays_consultations: int
    active_referrals: int
    completed_referrals: int
    average_waiting_time: float
    overdue_followups: int
    pending_sync_operations: int
    consultations_by_day: list[dict[str, Any]]
    referrals_by_status: list[dict[str, Any]]
    patient_load_by_facility: list[dict[str, Any]]
    specialist_utilization: list[dict[str, Any]]
    connectivity_interruptions: list[dict[str, Any]]
    waiting_time_series: list[dict[str, Any]]


class AttentionItem(BaseModel):
    kind: str
    title: str
    detail: str
    entity_type: str
    entity_id: str
    district: str | None = None
    facility_id: int | None = None
    severity: str


TokenResponse.model_rebuild()
