"""Add real Bengaluru healthcare facilities to an existing ArogyaConnect database."""

from datetime import datetime

from app.database import SessionLocal, init_db
from app.models import Facility


BENGALURU_FACILITIES = [
    # name, type, locality, district, latitude, longitude

    ("Bangalore Baptist Hospital", "HOSPITAL", "Hebbal", "Bengaluru Urban", 13.035246, 77.589892),
    ("Bowring & Lady Curzon Hospitals", "HOSPITAL", "Shivajinagar", "Bengaluru Urban", 12.982313, 77.604573),
    ("Victoria Hospital", "HOSPITAL", "City Market", "Bengaluru Urban", 12.963389, 77.573819),
    ("Vanivilas Women and Children Hospital", "HOSPITAL", "K.R. Market", "Bengaluru Urban", 12.962138, 77.573752),
    ("Jayadeva Institute of Cardiovascular Sciences", "HOSPITAL", "Jayanagar", "Bengaluru Urban", 12.917900, 77.599205),
    ("Jayanagar General Hospital", "HOSPITAL", "Jayanagar", "Bengaluru Urban", 12.926518, 77.592942),
    ("HOSMAT Hospital", "HOSPITAL", "Magrath Road", "Bengaluru Urban", 12.968840, 77.613730),
    ("Indira Gandhi Institute of Child Health", "HOSPITAL", "Jayanagar", "Bengaluru Urban", 12.937318, 77.592016),
    ("Rajiv Gandhi Institute of Chest Diseases", "HOSPITAL", "Hombegowda Nagar", "Bengaluru Urban", 12.938299, 77.591095),
    ("Fortis Hospital Bannerghatta Road", "HOSPITAL", "Bannerghatta Road", "Bengaluru Urban", 12.894510, 77.598732),

    ("BGS Global Hospital", "HOSPITAL", "Kengeri", "Bengaluru Urban", 12.902854, 77.497792),
    ("HCG Cancer Centre", "HOSPITAL", "Sampangiram Nagar", "Bengaluru Urban", 12.964593, 77.589608),
    ("Cloudnine Hospital Whitefield", "HOSPITAL", "Whitefield", "Bengaluru Urban", 12.988007, 77.732156),
    ("Columbia Asia Hospital Sarjapur Road", "HOSPITAL", "Sarjapur Road", "Bengaluru Urban", 12.919970, 77.665256),
    ("Columbia Asia Hospital Whitefield", "HOSPITAL", "Whitefield", "Bengaluru Urban", 12.958214, 77.745392),
    ("Command Hospital Air Force", "HOSPITAL", "Ulsoor", "Bengaluru Urban", 12.963209, 77.628580),
    ("Diacon Hospital", "HOSPITAL", "Yeshwanthpur", "Bengaluru Urban", 13.003812, 77.549839),
    ("Femiint Health Whitefield", "HOSPITAL", "Whitefield", "Bengaluru Urban", 12.958315, 77.746683),
    ("Svastha Hospital", "HOSPITAL", "Whitefield", "Bengaluru Urban", 12.966142, 77.749261),
    ("Varthur Government Hospital PHC", "PHC", "Varthur", "Bengaluru Urban", 12.937775, 77.746538),

    ("Vydehi Institute of Medical Sciences", "HOSPITAL", "Whitefield", "Bengaluru Urban", 12.979700, 77.730300),
    ("Sri Sathya Sai Institute of Higher Medical Sciences", "HOSPITAL", "Whitefield", "Bengaluru Urban", 12.980846, 77.730299),
    ("Narayana Multispeciality Hospital Whitefield", "HOSPITAL", "Whitefield", "Bengaluru Urban", 12.994799, 77.701702),
    ("Narayana Multispeciality Hospital HSR Layout", "HOSPITAL", "HSR Layout", "Bengaluru Urban", 12.908343, 77.643567),
    ("Maharaja Agrasen Hospital", "HOSPITAL", "Padmanabhanagar", "Bengaluru Urban", 12.915969, 77.555005),

    ("Amrik Hospital", "HOSPITAL", "Whitefield", "Bengaluru Urban", 12.983010, 77.748263),
    ("Annaswamy Mudaliar General Hospital", "HOSPITAL", "Shivajinagar", "Bengaluru Urban", 13.000279, 77.615356),
    ("Church of South India Hospital", "HOSPITAL", "Richmond Town", "Bengaluru Urban", 12.990883, 77.601251),
    ("Dr. Agarwals Eye Hospital Whitefield", "HOSPITAL", "Whitefield", "Bengaluru Urban", 12.966253, 77.749291),
    ("Dr. R. Munisingh Hospital", "HOSPITAL", "Whitefield", "Bengaluru Urban", 12.976935, 77.751242),

    ("RVM Foundation Humanitarian Hospital", "HOSPITAL", "Bengaluru", "Bengaluru Urban", 12.958579, 77.656552),
    ("Vivus Heart Hospital", "HOSPITAL", "Bengaluru", "Bengaluru Urban", 12.989647, 77.592755),
    ("Vokkaligara Sangha Dental College and Hospital", "HOSPITAL", "Bengaluru", "Bengaluru Urban", 12.954319, 77.574737),
    ("Vydehi Institute of Dental Sciences", "HOSPITAL", "Whitefield", "Bengaluru Urban", 12.975348, 77.731407),
    ("Anekal Government Hospital", "PHC", "Anekal", "Bengaluru Urban", 12.709032, 77.613172),

    ("NIMHANS", "HOSPITAL", "Hosur Road", "Bengaluru Urban", 12.941600, 77.596300),
    ("St. John's Medical College Hospital", "HOSPITAL", "Koramangala", "Bengaluru Urban", 12.927900, 77.627600),
    ("St. Martha's Hospital", "HOSPITAL", "N.R. Road", "Bengaluru Urban", 12.969900, 77.586900),
    ("M.S. Ramaiah Memorial Hospital", "HOSPITAL", "MSR Nagar", "Bengaluru Urban", 13.030300, 77.564700),
    ("Sagar Hospitals Jayanagar", "HOSPITAL", "Jayanagar", "Bengaluru Urban", 12.925600, 77.593800),
    ("Sakra World Hospital", "HOSPITAL", "Marathahalli", "Bengaluru Urban", 12.939500, 77.690000),

    ("Aster CMI Hospital", "HOSPITAL", "Hebbal", "Bengaluru Urban", 13.054400, 77.593700),
    ("Manipal Hospital Old Airport Road", "HOSPITAL", "Old Airport Road", "Bengaluru Urban", 12.958100, 77.647800),
    ("Manipal Hospital Whitefield", "HOSPITAL", "Whitefield", "Bengaluru Urban", 12.988700, 77.730800),
    ("Manipal Hospital Millers Road", "HOSPITAL", "Millers Road", "Bengaluru Urban", 12.991500, 77.592500),
    ("Manipal Northside Hospital", "HOSPITAL", "Malleswaram", "Bengaluru Urban", 13.009500, 77.570600),

    ("Narayana Institute of Cardiac Sciences", "HOSPITAL", "Bommasandra", "Bengaluru Urban", 12.800700, 77.699700),
    ("Ramaiah Memorial Hospital", "HOSPITAL", "MSR Nagar", "Bengaluru Urban", 13.030000, 77.565000),
    ("St. Philomena's Hospital", "HOSPITAL", "Richmond Town", "Bengaluru Urban", 12.964700, 77.605500),
    ("Kidwai Memorial Institute of Oncology", "HOSPITAL", "Jayanagar", "Bengaluru Urban", 12.930000, 77.593000),
    ("Minto Ophthalmic Hospital", "HOSPITAL", "K.R. Market", "Bengaluru Urban", 12.962700, 77.574600),
]


def add_facilities():
    init_db()
    db = SessionLocal()

    try:
        added = 0
        skipped = 0

        for (
            name,
            facility_type,
            village,
            district,
            latitude,
            longitude,
        ) in BENGALURU_FACILITIES:

            existing = (
                db.query(Facility)
                .filter(Facility.name == name)
                .first()
            )

            if existing:
                skipped += 1
                continue

            facility = Facility(
                name=name,
                type=facility_type,
                village=village,
                district=district,
                state="Karnataka",
                latitude=latitude,
                longitude=longitude,
                connectivity_status="ONLINE",
                created_at=datetime.utcnow(),
            )

            db.add(facility)
            added += 1

        db.commit()

        print(f"Added: {added}")
        print(f"Already existed: {skipped}")
        print(f"Total facilities: {db.query(Facility).count()}")

    finally:
        db.close()


if __name__ == "__main__":
    add_facilities()