# ArogyaConnect-

**An assisted, offline-first digital healthcare platform for rural and underserved communities.**

ArogyaConnect is designed to improve continuity of care by connecting **patients, frontline health workers, and healthcare providers** through a unified platform. It supports assisted patient onboarding, digital triage, healthcare facility discovery, consultations, referrals, and follow-up management.

## Problem

Rural and underserved communities often face:

* Long travel distances to access healthcare
* Limited availability of specialists
* Fragmented patient information
* Delayed referrals and follow-ups
* Limited visibility into healthcare facility availability
* Connectivity and digital-literacy constraints

## Solution

ArogyaConnect provides an integrated care-access platform that supports the existing healthcare referral chain rather than bypassing it.

### Key Features

* **Assisted Patient Access** — Frontline workers can assist patients with registration and healthcare access.
* **Digital Triage** — Capture symptoms, vitals, red flags, and triage priority digitally.
* **Healthcare Facility Map** — Locate nearby healthcare facilities using the patient's current location.
* **Facility Information** — View facility type, distance, queue information, and specialist availability.
* **Referral Management** — Track referrals between healthcare facilities.
* **Consultation & Queue Management** — Manage patient consultations and waiting queues.
* **Longitudinal Records** — Maintain patient clinical information across interactions.
* **Follow-up Tracking** — Track pending and completed patient follow-ups.
* **Multilingual Support** — Designed to support regional-language healthcare access.
* **Offline-First Architecture** — Designed to support low-connectivity environments through local data caching and synchronization.

## Healthcare Facility Map

The patient dashboard provides access to a dedicated **Nearby Healthcare Facilities** map.

The map:

* Detects the patient's current location
* Displays nearby healthcare facilities
* Calculates distance from the patient
* Sorts facilities by proximity
* Displays facility information through map markers
* Supports web using **Leaflet**
* Supports Android/iOS using **React Native Maps**
* Caches facility data locally for offline access

The current prototype contains both synthetic demonstration facilities and real Bengaluru healthcare facilities for map testing.

## Technology Stack

### Frontend

* React Native
* Expo
* Expo Router
* React Native Maps
* Leaflet
* React Leaflet
* TypeScript

### Backend

* Python
* FastAPI
* SQLAlchemy
* SQLite

### Data & Authentication

* Supabase
* Local caching with AsyncStorage
* Network detection with NetInfo

## Architecture

```text
                    ArogyaConnect
                         |
        +----------------+----------------+
        |                |                |
     Patient       Frontline Worker     Doctor
        |                |                |
        +----------------+----------------+
                         |
                  React Native / Expo
                         |
                    FastAPI API
                         |
                    SQLAlchemy
                         |
                  Local Database
```

## Project Structure

```text
ArogyaConnect/
├── backend/
│   ├── app/
│   │   ├── routers/
│   │   ├── services/
│   │   ├── models.py
│   │   └── main.py
│   ├── seed.py
│   └── add_bengaluru_facilities.py
│
└── frontend/
    ├── app/
    │   └── patient/
    ├── components/
    │   ├── NearbyFacilitiesMap.web.tsx
    │   └── NearbyFacilitiesMap.native.tsx
    └── package.json
```

## Running Locally

### Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv venv

# Install dependencies
pip install -r requirements.txt

# Start API
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend

npm install

npx expo start
```

For web:

```bash
npx expo start --web
```

## Demo Data

The repository contains synthetic demonstration data for development and testing.

```text
DEMO / SYNTHETIC DATA — NOT FOR CLINICAL USE
```

Additional Bengaluru healthcare facilities can be added using:

```bash
python add_bengaluru_facilities.py
```

## Project Status

**Prototype / SIH Development**

Current implementation includes patient access, healthcare facility discovery, digital triage, consultation and referral workflows, and a web/mobile-compatible healthcare facility map.

Further development includes strengthening offline synchronization, multilingual interaction, assisted teleconsultation, diagnostic coordination, medicine availability, and longitudinal care workflows.

## Disclaimer

ArogyaConnect is a prototype developed for demonstration and development purposes. It is **not a clinical decision-support system and should not be used for diagnosis, treatment, or emergency medical care.**
