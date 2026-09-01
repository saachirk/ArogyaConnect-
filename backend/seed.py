"""Generate synthetic ArogyaConnect demo data. All persons and IDs are fictional."""

from __future__ import annotations

import random
import sys
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from sqlalchemy.orm import Session

from app.auth.security import hash_password
from app.config import get_settings
from app.database import SessionLocal, init_db
from app.models import (
    AuditLog,
    ClinicalRecord,
    Consultation,
    Facility,
    FacilityResource,
    Followup,
    Notification,
    Patient,
    Prescription,
    Referral,
    SyncOperation,
    User,
)

random.seed(26133)
settings = get_settings()
PASSWORD = settings.DEMO_PASSWORD

FIRST = [
    "Lakshmi", "Ravi", "Meena", "Ramesh", "Asha", "Suresh", "Kavita", "Anand", "Sunita",
    "Prakash", "Geeta", "Manoj", "Pooja", "Vijay", "Nirmala", "Harish", "Savita", "Deepak",
    "Radha", "Gopal", "Shobha", "Naveen", "Latha", "Kiran", "Padma", "Mahesh", "Rekha",
    "Sanjay", "Usha", "Arun", "Jyoti", "Vinod", "Anita", "Raju", "Bhavani", "Shankar",
]
LAST = ["Devi", "Kumar", "Kumari", "Gowda", "Patel", "Reddy", "Naik", "Shetty", "Rao", "Deshmukh", "Patil", "Sharma", "Joshi"]
VILLAGES = [
    "Malur", "Srinivaspur", "Bangarapet", "Mulbagal", "Nanjangud", "Hunsur", "T. Narasipura",
    "Manvi", "Sindhanur", "Devadurga", "Hosakote", "Doddaballapura", "Nelamangala", "Anekal",
    "Channapatna", "Ramanagara", "Gokak", "Athani",
]
DISTRICTS = ["Kolar", "Mysuru", "Raichur", "Bengaluru Rural", "Mandya", "Belagavi", "Tumakuru"]
LANGUAGES = ["en", "hi", "kn", "mr"]
COMPLAINTS = [
    "Fever and cough", "Joint pain", "Headache", "Abdominal pain", "Skin rash",
    "Breathlessness", "Antenatal check", "Diarrhoea", "Back pain", "Dizziness",
    "Ear pain", "Wound dressing", "High blood pressure follow-up", "Fatigue",
]
SYMPTOMS = ["cough", "fever", "weakness", "nausea", "body ache", "loss of appetite"]
RED_FLAGS = ["", "", "", "chest pain", "difficulty breathing", ""]
CONDITIONS = ["", "Diabetes", "Hypertension", "Asthma", "Pregnancy", "TB history"]
MEDS = ["", "Metformin 500mg", "Amlodipine 5mg", "Salbutamol inhaler", "Iron + folic acid"]
SPECIALTIES = [
    "General Medicine", "Pediatrics", "Obstetrics", "Orthopedics", "Dermatology",
    "General Medicine", "Cardiology", "ENT", "General Medicine", "Psychiatry",
]
WORKER_TYPES = ["ASHA", "ANM", "FACILITATOR"]
STATUSES = ["WAITING", "CALLED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "RESCHEDULED"]
REF_STATUSES = ["CREATED", "ACCEPTED", "SCHEDULED", "CONSULTED", "FOLLOW_UP_DUE", "COMPLETED", "RE_REFERRED"]
RESOURCES = [
    ("ORS packets", "MEDICINE"),
    ("Paracetamol 500mg", "MEDICINE"),
    ("Amoxicillin", "MEDICINE"),
    ("Iron tablets", "MEDICINE"),
    ("Glucometer strips", "EQUIPMENT"),
    ("Oxygen cylinder", "EQUIPMENT"),
    ("General beds", "BED"),
]


def seed() -> None:
    init_db()
    db: Session = SessionLocal()
    try:
        if db.query(User).filter(User.email == "admin.demo@arogyaconnect.local").first():
            print("Seed data already present. Delete the database file to reseed.")
            return
        pwd = hash_password(PASSWORD)
        now = datetime.utcnow()

        facilities_spec = [
            ("Kolar Rural PHC", "PHC", "Malur", "Kolar", 13.16, 78.16, "ONLINE"),
            ("Mysuru Community Health Centre", "CHC", "Nanjangud", "Mysuru", 12.12, 76.68, "ONLINE"),
            ("Raichur Rural Health Centre", "PHC", "Manvi", "Raichur", 16.0, 77.05, "DEGRADED"),
            ("Bengaluru Rural Telemedicine Hub", "TELEMEDICINE_HUB", "Hosakote", "Bengaluru Rural", 13.07, 77.8, "ONLINE"),
            ("Mandya District Hospital", "DISTRICT_HOSPITAL", "Mandya", "Mandya", 12.52, 76.9, "ONLINE"),
            ("Tumakuru Rural PHC", "PHC", "Koratagere", "Tumakuru", 13.52, 77.23, "OFFLINE"),
            ("Belagavi CHC Athani", "CHC", "Athani", "Belagavi", 16.73, 75.06, "ONLINE"),
            ("Kolar CHC Srinivaspur", "CHC", "Srinivaspur", "Kolar", 13.33, 78.21, "DEGRADED"),
            ("Raichur District Hospital", "DISTRICT_HOSPITAL", "Raichur", "Raichur", 16.21, 77.35, "ONLINE"),
            ("Mysuru Telemedicine Hub", "TELEMEDICINE_HUB", "Mysuru", "Mysuru", 12.3, 76.65, "ONLINE"),
        ]
        facilities: list[Facility] = []
        for name, ftype, village, district, lat, lon, conn in facilities_spec:
            f = Facility(
                name=name,
                type=ftype,
                village=village,
                district=district,
                state="Karnataka",
                latitude=lat,
                longitude=lon,
                connectivity_status=conn,
                created_at=now - timedelta(days=200),
            )
            db.add(f)
            facilities.append(f)
        db.flush()

        for f in facilities:
            for rname, cat in RESOURCES:
                db.add(
                    FacilityResource(
                        facility_id=f.id,
                        resource_name=rname,
                        category=cat,
                        availability_status=random.choice(["AVAILABLE", "LOW", "AVAILABLE", "STOCKOUT"]),
                        quantity=random.randint(0, 120),
                        updated_at=now - timedelta(hours=random.randint(1, 72)),
                    )
                )

        admin = User(
            name="Supervisor Nandini Rao",
            email="admin.demo@arogyaconnect.test",
            phone="9000000001",
            password_hash=pwd,
            role="ADMIN",
            facility_id=facilities[3].id,
            preferred_language="en",
            is_available=True,
            created_at=now,
        )
        db.add(admin)

        doctors: list[User] = []
        doctor_names = [
            "Dr. Anil Hegde", "Dr. Priya Nair", "Dr. Farhan Khan", "Dr. Sneha Iyer",
            "Dr. Rohan Kulkarni", "Dr. Meera Joshi", "Dr. Karthik Shetty", "Dr. Ayesha Banu",
            "Dr. Vivek Patil", "Dr. Demo Specialist",
        ]
        for i, name in enumerate(doctor_names):
            email = "doctor.demo@arogyaconnect.test" if i == 9 else f"doctor{i+1}@arogyaconnect.local"
            u = User(
                name=name,
                email=email,
                phone=f"91000000{i:02d}",
                password_hash=pwd,
                role="DOCTOR",
                facility_id=facilities[i % len(facilities)].id,
                preferred_language=LANGUAGES[i % 4],
                specialization=SPECIALTIES[i],
                is_available=i != 8,
                created_at=now,
            )
            db.add(u)
            doctors.append(u)

        workers: list[User] = []
        worker_names = [
            "Asha Patel", "Meena Kumari", "Lakshmi Devi", "Savita Naik", "Geeta Reddy",
            "Nirmala Gowda", "Radha Patil", "Usha Rao", "Rekha Deshmukh", "Padma Shetty",
            "Jyoti Sharma", "Anita Joshi", "Bhavani Gowda", "Shobha Kumar", "Asha Demo Worker",
        ]
        for i, name in enumerate(worker_names):
            email = "asha.demo@arogyaconnect.test" if i == 14 else f"asha{i+1}@arogyaconnect.local"
            u = User(
                name=name,
                email=email,
                phone=f"92000000{i:02d}",
                password_hash=pwd,
                role="FRONTLINE_WORKER",
                facility_id=facilities[i % len(facilities)].id,
                preferred_language=LANGUAGES[i % 4],
                worker_type=WORKER_TYPES[i % 3],
                is_available=True,
                created_at=now,
            )
            db.add(u)
            workers.append(u)
        db.flush()

        patients: list[Patient] = []
        for i in range(120):
            name = f"{random.choice(FIRST)} {random.choice(LAST)}"
            village = random.choice(VILLAGES)
            district = random.choice(DISTRICTS)
            p = Patient(
                health_id=f"SS-ABHA-{10001 + i}",
                name=name,
                age=random.randint(1, 82),
                gender=random.choice(["FEMALE", "MALE", "FEMALE", "OTHER"]),
                phone=f"98{10000000 + i:08d}"[-10:],
                village=village,
                district=district,
                state="Karnataka",
                preferred_language=random.choice(LANGUAGES),
                migrant_status=i % 11 == 0,
                registered_facility_id=facilities[i % len(facilities)].id,
                created_at=now - timedelta(days=random.randint(1, 180)),
                updated_at=now - timedelta(days=random.randint(0, 30)),
            )
            db.add(p)
            patients.append(p)
        db.flush()

        records: list[ClinicalRecord] = []
        for i in range(160):
            p = patients[i % len(patients)]
            w = workers[i % len(workers)]
            flags = random.choice(RED_FLAGS)
            temp = round(random.uniform(36.4, 39.8), 1)
            sys_bp = random.randint(100, 175)
            spo2 = random.randint(88, 99)
            pulse = random.randint(62, 128)
            if flags or spo2 < 90:
                level = "RED"
            elif spo2 < 94 or temp >= 38.5:
                level = "YELLOW"
            else:
                level = "GREEN"
            rec = ClinicalRecord(
                patient_id=p.id,
                worker_id=w.id,
                chief_complaint=random.choice(COMPLAINTS),
                symptoms=", ".join(random.sample(SYMPTOMS, k=2)),
                duration=random.choice(["1 day", "3 days", "1 week", "2 weeks"]),
                temperature=temp,
                systolic_bp=sys_bp,
                diastolic_bp=random.randint(60, 100),
                pulse=pulse,
                spo2=spo2,
                existing_conditions=random.choice(CONDITIONS),
                current_medications=random.choice(MEDS),
                red_flag_symptoms=flags,
                triage_level=level,
                notes="Synthetic clinical note for demo.",
                created_at=now - timedelta(days=random.randint(0, 60), hours=random.randint(0, 20)),
            )
            db.add(rec)
            records.append(rec)
        db.flush()

        consults: list[Consultation] = []
        for i in range(110):
            p = patients[i % len(patients)]
            doc = doctors[i % len(doctors)]
            w = workers[i % len(workers)]
            rec = records[i % len(records)]
            created = now - timedelta(days=random.randint(0, 10), hours=random.randint(0, 12))
            st = STATUSES[i % len(STATUSES)] if i > 25 else random.choice(["WAITING", "WAITING", "IN_PROGRESS", "COMPLETED"])
            if i < 18:
                st = "WAITING"
            consult = Consultation(
                patient_id=p.id,
                doctor_id=doc.id,
                frontline_worker_id=w.id,
                facility_id=p.registered_facility_id or facilities[0].id,
                token_number=f"AC-{(p.registered_facility_id or 1)}-{created.strftime('%Y%m%d')}-{i+1:03d}",
                priority={"RED": "CRITICAL", "YELLOW": "HIGH", "GREEN": "ROUTINE"}[rec.triage_level],
                status=st,
                estimated_wait_minutes=random.randint(5, 90),
                specialist_type=doc.specialization or "General Medicine",
                clinical_record_id=rec.id,
                created_at=created,
                started_at=created + timedelta(minutes=20) if st in ("IN_PROGRESS", "COMPLETED") else None,
                completed_at=created + timedelta(minutes=45) if st == "COMPLETED" else None,
            )
            db.add(consult)
            consults.append(consult)
        db.flush()

        for i, c in enumerate(consults[:70]):
            if c.status != "COMPLETED":
                continue
            db.add(
                Prescription(
                    consultation_id=c.id,
                    doctor_id=c.doctor_id or doctors[0].id,
                    medicine_name=random.choice(["Paracetamol", "ORS", "Amoxicillin", "Ibuprofen", "Cetirizine"]),
                    dosage=random.choice(["500mg", "250mg", "1 tablet"]),
                    frequency=random.choice(["1-0-1", "1-1-1", "once daily"]),
                    duration=random.choice(["3 days", "5 days", "7 days"]),
                    instructions="Prototype documentation only — not a validated prescription.",
                    created_at=c.completed_at or now,
                )
            )

        referrals: list[Referral] = []
        for i in range(36):
            p = patients[i + 5]
            st = REF_STATUSES[i % len(REF_STATUSES)]
            created = now - timedelta(hours=random.randint(2, 96))
            r = Referral(
                patient_id=p.id,
                from_facility_id=facilities[i % 5].id,
                to_facility_id=facilities[(i + 3) % 10].id,
                referred_by=workers[i % len(workers)].id,
                specialist_id=doctors[i % len(doctors)].id,
                reason=random.choice(["Specialist review for persistent fever", "Ante-natal high-risk", "Suspected TB workup", "Cardiac evaluation"]),
                priority=random.choice(["CRITICAL", "HIGH", "ROUTINE"]),
                status=st,
                created_at=created,
                accepted_at=created + timedelta(hours=4) if st not in ("CREATED",) else None,
                completed_at=created + timedelta(days=2) if st == "COMPLETED" else None,
                consultation_id=consults[i].id if i < len(consults) else None,
            )
            db.add(r)
            referrals.append(r)
        db.flush()

        for i in range(40):
            due = now + timedelta(days=random.randint(-8, 12))
            st = "COMPLETED" if i % 5 == 0 else ("OVERDUE" if due < now else "DUE")
            db.add(
                Followup(
                    patient_id=patients[i + 8].id,
                    referral_id=referrals[i % len(referrals)].id if i < 30 else None,
                    assigned_worker_id=workers[i % len(workers)].id,
                    due_date=due,
                    status=st,
                    notes="Synthetic follow-up reminder.",
                    completed_at=due if st == "COMPLETED" else None,
                    created_at=now - timedelta(days=5),
                )
            )

        for i, u in enumerate(workers[:8] + doctors[:5] + [admin]):
            db.add(
                Notification(
                    user_id=u.id,
                    title=random.choice(
                        [
                            "Your consultation is approaching.",
                            "Referral accepted by General Medicine.",
                            "Follow-up due tomorrow.",
                            "Network restored. 3 records synchronized.",
                        ]
                    ),
                    message="Synthetic notification for the ArogyaConnect prototype.",
                    type=random.choice(["QUEUE", "REFERRAL", "FOLLOWUP", "SYNC"]),
                    is_read=i % 3 == 0,
                    created_at=now - timedelta(hours=i),
                )
            )

        for i in range(12):
            db.add(
                SyncOperation(
                    user_id=workers[i % len(workers)].id,
                    operation_type="CREATE",
                    entity_type=random.choice(["patient", "triage", "referral"]),
                    entity_id=str(patients[i].id),
                    payload={"demo": True},
                    status=random.choice(["SYNCED", "SYNCED", "PENDING", "FAILED"]),
                    idempotency_key=f"seed-{i}",
                    created_at=now - timedelta(hours=i * 3),
                    synced_at=now - timedelta(hours=i) if i % 4 != 2 else None,
                )
            )

        actions = [
            "Patient created",
            "Patient updated",
            "Triage submitted",
            "Consultation assigned",
            "Referral created",
            "Referral status changed",
            "Follow-up completed",
        ]
        for i in range(40):
            db.add(
                AuditLog(
                    user_id=random.choice(workers + doctors + [admin]).id,
                    action=actions[i % len(actions)],
                    entity_type=random.choice(["patient", "consultation", "referral", "followup"]),
                    entity_id=str(random.randint(1, 80)),
                    timestamp=now - timedelta(hours=i * 2),
                    details="Synthetic audit event",
                )
            )

        db.commit()
        print("Seed complete.")
        print("DEMO / SYNTHETIC DATA — NOT FOR CLINICAL USE")
        print(f"  Frontline: asha.demo@arogyaconnect.test / {PASSWORD}")
        print(f"  Doctor:    doctor.demo@arogyaconnect.test / {PASSWORD}")
        print(f"  Admin:     admin.demo@arogyaconnect.test / {PASSWORD}")
        print(f"  Patients: {db.query(Patient).count()}  Consultations: {db.query(Consultation).count()}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
