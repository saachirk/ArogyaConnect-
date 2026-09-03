import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { askGemini } from '../lib/gemini';
import { supabase } from '../lib/supabase';
import { LanguageSelector, useLanguage } from '../lib/i18n';

// Strips ```json fences (Gemini sometimes wraps JSON in markdown) and parses safely.
function safeParseJson(raw: string): any | null {
  try {
    const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

type Assessment = {
  urgency: 'critical' | 'moderate' | 'low';
  reasoning: string;
  recommended_action: string;
};

export default function AshaCompleteDashboard() {
  const { ashaId } = useLocalSearchParams();
  const router = useRouter();
  const { t } = useLanguage();

  // ============================================================
  // ALL HOOKS DECLARED UP FRONT — none of these may sit below a
  // conditional return, or React will throw "Rendered more hooks
  // than during the previous render" once ashaData finishes loading.
  // ============================================================

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<'home' | 'patients' | 'triage' | 'referrals' | 'followups' | 'documents'>('home');

  // ASHA Worker Profile State
  const [ashaData, setAshaData] = useState<any>(null);

  // Triage Cases State from Supabase
  const [triageCases, setTriageCases] = useState<any[]>([]);

  // Currently selected Supabase triage case for detail/verification view
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const activeSupabaseCase = triageCases.find((c) => c.id === selectedCaseId) || triageCases[0];
  const [draftVitals, setDraftVitals] = useState({
    temperature: '',
    bloodPressure: '',
    spo2: '',
    heartRate: '',
    respiratoryRate: '',
  });

  const [geminiResponse, setGeminiResponse] = useState('');
  const [loadingGemini, setLoadingGemini] = useState(false);

  // Follow-up Q&A + risk assessment state
  const [parsedQuestions, setParsedQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loadingAssessment, setLoadingAssessment] = useState(false);
  const [priorityQueue, setPriorityQueue] = useState<any[]>([]);
  const [loadingPriority, setLoadingPriority] = useState(false);

  // New patient / triage case form
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [newPatientAge, setNewPatientAge] = useState('');
  const [newPatientGender, setNewPatientGender] = useState('');
  const [newCaseSymptoms, setNewCaseSymptoms] = useState('');
  const [newCaseDuration, setNewCaseDuration] = useState('');
  const [addingCase, setAddingCase] = useState(false);

  // Referral Management State
  const [referrals, setReferrals] = useState([
    { id: 'ref-1', patientName: 'Ramesh Kumar', destination: 'District Hospital Hub', reason: 'Unstable SpO₂ & chest discomfort', priority: '🔴 Urgent', transportStatus: 'Waiting for transport' }
  ]);

  // Document Upload State
  const [capturedDocs, setCapturedDocs] = useState<string[]>(['Prescription_Aug2026.pdf']);

  // ------------------------------------------------------------
  // ALL useEffect calls also live up here, before any early return
  // ------------------------------------------------------------

  useEffect(() => {
    const loadAshaData = async () => {
      if (!ashaId) return;

      const { data, error } = await supabase
        .from('asha_workers')
        .select('*')
        .eq('id', ashaId)
        .single();

      if (error) {
        console.log('Error loading ASHA data:', error);
        return;
      }

      console.log('Loaded ASHA data:', data);
      setAshaData(data);
    };

    loadAshaData();
  }, [ashaId]);

  // Reset the Q&A flow whenever the selected case changes, so answers from
  // one patient don't bleed into another.
  useEffect(() => {
    setGeminiResponse('');
    setParsedQuestions([]);
    setAnswers({});
    setAssessment(null);
    if (activeSupabaseCase) {
      setDraftVitals({
        temperature: activeSupabaseCase.temperature == null ? '' : String(activeSupabaseCase.temperature),
        bloodPressure: activeSupabaseCase.blood_pressure || '',
        spo2: activeSupabaseCase.spo2 == null ? '' : String(activeSupabaseCase.spo2),
        heartRate: activeSupabaseCase.heart_rate == null ? '' : String(activeSupabaseCase.heart_rate),
        respiratoryRate: activeSupabaseCase.respiratory_rate == null ? '' : String(activeSupabaseCase.respiratory_rate),
      });
    }
  }, [selectedCaseId]);

  // Fetch Live Triage Cases from Supabase
  useEffect(() => {
    const loadTriageCases = async () => {
      const { data, error } = await supabase
        .from('triage_cases')
        .select(`
          *,
          patients (
            name,
            phone,
            age,
            gender,
            known_conditions
          ),
          asha_workers (
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.log('Error loading triage cases:', error);
        return;
      }

      setTriageCases(data || []);
      if (data && data.length > 0 && !selectedCaseId) {
        setSelectedCaseId(data[0].id);
      }
    };

    loadTriageCases();
  }, []);

  // ============================================================
  // Now it's safe to bail early — every hook above has already run
  // on every render, so short-circuiting here doesn't change hook count.
  // ============================================================
  if (!ashaData) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading ASHA profile...</Text>
      </View>
    );
  }

  // Gemini Clinical Follow-Up Analyzer for Supabase Records
  const testGeminiForCase = async (supabaseCase: any) => {
    if (!supabaseCase) {
      Alert.alert('No Case Selected', 'Please choose a patient case to analyze.');
      return;
    }

    try {
      setLoadingGemini(true);
      setGeminiResponse('Analyzing patient case with Gemini...');
      setParsedQuestions([]);
      setAnswers({});
      setAssessment(null);

      const casePayload = {
        patient_name: supabaseCase.patients?.name || 'Unknown Patient',
        age: supabaseCase.age,
        gender: supabaseCase.gender,
        known_conditions: supabaseCase.patients?.known_conditions || 'None listed',
        symptoms: supabaseCase.symptoms,
        symptom_duration: supabaseCase.symptom_duration,
        vitals: {
          temperature: `${supabaseCase.temperature}°C`,
          spO2: `${supabaseCase.spo2}%`,
          heart_rate: `${supabaseCase.heart_rate} bpm`,
          blood_pressure: supabaseCase.blood_pressure,
          respiratory_rate: `${supabaseCase.respiratory_rate} /min`,
        },
        status: supabaseCase.status,
      };

      const prompt = `
You are an AI clinical triage assistant helping an ASHA worker.

Analyze the following patient case fetched directly from the database.

PATIENT CASE:
${JSON.stringify(casePayload, null, 2)}

Your job is NOT to diagnose the patient.


Generate ONLY relevant follow-up questions based on the symptoms, vitals, age, gender, and medical history.

Do not ask generic questions.

Return ONLY valid JSON in this exact format:

{
  "questions": [
    "question 1",
    "question 2",
    "question 3"
  ]
}

If no additional questions are needed, return:

{
  "questions": []
}
`;

      const answer = await askGemini(prompt);
      console.log('GEMINI FOLLOW-UP QUESTIONS:', answer);
      setGeminiResponse(answer);

      const parsed = safeParseJson(answer);
      if (parsed && Array.isArray(parsed.questions)) {
        setParsedQuestions(parsed.questions);
      } else {
        setParsedQuestions([]);
      }
    } catch (error) {
      console.log('GEMINI ERROR:', error);
      setGeminiResponse(String(error));
    } finally {
      setLoadingGemini(false);
    }
  };

  // Send the worker's answers back to Gemini and get a critical/moderate/low verdict
  const getAssessment = async () => {
    if (!activeSupabaseCase) return;

    const unanswered = parsedQuestions.filter((_, i) => !answers[i]?.trim());
    if (unanswered.length > 0) {
      Alert.alert('Missing Answers', 'Please answer all follow-up questions before requesting an assessment.');
      return;
    }

    try {
      setLoadingAssessment(true);
      setAssessment(null);

      const qaPairs = parsedQuestions.map((q, i) => ({ question: q, answer: answers[i] }));

      const casePayload = {
        patient_name: activeSupabaseCase.patients?.name || 'Unknown Patient',
        age: activeSupabaseCase.age,
        gender: activeSupabaseCase.gender,
        known_conditions: activeSupabaseCase.patients?.known_conditions || 'None listed',
        symptoms: activeSupabaseCase.symptoms,
        symptom_duration: activeSupabaseCase.symptom_duration,
        vitals: {
          temperature: `${activeSupabaseCase.temperature}°C`,
          spO2: `${activeSupabaseCase.spo2}%`,
          heart_rate: `${activeSupabaseCase.heart_rate} bpm`,
          blood_pressure: activeSupabaseCase.blood_pressure,
          respiratory_rate: `${activeSupabaseCase.respiratory_rate} /min`,
        },
      };

      const prompt = `
You are an AI clinical triage assistant helping an ASHA worker decide whether a patient case needs urgent escalation to a doctor.

You are NOT diagnosing the patient. You are producing a triage risk level to help prioritize doctor review.

PATIENT CASE:
${JSON.stringify(casePayload, null, 2)}

FOLLOW-UP QUESTIONS AND THE ASHA WORKER'S ANSWERS:
${JSON.stringify(qaPairs, null, 2)}

Based on all of this information, assess the urgency of this case.

Return ONLY valid JSON in this exact format:

{
  "urgency": "critical" | "moderate" | "low",
  "reasoning": "1-2 sentence explanation in plain language an ASHA worker can understand",
  "recommended_action": "1 short sentence on what the ASHA worker should do next"
}
`;

      const raw = await askGemini(prompt);
      console.log('GEMINI ASSESSMENT:', raw);
      const parsed = safeParseJson(raw);

      if (!parsed || !parsed.urgency) {
        throw new Error('Could not parse a valid assessment from Gemini. Try again.');
      }

      const { error: saveError } = await supabase
        .from('triage_cases')
        .update({
          ai_triage_level: parsed.urgency,
          ai_urgency: parsed.urgency,
          ai_recommended_action: parsed.recommended_action,
          ai_followup_answers: qaPairs,
        })
        .eq('id', activeSupabaseCase.id);

      if (saveError) {
        throw saveError;
      }

      setAssessment(parsed);
      Alert.alert(t('success'), t('triageSuccess'));
    } catch (error) {
      Alert.alert('Assessment Failed', String(error));
    } finally {
      setLoadingAssessment(false);
    }
  };

  const prioritizeCases = async () => {
    try {
      setLoadingPriority(true);

      // Get all active cases
      const { data, error } = await supabase
        .from('triage_cases')
        .select(`
          *,
          patients (
            name
          )
        `)
        .neq('status', 'Closed');

      if (error) {
        console.log('Error fetching cases:', error);
        return;
      }

      if (!data || data.length === 0) {
        setPriorityQueue([]);
        return;
      }

      const prompt = `
You are assisting a doctor in prioritizing rural healthcare cases.

Review the following active triage cases and rank them from most urgent to least urgent.

Do NOT diagnose patients.
IMPORTANT: If a case has "ai_urgency": "critical" already set, treat it as a
confirmed clinical verdict from a completed assessment and rank it at or near
the top — do not downgrade it based on vitals alone. Cases without an
ai_urgency value should be ranked using symptoms and vitals only.

Use the available symptoms, vitals, AI assessment, and other information.

Return ONLY valid JSON in this format:

[
  {
    "case_id": "case id",
    "priority": 1,
    "urgency": "Emergency",
    "reason": "short reason"
  }
]

Cases:
${JSON.stringify(data)}
`;

      const response = await askGemini(prompt);

      const cleaned = response
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

      const parsed = JSON.parse(cleaned);

      setPriorityQueue(parsed);

    } catch (error) {
      console.log('Priority queue error:', error);
    } finally {
      setLoadingPriority(false);
    }
  };

  // Submit Verified Case Status back to Supabase
  const handleSubmitVerifiedCase = async () => {
    if (!activeSupabaseCase) return;

    const nextStatus = assessment?.urgency === 'critical'
      ? 'Urgent - Doctor Review'
      : 'Awaiting Doctor Review';

    try {
      const { error } = await supabase
        .from('triage_cases')
        .update({
          temperature: draftVitals.temperature === '' ? null : Number(draftVitals.temperature),
          blood_pressure: draftVitals.bloodPressure || null,
          spo2: draftVitals.spo2 === '' ? null : Number(draftVitals.spo2),
          heart_rate: draftVitals.heartRate === '' ? null : Number(draftVitals.heartRate),
          respiratory_rate: draftVitals.respiratoryRate === '' ? null : Number(draftVitals.respiratoryRate),
          status: nextStatus,
        })
        .eq('id', activeSupabaseCase.id);

      if (error) throw error;

      // Update local state queue
      setTriageCases((prev) =>
        prev.map((c) => (c.id === activeSupabaseCase.id ? { ...c, status: nextStatus } : c))
      );

      Alert.alert(t('success'), t('triageSuccess'));
    } catch (err) {
      Alert.alert(t('error'), t('failedSubmit'));
    }
  };

  // Referral Ambulance Request Handler
  const handleRequestAmbulance = (patientName: string) => {
    Alert.alert('Ambulance Dispatched', `Emergency transport requested from District Hospital Hub for ${patientName}. Status updated to: Transport Assigned.`);
    setReferrals((prev) =>
      prev.map((r) => (r.patientName === patientName ? { ...r, transportStatus: 'Transport Assigned / En Route' } : r))
    );
  };

  // Document Upload Handler via Document Picker
  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setCapturedDocs((prev) => [file.name, ...prev]);
        Alert.alert('Document Attached', `${file.name} has been linked to the patient profile.`);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not capture document.');
    }
  };

  const handleAddNewTriageCase = async () => {
    if (
      !newPatientName ||
      !newPatientPhone ||
      !newPatientAge ||
      !newPatientGender ||
      !newCaseSymptoms ||
      !newCaseDuration
    ) {
      Alert.alert(
        'Missing Details',
        'Please fill in all required patient and case details.'
      );
      return;
    }

    try {
      setAddingCase(true);

      // Create the new patient
      const { data: newPatient, error: patientError } = await supabase
        .from('patients')
        .insert({
          name: newPatientName,
          phone: newPatientPhone,
          age: Number(newPatientAge),
          gender: newPatientGender,
        })
        .select()
        .single();

      if (patientError || !newPatient) {
        throw new Error(
          patientError?.message || 'Could not create patient.'
        );
      }

      // Create the triage case
      const { data: newCase, error: caseError } = await supabase
        .from('triage_cases')
        .insert({
          patient_id: newPatient.id,
          asha_id: ashaId,
          age: Number(newPatientAge),
          gender: newPatientGender,
          symptoms: newCaseSymptoms,
          symptom_duration: newCaseDuration,
          status: 'Pending',
        })
        .select()
        .single();

      if (caseError || !newCase) {
        throw new Error(
          caseError?.message || 'Could not create triage case.'
        );
      }

      console.log('New patient created:', newPatient);
      console.log('New triage case created:', newCase);

      Alert.alert(t('success'), t('patientDetailsSuccess'));

      // Clear the form
      setNewPatientName('');
      setNewPatientPhone('');
      setNewPatientAge('');
      setNewPatientGender('');
      setNewCaseSymptoms('');
      setNewCaseDuration('');

      // Add the new case to the current queue immediately
      setTriageCases((prev) => [newCase, ...prev]);
      setSelectedCaseId(newCase.id);

    } catch (error) {
      console.log('Error adding new triage case:', error);

      Alert.alert(
        'Submission Failed',
        error instanceof Error
          ? error.message
          : 'Could not add the triage case.'
      );
    } finally {
      setAddingCase(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t('ashaTitle')}</Text>
          <Text style={styles.subtitle}>Worker: {ashaData.name} | {ashaData.subCenter}</Text>
          <LanguageSelector />
        </View>
        <View style={styles.headerRight}>
          <View style={styles.offlineBadge}>
            <Text style={styles.offlineText}>⚠ Offline Mode ({ashaData.offlinePendingCount} pending sync)</Text>
          </View>
          <Pressable onPress={() => router.replace('/' as any)}>
            <Text style={styles.logoutText}>{t('logout')}</Text>
          </Pressable>
        </View>
      </View>

      {/* Navigation Tab Bar */}
      <View style={styles.navBar}>
        {(['home', 'patients', 'triage', 'referrals', 'followups', 'documents'] as const).map((tab) => (
          <Pressable
            key={tab}
            style={[styles.navTab, activeTab === tab && styles.navTabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.navTabText, activeTab === tab && styles.navTabTextActive]}>
              {tab.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* ================= 1. HOME TAB ================= */}
        {activeTab === 'home' && (
          <View>
            <View style={styles.card}>
              <Text style={styles.cardHeader}>{t('operationalSummary')}</Text>
              <View style={styles.metricRow}>
                <View style={[styles.metricBox, { backgroundColor: '#fef2f2' }]}>
                  <Text style={[styles.metricVal, { color: '#dc2626' }]}>{triageCases.length}</Text>
                  <Text style={styles.metricLbl}>{t('liveCases')}</Text>
                </View>
                <View style={[styles.metricBox, { backgroundColor: '#fef3c7' }]}>
                  <Text style={[styles.metricVal, { color: '#d97706' }]}>
                    {triageCases.filter(c => c.status === 'Pending').length}
                  </Text>
                  <Text style={styles.metricLbl}>{t('pendingReview')}</Text>
                </View>
                <View style={[styles.metricBox, { backgroundColor: '#f0fdf4' }]}>
                  <Text style={[styles.metricVal, { color: '#16a34a' }]}>4</Text>
                  <Text style={styles.metricLbl}>{t('followupsDue')}</Text>
                </View>
              </View>
              <Pressable style={styles.primaryButton} onPress={() => setActiveTab('triage')}>
                <Text style={styles.primaryButtonText}>{t('triageQueue')} →</Text>
              </Pressable>
              <Pressable
                style={styles.primaryButton}
                onPress={prioritizeCases}
                disabled={loadingPriority}
              >
                <Text style={styles.primaryButtonText}>
                  {loadingPriority
                    ? 'Prioritizing Cases...'
                    : ' Prioritize Cases with AI'}
                </Text>
              </Pressable>
            </View>
            {priorityQueue.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardHeader}>
                  🤖 AI-Prioritized Doctor Queue
                </Text>

                {priorityQueue.map((item, index) => (
                  <View key={item.case_id} style={styles.queueItem}>
                    <Text style={styles.queueName}>
                      #{index + 1} — {item.urgency}
                    </Text>

                    <Text style={styles.metaText}>
                      Case ID: {item.case_id}
                    </Text>

                    <Text style={styles.queueComplaint}>
                      Reason: {item.reason}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            <View style={styles.card}>
              <Text style={styles.cardHeader}>{t('active')} {t('triageQueue')}</Text>
              {triageCases.length === 0 ? (
                <Text style={styles.emptyText}>No triage cases found in database.</Text>
              ) : (
                triageCases.map((item) => (
                  <View key={item.id} style={styles.queueItem}>
                    <Text style={styles.queueName}>
                      {item.patients?.name || 'Unknown Patient'}
                    </Text>
                    <Text style={styles.metaText}>
                      Age: {item.age} • {item.gender} • Phone: {item.patients?.phone}
                    </Text>
                    <Text style={styles.queueComplaint}>
                      Symptoms: {item.symptoms} (Duration: {item.symptom_duration})
                    </Text>
                    <Text style={styles.metaText}>
                      Temp: {item.temperature}°C • SpO₂: {item.spo2}% • HR: {item.heart_rate} bpm
                    </Text>
                    <Text style={styles.metaText}>
                      BP: {item.blood_pressure} • RR: {item.respiratory_rate} /min
                    </Text>
                    <Text style={styles.metaText}>
                      Status: <Text style={{ fontWeight: 'bold', color: '#0d9488' }}>{item.status}</Text>
                    </Text>

                    <Pressable
                      style={styles.secondaryButton}
                      onPress={() => {
                        setSelectedCaseId(item.id);
                        setActiveTab('triage');
                      }}
                    >
                      <Text style={styles.secondaryButtonText}>🔍 {t('verifyTriage')}</Text>
                    </Pressable>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* ================= 2. PATIENTS & REGISTRATION TAB ================= */}
        {activeTab === 'patients' && (
          <View>
            <View style={styles.card}>
              <Text style={styles.cardHeader}>{t('addCase')}</Text>

              <Text style={styles.subtext}>
                Register a new patient and send their case directly to the triage queue.
              </Text>

              <Text style={styles.vitalLabel}>{t('patientName')} *</Text>
              <TextInput
                style={styles.input}
                placeholder={t('patientName')}
                value={newPatientName}
                onChangeText={setNewPatientName}
                editable={true}
              />

              <Text style={styles.vitalLabel}>{t('phone')} *</Text>
              <TextInput
                style={styles.input}
                placeholder={t('phone')}
                keyboardType="phone-pad"
                value={newPatientPhone}
                onChangeText={setNewPatientPhone}
                editable={true}
              />

              <Text style={styles.vitalLabel}>{t('age')} *</Text>
              <TextInput
                style={styles.input}
                placeholder={t('age')}
                keyboardType="numeric"
                value={newPatientAge}
                onChangeText={setNewPatientAge}
                editable={true}
              />

              <Text style={styles.vitalLabel}>{t('gender')} *</Text>
              <TextInput
                style={styles.input}
                placeholder={t('gender')}
                value={newPatientGender}
                onChangeText={setNewPatientGender}
                editable={true}
              />

              <Text style={styles.vitalLabel}>{t('symptoms')} *</Text>
              <TextInput
                style={[styles.input, { minHeight: 70 }]}
                placeholder={t('symptoms')}
                value={newCaseSymptoms}
                onChangeText={setNewCaseSymptoms}
                multiline
                editable={true}
              />

              <Text style={styles.vitalLabel}>{t('duration')} *</Text>
              <TextInput
                style={styles.input}
                placeholder={t('duration')}
                value={newCaseDuration}
                onChangeText={setNewCaseDuration}
                editable={true}
              />

              <Pressable
                style={[
                  styles.primaryButton,
                  addingCase && { backgroundColor: '#94a3b8' },
                ]}
                onPress={handleAddNewTriageCase}
                disabled={addingCase}
              >
                <Text style={styles.primaryButtonText}>
                  {addingCase
                    ? 'Adding Case...'
                    : t('addCaseButton')}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ================= 3. TRIAGE QUEUE & VERIFICATION TAB ================= */}
        {activeTab === 'triage' && (
          <View>
            {/* Patient Selector from Supabase Triage Queue */}
            <View style={styles.card}>
              <Text style={styles.cardHeader}>Select Supabase Case to Verify</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                {triageCases.map((c) => (
                  <Pressable
                    key={c.id}
                    style={[styles.patientChip, activeSupabaseCase?.id === c.id && styles.patientChipActive]}
                    onPress={() => setSelectedCaseId(c.id)}
                  >
                    <Text style={[styles.patientChipText, activeSupabaseCase?.id === c.id && styles.patientChipTextActive]}>
                      {c.patients?.name || 'Patient'}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {activeSupabaseCase ? (
                <View style={styles.patientBanner}>
                  <Text style={styles.bannerTitle}>
                    Active Case: {activeSupabaseCase.patients?.name} ({activeSupabaseCase.age}y)
                  </Text>
                  <Text style={styles.bannerSub}>
                    Symptoms: "{activeSupabaseCase.symptoms}" (Duration: {activeSupabaseCase.symptom_duration})
                  </Text>
                  <Text style={styles.metaText}>
                    Known Conditions: {activeSupabaseCase.patients?.known_conditions || 'None'}
                  </Text>
                </View>
              ) : (
                <Text style={styles.emptyText}>No active patient selected.</Text>
              )}
            </View>

            {/* Structured Vitals View / Verification Box */}
            {activeSupabaseCase && (
              <View style={styles.card}>
                <Text style={styles.cardHeader}>{t('liveVitals')}</Text>
                <View style={styles.vitalsGrid}>
                  <View style={styles.vitalInputBox}>
                    <Text style={styles.vitalLabel}>Temp (°C)</Text>
                    <TextInput style={styles.vitalField} keyboardType="decimal-pad" value={draftVitals.temperature} onChangeText={(text) => setDraftVitals((prev) => ({ ...prev, temperature: text }))} />
                  </View>
                  <View style={styles.vitalInputBox}>
                    <Text style={styles.vitalLabel}>BP (mmHg)</Text>
                    <TextInput style={styles.vitalField} value={draftVitals.bloodPressure} onChangeText={(text) => setDraftVitals((prev) => ({ ...prev, bloodPressure: text }))} />
                  </View>
                  <View style={styles.vitalInputBox}>
                    <Text style={styles.vitalLabel}>SpO₂ (%)</Text>
                    <TextInput style={styles.vitalField} keyboardType="numeric" value={draftVitals.spo2} onChangeText={(text) => setDraftVitals((prev) => ({ ...prev, spo2: text }))} />
                  </View>
                  <View style={styles.vitalInputBox}>
                    <Text style={styles.vitalLabel}>Pulse (bpm)</Text>
                    <TextInput style={styles.vitalField} keyboardType="numeric" value={draftVitals.heartRate} onChangeText={(text) => setDraftVitals((prev) => ({ ...prev, heartRate: text }))} />
                  </View>
                  <View style={styles.vitalInputBox}>
                    <Text style={styles.vitalLabel}>Resp Rate (/min)</Text>
                    <TextInput style={styles.vitalField} keyboardType="numeric" value={draftVitals.respiratoryRate} onChangeText={(text) => setDraftVitals((prev) => ({ ...prev, respiratoryRate: text }))} />
                  </View>
                </View>

                {/* Gemini Trigger Button for Selected DB Record */}
                <Pressable
                  style={styles.primaryButton}
                  onPress={() => testGeminiForCase(activeSupabaseCase)}
                >
                  <Text style={styles.primaryButtonText}>
                    {loadingGemini ? 'Analyzing...' : '✨ Run Gemini Clinical Follow-up Analysis'}
                  </Text>
                </Pressable>

                {/* Follow-up questions -> worker answers them here */}
                {parsedQuestions.length > 0 && (
                  <View style={styles.geminiBox}>
                    <Text style={styles.geminiTitle}>Answer the Follow-up Questions</Text>
                    {parsedQuestions.map((q, i) => (
                      <View key={i} style={{ marginBottom: 10 }}>
                        <Text style={styles.questionText}>{i + 1}. {q}</Text>
                        <TextInput
                          style={styles.answerInput}
                          placeholder="Worker's answer..."
                          value={answers[i] || ''}
                          onChangeText={(text) => setAnswers((prev) => ({ ...prev, [i]: text }))}
                          multiline
                        />
                      </View>
                    ))}

                    <Pressable style={styles.primaryButton} onPress={getAssessment}>
                      <Text style={styles.primaryButtonText}>
                        {loadingAssessment ? 'Assessing...' : '🩺 Get Clinical Risk Assessment'}
                      </Text>
                    </Pressable>
                  </View>
                )}

                {/* Gemini's raw follow-up output, useful for debugging */}
                {geminiResponse !== '' && parsedQuestions.length === 0 && (
                  <View style={styles.geminiBox}>
                    <Text style={styles.geminiTitle}>Gemini Follow-up Questions Output</Text>
                    <Text style={styles.geminiText}>{geminiResponse}</Text>
                  </View>
                )}

                {/* Final urgency verdict */}
                {assessment && (
                  <View style={[
                    styles.assessmentCard,
                    assessment.urgency === 'critical' && styles.assessmentCritical,
                    assessment.urgency === 'moderate' && styles.assessmentModerate,
                    assessment.urgency === 'low' && styles.assessmentLow,
                  ]}>
                    <Text style={styles.assessmentUrgencyText}>
                      {assessment.urgency === 'critical' && '🔴 CRITICAL'}
                      {assessment.urgency === 'moderate' && '🟠 MODERATE'}
                      {assessment.urgency === 'low' && '🟢 LOW RISK'}
                    </Text>
                    <Text style={styles.assessmentReasoning}>{assessment.reasoning}</Text>
                    <Text style={styles.assessmentAction}>Next step: {assessment.recommended_action}</Text>
                  </View>
                )}

                <Pressable style={[styles.primaryButton, { backgroundColor: '#16a34a', marginTop: 12 }]} onPress={handleSubmitVerifiedCase}>
                  <Text style={styles.primaryButtonText}>✓ {t('submitDoctor')}</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {/* ================= 4. REFERRALS TAB ================= */}
        {activeTab === 'referrals' && (
          <View>
            <View style={styles.card}>
              <Text style={styles.cardHeader}>Upward Referral & Transport Management</Text>
              {referrals.map((r) => (
                <View key={r.id} style={styles.referralCard}>
                  <Text style={styles.referralTitle}>Patient: {r.patientName}</Text>
                  <Text style={styles.metaText}>Destination: {r.destination}</Text>
                  <Text style={styles.metaText}>Reason: {r.reason}</Text>
                  <Text style={[styles.metaText, { color: '#dc2626', fontWeight: 'bold' }]}>Priority: {r.priority}</Text>
                  <Text style={styles.metaText}>Transport Status: {r.transportStatus}</Text>

                  <Pressable style={styles.ambulanceButton} onPress={() => handleRequestAmbulance(r.patientName)}>
                    <Text style={styles.ambulanceButtonText}>🚑 Request Ambulance Transport</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ================= 5. FOLLOW-UPS TAB ================= */}
        {activeTab === 'followups' && (
          <View>
            <View style={styles.card}>
              <Text style={styles.cardHeader}>Follow-ups Due Today</Text>
              <View style={styles.followupCard}>
                <Text style={styles.queueName}>Lakshmamma Patil (High Risk)</Text>
                <Text style={styles.metaText}>Due Date: Today | Reason: BP re-check & symptom tracking</Text>
                <Pressable style={styles.primaryButton} onPress={() => Alert.alert('Home Visit Recorded', 'BP re-check logged successfully. Loop closed!')}>
                  <Text style={styles.primaryButtonText}>🏠 Start Home Visit & Log Vitals</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {/* ================= 6. DOCUMENTS TAB ================= */}
        {activeTab === 'documents' && (
          <View>
            <View style={styles.card}>
              <Text style={styles.cardHeader}>Patient Document Vault & Capture</Text>
              <Text style={styles.subtext}>Photograph paper prescriptions or lab reports for villagers directly into their record.</Text>

              <Pressable style={styles.primaryButton} onPress={handlePickDocument}>
                <Text style={styles.primaryButtonText}>📷 Take Photo / Upload Document</Text>
              </Pressable>

              <Text style={[styles.cardHeader, { marginTop: 16 }]}>Stored Documents</Text>
              {capturedDocs.map((doc, idx) => (
                <View key={idx} style={styles.docRow}>
                  <Text style={styles.docName}>📄 {doc}</Text>
                  <Text style={styles.docAction}>View</Text>
                </View>
              ))}
            </View>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyText: { fontSize: 14, color: '#64748b', paddingVertical: 10, textAlign: 'center' },
  geminiBox: { marginTop: 12, padding: 16, backgroundColor: '#f0fdfa', borderRadius: 10, borderWidth: 1, borderColor: '#99f6e4' },
  geminiTitle: { fontSize: 14, fontWeight: 'bold', color: '#134e4a', marginBottom: 6 },
  geminiText: { fontSize: 13, color: '#334155' },
  questionText: { fontSize: 13, fontWeight: '600', color: '#0f172a', marginBottom: 4 },
  answerInput: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#99f6e4', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: '#0f172a', minHeight: 40 },
  assessmentCard: { marginTop: 12, padding: 16, borderRadius: 10, borderWidth: 1 },
  assessmentCritical: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  assessmentModerate: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  assessmentLow: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  assessmentUrgencyText: { fontSize: 15, fontWeight: 'bold', marginBottom: 6, color: '#0f172a' },
  assessmentReasoning: { fontSize: 13, color: '#334155', marginBottom: 6 },
  assessmentAction: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingTop: 50, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { fontSize: 11, color: '#64748b', marginTop: 2 },
  offlineBadge: { backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 10 },
  offlineText: { fontSize: 10, fontWeight: 'bold', color: '#b45309' },
  logoutText: { fontSize: 13, color: '#ef4444', fontWeight: '600' },
  navBar: { flexDirection: 'row', backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingHorizontal: 10 },
  navTab: { paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  navTabActive: { borderBottomColor: '#0d9488' },
  navTabText: { fontSize: 11, fontWeight: '600', color: '#64748b' },
  navTabTextActive: { color: '#0d9488', fontWeight: 'bold' },
  scrollContent: { padding: 16, maxWidth: 850, width: '100%', alignSelf: 'center' },
  card: { backgroundColor: '#ffffff', borderRadius: 10, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { fontSize: 15, fontWeight: 'bold', color: '#0f172a', marginBottom: 6 },
  subtext: { fontSize: 12, color: '#64748b', marginBottom: 10 },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  metricBox: { flex: 1, padding: 10, borderRadius: 8, marginHorizontal: 3, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  metricVal: { fontSize: 20, fontWeight: 'bold' },
  metricLbl: { fontSize: 10, color: '#475569', textAlign: 'center', marginTop: 2 },
  primaryButton: { backgroundColor: '#0d9488', paddingVertical: 11, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  primaryButtonText: { color: '#ffffff', fontSize: 13, fontWeight: 'bold' },
  secondaryButton: { backgroundColor: '#f1f5f9', paddingVertical: 8, borderRadius: 6, alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: '#cbd5e1' },
  secondaryButtonText: { color: '#0f172a', fontSize: 12, fontWeight: '600' },
  queueItem: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  queueName: { fontSize: 13, fontWeight: 'bold', color: '#0f172a' },
  queueComplaint: { fontSize: 11, color: '#475569', marginTop: 2 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: '#0f172a', marginBottom: 10 },
  patientChip: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#f1f5f9', borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#cbd5e1' },
  patientChipActive: { backgroundColor: '#0d9488', borderColor: '#0d9488' },
  patientChipText: { fontSize: 12, fontWeight: '600', color: '#334155' },
  patientChipTextActive: { color: '#ffffff' },
  patientBanner: { backgroundColor: '#f0fdfa', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ccfbf1', marginTop: 8 },
  bannerTitle: { fontSize: 13, fontWeight: 'bold', color: '#134e4a' },
  bannerSub: { fontSize: 12, color: '#0f766e', marginTop: 2 },
  vitalsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  vitalInputBox: { width: '31%', marginBottom: 10 },
  vitalLabel: { fontSize: 11, fontWeight: '600', color: '#475569', marginBottom: 2 },
  vitalField: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 8, fontSize: 12, color: '#0f172a' },
  referralCard: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 10 },
  referralTitle: { fontSize: 13, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  metaText: { fontSize: 12, color: '#475569', marginBottom: 2 },
  ambulanceButton: { backgroundColor: '#dc2626', paddingVertical: 8, borderRadius: 6, alignItems: 'center', marginTop: 8 },
  ambulanceButtonText: { color: '#ffffff', fontSize: 11, fontWeight: 'bold' },
  followupCard: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  docRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: 10, borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 6 },
  docName: { fontSize: 12, fontWeight: '600', color: '#334155' },
  docAction: { fontSize: 12, color: '#0284c7', fontWeight: 'bold' },
});
