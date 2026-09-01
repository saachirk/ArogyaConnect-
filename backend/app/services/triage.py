RED_FLAG_KEYWORDS = [
    "chest pain",
    "unconscious",
    "seizure",
    "convulsion",
    "severe bleeding",
    "difficulty breathing",
    "blue lips",
    "stroke",
    "paralysis",
    "suicide",
    "poisoning",
    "high fever with rash",
]


def compute_triage_level(
    *,
    temperature: float | None,
    systolic_bp: int | None,
    pulse: int | None,
    spo2: int | None,
    red_flag_symptoms: str,
    existing_conditions: str,
) -> str:
    """Simple rule-based assistance — NOT a medical diagnosis."""
    flags = (red_flag_symptoms or "").lower()
    if any(k in flags for k in RED_FLAG_KEYWORDS):
        return "RED"
    if spo2 is not None and spo2 < 90:
        return "RED"
    if systolic_bp is not None and systolic_bp >= 180:
        return "RED"
    if pulse is not None and (pulse > 140 or pulse < 40):
        return "RED"
    if temperature is not None and temperature >= 40.0:
        return "RED"

    if spo2 is not None and spo2 < 94:
        return "YELLOW"
    if systolic_bp is not None and systolic_bp >= 160:
        return "YELLOW"
    if temperature is not None and temperature >= 38.5:
        return "YELLOW"
    if pulse is not None and pulse > 110:
        return "YELLOW"
    if existing_conditions and any(
        c in existing_conditions.lower() for c in ["diabetes", "hypertension", "asthma", "heart", "tb", "pregnancy"]
    ):
        return "YELLOW"
    return "GREEN"


def priority_from_triage(level: str) -> str:
    return {"RED": "CRITICAL", "YELLOW": "HIGH", "GREEN": "ROUTINE"}.get(level, "ROUTINE")
