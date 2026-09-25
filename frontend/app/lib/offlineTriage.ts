export type OfflineTriageAnswers = {
  symptoms: string;
  symptomDuration: string; // free text, e.g. "3 days", "2 weeks", "5 hours"
  difficultyBreathing: boolean;
  chestPain: boolean;
  unconscious: boolean;
  seizure: boolean;
  severeBleeding: boolean;
  poisoning: boolean;

  // additional structured red-flag checks
  severeDehydration: boolean;
  suspectedFracture: boolean;
  highFever: boolean; // e.g. >=103°F / 39.4°C
  persistentVomiting: boolean;

  // risk-modifying context
  age: number;
  isPregnant: boolean;
  hasChronicCondition: boolean;
  isInfantUnder1: boolean;
};

export type OfflineTriageResult = {
  level: 'RED' | 'YELLOW' | 'GREEN';
  urgency: 'CRITICAL' | 'HIGH' | 'ROUTINE';
  recommendedAction: string;
  matchedReasons: string[]; // what triggered this result, for transparency
};

// Parses free-text duration into approximate days. Returns 0 if unparseable.
function parseDurationToDays(duration: string): number {
  const text = duration.toLowerCase().trim();
  const match = text.match(/(\d+(\.\d+)?)\s*(hour|day|week|month)/);
  if (!match) return 0;

  const value = parseFloat(match[1]);
  const unit = match[3];

  switch (unit) {
    case 'hour':
      return value / 24;
    case 'day':
      return value;
    case 'week':
      return value * 7;
    case 'month':
      return value * 30;
    default:
      return 0;
  }
}

export function runOfflineTriage(
  answers: OfflineTriageAnswers
): OfflineTriageResult {
  const symptoms = answers.symptoms.toLowerCase();
  const matchedReasons: string[] = [];

  // --- RED: structured emergency flags ---
  const emergencyFlags: [boolean, string][] = [
    [answers.difficultyBreathing, 'Difficulty breathing'],
    [answers.chestPain, 'Chest pain'],
    [answers.unconscious, 'Unconsciousness or unresponsiveness'],
    [answers.seizure, 'Seizure'],
    [answers.severeBleeding, 'Severe bleeding'],
    [answers.poisoning, 'Suspected poisoning or overdose'],
    [answers.severeDehydration, 'Severe dehydration'],
    [answers.suspectedFracture, 'Suspected fracture or serious injury'],
    [answers.highFever, 'High fever (103°F / 39.4°C or above)'],
    [answers.persistentVomiting, 'Persistent vomiting, unable to keep fluids down'],
  ];

  for (const [flag, label] of emergencyFlags) {
    if (flag) matchedReasons.push(label);
  }

  if (matchedReasons.length > 0) {
    return {
      level: 'RED',
      urgency: 'CRITICAL',
      recommendedAction:
        'Seek immediate medical attention or contact emergency services.',
      matchedReasons,
    };
  }

  // --- RED: emergency keywords typed by the patient ---
  const emergencyKeywords = [
    'stroke',
    'paralysis',
    'blue lips',
    'blue face',
    'suicide',
    'self harm',
    'high fever with rash',
    'stiff neck',
    'can\'t move',
    'cannot move',
    'severe head injury',
    'coughing blood',
    'vomiting blood',
    'blood in stool',
    'blood in urine',
  ];

  const matchedEmergencyKeywords = emergencyKeywords.filter((keyword) =>
    symptoms.includes(keyword)
  );

  if (matchedEmergencyKeywords.length > 0) {
    return {
      level: 'RED',
      urgency: 'CRITICAL',
      recommendedAction:
        'Seek immediate medical attention or contact emergency services.',
      matchedReasons: matchedEmergencyKeywords,
    };
  }

  // --- YELLOW: concerning keywords or prolonged duration ---
  const concerningKeywords = [
    'fever',
    'vomiting',
    'diarrhea',
    'severe pain',
    'persistent pain',
    'weakness',
    'dizziness',
    'cough',
    'headache',
    'rash',
    'swelling',
    'body ache',
    'sore throat',
    'ear pain',
    'burning urination',
    'loss of appetite',
  ];

  const matchedConcerningKeywords = concerningKeywords.filter((keyword) =>
    symptoms.includes(keyword)
  );

  const durationDays = parseDurationToDays(answers.symptomDuration);
  const isProlonged = durationDays >= 3;
  if (isProlonged) {
    matchedConcerningKeywords.push(
      `Symptoms lasting ${durationDays.toFixed(1)}+ days`
    );
  }

  // Vulnerable groups lower the threshold for escalation
  const isVulnerable =
    answers.isPregnant ||
    answers.hasChronicCondition ||
    answers.isInfantUnder1 ||
    answers.age >= 65;

  if (isVulnerable && matchedConcerningKeywords.length > 0) {
    matchedConcerningKeywords.push(
      answers.isPregnant
        ? 'Pregnant — lower threshold for care'
        : answers.isInfantUnder1
        ? 'Infant under 1 year — lower threshold for care'
        : answers.hasChronicCondition
        ? 'Existing chronic condition — lower threshold for care'
        : 'Age 65+ — lower threshold for care'
    );
  }

  if (matchedConcerningKeywords.length > 0) {
    return {
      level: 'YELLOW',
      urgency: 'HIGH',
      recommendedAction:
        'Please contact an ASHA worker or healthcare facility for further assessment.',
      matchedReasons: matchedConcerningKeywords,
    };
  }

  // --- GREEN: no major warning signs detected ---
  return {
    level: 'GREEN',
    urgency: 'ROUTINE',
    recommendedAction: 'Monitor your symptoms and seek medical care if they worsen.',
    matchedReasons: ['No significant warning signs reported'],
  };
}
