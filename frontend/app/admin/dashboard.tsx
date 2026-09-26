import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
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

const leaderboard = [
  { rank: 1, name: 'Sunita Devi',   cases: 47, badge: '🥇' },
  { rank: 2, name: 'Meera Patil',   cases: 38, badge: '🥈' },
  { rank: 3, name: 'Radha Kumari',  cases: 31, badge: '🥉' },
  { rank: 4, name: 'Geeta Sharma',  cases: 24, badge: '⭐' },
  { rank: 5, name: 'Anita Rao',     cases: 19, badge: '⭐' },
];

const notices = [
  { color: '#fef3c7', text: '🟡 Dengue alert: 3 new cases reported in Block 4. ASHA workers please verify.', border: '#fbbf24' },
  { color: '#dcfce7', text: '🟢 Monthly nutrition camp: Sept 30 at PHC Sector 7. Attendance mandatory.', border: '#4ade80' },
  { color: '#fee2e2', text: '🔴 Vaccine stock updated: BCG & OPV available at Sub-Center 3.', border: '#f87171' },
];

const POLL_OPTIONS = [
  { label: 'Patient load too high', pct: 40 },
  { label: 'Transport issues',       pct: 35 },
  { label: 'Medicine shortage',      pct: 25 },
];

export default function AshaCompleteDashboard() {
  const { ashaId } = useLocalSearchParams();
  const router = useRouter();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<'home' | 'patients' | 'triage' | 'referrals' | 'followups' | 'documents'>('home');
  const [ashaData, setAshaData] = useState<any>(null);
  const [triageCases, setTriageCases] = useState<any[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const activeSupabaseCase = triageCases.find((c) => c.id === selectedCaseId) || triageCases[0];
  const [draftVitals, setDraftVitals] = useState({ temperature: '', bloodPressure: '', spo2: '', heartRate: '', respiratoryRate: '' });
  const [geminiResponse, setGeminiResponse] = useState('');
  const [loadingGemini, setLoadingGemini] = useState(false);
  const [parsedQuestions, setParsedQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loadingAssessment, setLoadingAssessment] = useState(false);
  const [priorityQueue, setPriorityQueue] = useState<any[]>([]);
  const [loadingPriority, setLoadingPriority] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [newPatientAge, setNewPatientAge] = useState('');
  const [newPatientGender, setNewPatientGender] = useState('');
  const [newCaseSymptoms, setNewCaseSymptoms] = useState('');
  const [newCaseDuration, setNewCaseDuration] = useState('');
  const [addingCase, setAddingCase] = useState(false);
  const [referrals, setReferrals] = useState([
    { id: 'ref-1', patientName: 'Ramesh Kumar', destination: 'District Hospital Hub', reason: 'Unstable SpO₂ & chest discomfort', priority: '🔴 Urgent', transportStatus: 'Waiting for transport' },
  ]);
  const [capturedDocs, setCapturedDocs] = useState<string[]>(['Prescription_Aug2026.pdf']);
  const [noticeIndex, setNoticeIndex] = useState(0);
  const [pollVoted, setPollVoted] = useState(false);
  const [pollChoice, setPollChoice] = useState<string | null>(null);

  useEffect(() => {
    const loadAshaData = async () => {
      if (!ashaId) return;
      const { data, error } = await supabase.from('asha_workers').select('*').eq('id', ashaId).single();
      if (error) { console.log('Error loading ASHA data:', error); return; }
      setAshaData(data);
    };
    loadAshaData();
  }, [ashaId]);

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

  useEffect(() => {
    const loadTriageCases = async () => {
      const { data, error } = await supabase
        .from('triage_cases')
        .select('*, patients(name,phone,age,gender,known_conditions), asha_workers(full_name)')
        .order('created_at', { ascending: false });
      if (error) { console.log('Error loading triage cases:', error); return; }
      setTriageCases(data || []);
      if (data && data.length > 0 && !selectedCaseId) setSelectedCaseId(data[0].id);
    };
    loadTriageCases();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNoticeIndex((prev) => (prev + 1) % notices.length), 3000);
    return () => clearInterval(timer);
  }, []);

  if (ashaId && !ashaData) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f4f8' }}>
        <Text style={{ color: '#0f2744', fontSize: 15, fontWeight: '700' }}>Loading ASHA profile...</Text>
      </View>
    );
  }

  const dashboardProfile = ashaData || { name: 'Administrator', subCenter: 'Admin Operations', offlinePendingCount: 0 };

  const testGeminiForCase = async (supabaseCase: any) => {
    if (!supabaseCase) { Alert.alert('No Case Selected', 'Please choose a patient case to analyze.'); return; }
    try {
      setLoadingGemini(true);
      setGeminiResponse('Analyzing patient case with Gemini...');
      setParsedQuestions([]);
      setAnswers({});
      setAssessment(null);
      const casePayload = {
        patient_name: supabaseCase.patients?.name || 'Unknown Patient',
        age: supabaseCase.age, gender: supabaseCase.gender,
        known_conditions: supabaseCase.patients?.known_conditions || 'None listed',
        symptoms: supabaseCase.symptoms, symptom_duration: supabaseCase.symptom_duration,
        vitals: { temperature: `${supabaseCase.temperature}°C`, spO2: `${supabaseCase.spo2}%`, heart_rate: `${supabaseCase.heart_rate} bpm`, blood_pressure: supabaseCase.blood_pressure, respiratory_rate: `${supabaseCase.respiratory_rate} /min` },
        status: supabaseCase.status,
      };
      const prompt = `You are an AI clinical triage assistant helping an ASHA worker.\n\nAnalyze the following patient case fetched directly from the database.\n\nPATIENT CASE:\n${JSON.stringify(casePayload, null, 2)}\n\nYour job is NOT to diagnose the patient.\n\nGenerate ONLY relevant follow-up questions based on the symptoms, vitals, age, gender, and medical history.\n\nDo not ask generic questions.\n\nReturn ONLY valid JSON in this exact format:\n\n{\n  "questions": [\n    "question 1",\n    "question 2",\n    "question 3"\n  ]\n}\n\nIf no additional questions are needed, return:\n\n{\n  "questions": []\n}`;
      const answer = await askGemini(prompt);
      setGeminiResponse(answer);
      const parsed = safeParseJson(answer);
      if (parsed && Array.isArray(parsed.questions)) setParsedQuestions(parsed.questions);
      else setParsedQuestions([]);
    } catch (error) { console.log('GEMINI ERROR:', error); setGeminiResponse(String(error)); }
    finally { setLoadingGemini(false); }
  };

  const getAssessment = async () => {
    if (!activeSupabaseCase) return;
    const unanswered = parsedQuestions.filter((_, i) => !answers[i]?.trim());
    if (unanswered.length > 0) { Alert.alert('Missing Answers', 'Please answer all follow-up questions before requesting an assessment.'); return; }
    try {
      setLoadingAssessment(true);
      setAssessment(null);
      const qaPairs = parsedQuestions.map((q, i) => ({ question: q, answer: answers[i] }));
      const casePayload = {
        patient_name: activeSupabaseCase.patients?.name || 'Unknown Patient',
        age: activeSupabaseCase.age, gender: activeSupabaseCase.gender,
        known_conditions: activeSupabaseCase.patients?.known_conditions || 'None listed',
        symptoms: activeSupabaseCase.symptoms, symptom_duration: activeSupabaseCase.symptom_duration,
        vitals: { temperature: `${activeSupabaseCase.temperature}°C`, spO2: `${activeSupabaseCase.spo2}%`, heart_rate: `${activeSupabaseCase.heart_rate} bpm`, blood_pressure: activeSupabaseCase.blood_pressure, respiratory_rate: `${activeSupabaseCase.respiratory_rate} /min` },
      };
      const prompt = `You are an AI clinical triage assistant helping an ASHA worker decide whether a patient case needs urgent escalation to a doctor.\n\nYou are NOT diagnosing the patient. You are producing a triage risk level to help prioritize doctor review.\n\nPATIENT CASE:\n${JSON.stringify(casePayload, null, 2)}\n\nFOLLOW-UP QUESTIONS AND THE ASHA WORKER'S ANSWERS:\n${JSON.stringify(qaPairs, null, 2)}\n\nBased on all of this information, assess the urgency of this case.\n\nReturn ONLY valid JSON in this exact format:\n\n{\n  "urgency": "critical" | "moderate" | "low",\n  "reasoning": "1-2 sentence explanation in plain language an ASHA worker can understand",\n  "recommended_action": "1 short sentence on what the ASHA worker should do next"\n}`;
      const raw = await askGemini(prompt);
      const parsed = safeParseJson(raw);
      if (!parsed || !parsed.urgency) throw new Error('Could not parse a valid assessment from Gemini. Try again.');
      const { error: saveError } = await supabase.from('triage_cases').update({ ai_triage_level: parsed.urgency, ai_urgency: parsed.urgency, ai_recommended_action: parsed.recommended_action, ai_followup_answers: qaPairs }).eq('id', activeSupabaseCase.id);
      if (saveError) throw saveError;
      setAssessment(parsed);
      Alert.alert(t('success'), t('triageSuccess'));
    } catch (error) { Alert.alert('Assessment Failed', String(error)); }
    finally { setLoadingAssessment(false); }
  };

  const prioritizeCases = async () => {
    try {
      setLoadingPriority(true);
      const { data, error } = await supabase.from('triage_cases').select('*, patients(name)').neq('status', 'Closed');
      if (error) { console.log('Error fetching cases:', error); return; }
      if (!data || data.length === 0) { setPriorityQueue([]); return; }
      const prompt = `You are assisting a doctor in prioritizing rural healthcare cases.\n\nReview the following active triage cases and rank them from most urgent to least urgent.\n\nDo NOT diagnose patients.\nIMPORTANT: If a case has "ai_urgency": "critical" already set, treat it as a confirmed clinical verdict from a completed assessment and rank it at or near the top.\n\nReturn ONLY valid JSON in this format:\n\n[\n  {\n    "case_id": "case id",\n    "priority": 1,\n    "urgency": "Emergency",\n    "reason": "short reason"\n  }\n]\n\nCases:\n${JSON.stringify(data)}`;
      const response = await askGemini(prompt);
      const cleaned = response.replace(/```json/g, '').replace(/```/g, '').trim();
      setPriorityQueue(JSON.parse(cleaned));
    } catch (error) { console.log('Priority queue error:', error); }
    finally { setLoadingPriority(false); }
  };

  const handleSubmitVerifiedCase = async () => {
    if (!activeSupabaseCase) return;
    const nextStatus = assessment?.urgency === 'critical' ? 'Urgent - Doctor Review' : 'Awaiting Doctor Review';
    try {
      const { error } = await supabase.from('triage_cases').update({
        temperature: draftVitals.temperature === '' ? null : Number(draftVitals.temperature),
        blood_pressure: draftVitals.bloodPressure || null,
        spo2: draftVitals.spo2 === '' ? null : Number(draftVitals.spo2),
        heart_rate: draftVitals.heartRate === '' ? null : Number(draftVitals.heartRate),
        respiratory_rate: draftVitals.respiratoryRate === '' ? null : Number(draftVitals.respiratoryRate),
        status: nextStatus,
      }).eq('id', activeSupabaseCase.id);
      if (error) throw error;
      setTriageCases((prev) => prev.map((c) => (c.id === activeSupabaseCase.id ? { ...c, status: nextStatus } : c)));
      Alert.alert(t('success'), t('triageSuccess'));
    } catch (err) { Alert.alert(t('error'), t('failedSubmit')); }
  };

  const handleRequestAmbulance = (patientName: string) => {
    Alert.alert('Ambulance Dispatched', `Emergency transport requested for ${patientName}.`);
    setReferrals((prev) => prev.map((r) => (r.patientName === patientName ? { ...r, transportStatus: 'Transport Assigned / En Route' } : r)));
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setCapturedDocs((prev) => [file.name, ...prev]);
        Alert.alert('Document Attached', `${file.name} has been linked to the patient profile.`);
      }
    } catch (error) { Alert.alert('Error', 'Could not capture document.'); }
  };

  const handleAddNewTriageCase = async () => {
    if (!newPatientName || !newPatientPhone || !newPatientAge || !newPatientGender || !newCaseSymptoms || !newCaseDuration) {
      Alert.alert('Missing Details', 'Please fill in all required patient and case details.');
      return;
    }
    try {
      setAddingCase(true);
      const { data: newPatient, error: patientError } = await supabase.from('patients').insert({ name: newPatientName, phone: newPatientPhone, age: Number(newPatientAge), gender: newPatientGender }).select().single();
      if (patientError || !newPatient) throw new Error(patientError?.message || 'Could not create patient.');
      const { data: newCase, error: caseError } = await supabase.from('triage_cases').insert({ patient_id: newPatient.id, asha_id: ashaId, age: Number(newPatientAge), gender: newPatientGender, symptoms: newCaseSymptoms, symptom_duration: newCaseDuration, status: 'Pending' }).select().single();
      if (caseError || !newCase) throw new Error(caseError?.message || 'Could not create triage case.');
      Alert.alert(t('success'), t('patientDetailsSuccess'));
      setNewPatientName(''); setNewPatientPhone(''); setNewPatientAge(''); setNewPatientGender(''); setNewCaseSymptoms(''); setNewCaseDuration('');
      setTriageCases((prev) => [newCase, ...prev]);
      setSelectedCaseId(newCase.id);
    } catch (error) { Alert.alert('Submission Failed', error instanceof Error ? error.message : 'Could not add the triage case.'); }
    finally { setAddingCase(false); }
  };

  const currentNotice = notices[noticeIndex];

  return (
    <View style={styles.root}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>{t('ashaTitle')}</Text>
          <Text style={styles.headerSub}>{dashboardProfile.name} · {dashboardProfile.subCenter}</Text>
        </View>
        <View style={styles.headerRight}>
          <LanguageSelector />
          <View style={styles.offlineBadge}>
            <Text style={styles.offlineText}>⚠ {dashboardProfile.offlinePendingCount} pending</Text>
          </View>
          <Pressable style={styles.logoutBtn} onPress={() => router.replace('/' as any)}>
            <Text style={styles.logoutText}>{t('logout')}</Text>
          </Pressable>
        </View>
      </View>

      {/* ── Live Notice Ticker ─────────────────────────────────── */}
      <View style={[styles.noticeBanner, { backgroundColor: currentNotice.color, borderColor: currentNotice.border }]}>
        <Text style={styles.noticeText} numberOfLines={1}>{currentNotice.text}</Text>
        <View style={styles.noticeDots}>
          {notices.map((_, i) => (
            <View key={i} style={[styles.noticeDot, i === noticeIndex && styles.noticeDotActive]} />
          ))}
        </View>
      </View>

      {/* ── Tab Bar ───────────────────────────────────────────── */}
      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarInner}>
          {(['home', 'patients', 'triage', 'referrals', 'followups', 'documents'] as const).map((tab) => (
            <Pressable key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}>
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'home' ? '🏠 HOME' : tab === 'patients' ? '👤 PATIENTS' : tab === 'triage' ? '🩺 TRIAGE' : tab === 'referrals' ? '🚑 REFERRALS' : tab === 'followups' ? '📋 FOLLOW-UPS' : '📁 DOCS'}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* ── Tab Content ───────────────────────────────────────── */}
      <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentInner} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* ══ HOME TAB ══ */}
        {activeTab === 'home' && (
          <View style={styles.twoCol}>
            <View style={styles.leftCol}>
              {/* Stat tiles */}
              <View style={styles.statGrid}>
                <View style={[styles.statTile, { backgroundColor: '#fef2f2', borderColor: '#fca5a5' }]}>
                  <Text style={[styles.statVal, { color: '#dc2626' }]}>{triageCases.length}</Text>
                  <Text style={styles.statLabel}>{t('liveCases')}</Text>
                  <Text style={styles.statIcon}>🔴</Text>
                </View>
                <View style={[styles.statTile, { backgroundColor: '#fef3c7', borderColor: '#fcd34d' }]}>
                  <Text style={[styles.statVal, { color: '#d97706' }]}>{triageCases.filter((c) => c.status === 'Pending').length}</Text>
                  <Text style={styles.statLabel}>{t('pendingReview')}</Text>
                  <Text style={styles.statIcon}>🟡</Text>
                </View>
                <View style={[styles.statTile, { backgroundColor: '#f0fdf4', borderColor: '#86efac' }]}>
                  <Text style={[styles.statVal, { color: '#16a34a' }]}>4</Text>
                  <Text style={styles.statLabel}>{t('followupsDue')}</Text>
                  <Text style={styles.statIcon}>🟢</Text>
                </View>
                <View style={[styles.statTile, { backgroundColor: '#eff6ff', borderColor: '#93c5fd' }]}>
                  <Text style={[styles.statVal, { color: '#2563eb' }]}>{triageCases.filter((c) => (c as any).ai_urgency === 'critical').length}</Text>
                  <Text style={styles.statLabel}>Critical AI Flags</Text>
                  <Text style={styles.statIcon}>🤖</Text>
                </View>
              </View>

              {/* Poll of the Day */}
              <View style={styles.card}>
                <Text style={styles.cardHeader}>📊 Health Poll of the Day</Text>
                <Text style={styles.subtext}>What is the biggest challenge in your area right now?</Text>
                {!pollVoted ? (
                  <View style={{ gap: 8 }}>
                    {POLL_OPTIONS.map((opt) => (
                      <Pressable key={opt.label} style={styles.pollOptionBtn} onPress={() => { setPollVoted(true); setPollChoice(opt.label); }}>
                        <Text style={styles.pollOptionText}>{opt.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <View style={{ gap: 10 }}>
                    {POLL_OPTIONS.map((opt) => (
                      <View key={opt.label}>
                        <View style={styles.pollBarRow}>
                          <Text style={[styles.pollBarLabel, pollChoice === opt.label && { fontWeight: '800', color: '#0d9488' }]}>
                            {pollChoice === opt.label ? '✓ ' : ''}{opt.label}
                          </Text>
                          <Text style={styles.pollPct}>{opt.pct}%</Text>
                        </View>
                        <View style={styles.pollBarTrack}>
                          <View style={[styles.pollBarFill, { width: `${opt.pct}%` as any, backgroundColor: pollChoice === opt.label ? '#0d9488' : '#99f6e4' }]} />
                        </View>
                      </View>
                    ))}
                    <Text style={styles.pollThanks}>Thanks for voting! 🎉</Text>
                  </View>
                )}
              </View>

              {/* Queue list */}
              <View style={styles.card}>
                <Text style={styles.cardHeader}>{t('active')} {t('triageQueue')}</Text>
                {triageCases.length === 0 ? (
                  <Text style={styles.emptyText}>No triage cases found in database.</Text>
                ) : (
                  triageCases.map((item) => (
                    <View key={item.id} style={styles.queueItem}>
                      <Text style={styles.queueName}>{item.patients?.name || 'Unknown Patient'}</Text>
                      <Text style={styles.metaText}>Age: {item.age} · {item.gender} · {item.patients?.phone}</Text>
                      <Text style={styles.queueComplaint}>{item.symptoms} ({item.symptom_duration})</Text>
                      <Text style={styles.metaText}>Temp: {item.temperature}°C · SpO₂: {item.spo2}% · HR: {item.heart_rate} bpm</Text>
                      <Text style={styles.metaText}>Status: <Text style={{ fontWeight: '800', color: '#0d9488' }}>{item.status}</Text></Text>
                      <Pressable style={styles.secondaryButton} onPress={() => { setSelectedCaseId(item.id); setActiveTab('triage'); }}>
                        <Text style={styles.secondaryButtonText}>🔍 {t('verifyTriage')}</Text>
                      </Pressable>
                    </View>
                  ))
                )}
              </View>
            </View>

            <View style={styles.rightCol}>
              {/* Leaderboard */}
              <View style={styles.card}>
                <Text style={styles.cardHeader}>🏆 Wall of Fame</Text>
                <Text style={styles.subtext}>Top ASHA workers this month</Text>
                {leaderboard.map((entry) => (
                  <View key={entry.rank} style={[styles.leaderRow, entry.rank === 1 && { backgroundColor: '#fffbeb', borderColor: '#fcd34d' }]}>
                    <Text style={styles.leaderBadge}>{entry.badge}</Text>
                    <View style={styles.leaderInfo}>
                      <Text style={styles.leaderName}>{entry.name}</Text>
                      <Text style={styles.leaderCases}>{entry.cases} cases closed</Text>
                    </View>
                    <View style={[styles.leaderRankBadge, entry.rank === 1 && { backgroundColor: '#f59e0b' }]}>
                      <Text style={styles.leaderRankText}>#{entry.rank}</Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* AI Prioritizer */}
              <View style={styles.card}>
                <Text style={styles.cardHeader}>🤖 AI Case Prioritizer</Text>
                <Text style={styles.subtext}>Let Gemini rank all open cases by clinical urgency.</Text>
                <Pressable style={[styles.primaryButton, loadingPriority && { backgroundColor: '#94a3b8' }]} onPress={prioritizeCases} disabled={loadingPriority}>
                  <Text style={styles.primaryButtonText}>{loadingPriority ? '⏳ Prioritizing...' : '⚡ Prioritize Cases with AI'}</Text>
                </Pressable>
                {priorityQueue.length > 0 && (
                  <View style={{ marginTop: 14 }}>
                    {priorityQueue.map((item, index) => (
                      <View key={item.case_id} style={styles.priorityItem}>
                        <View style={styles.priorityRankCircle}><Text style={styles.priorityRankText}>{index + 1}</Text></View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.priorityUrgency}>{item.urgency}</Text>
                          <Text style={styles.metaText}>ID: {item.case_id}</Text>
                          <Text style={styles.queueComplaint}>{item.reason}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
                <Pressable style={[styles.primaryButton, { backgroundColor: '#1d4ed8', marginTop: 12 }]} onPress={() => setActiveTab('triage')}>
                  <Text style={styles.primaryButtonText}>{t('triageQueue')} →</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {/* ══ PATIENTS TAB ══ */}
        {activeTab === 'patients' && (
          <View style={styles.singleColWrap}>
            <View style={styles.card}>
              <Text style={styles.cardHeader}>{t('addCase')}</Text>
              <Text style={styles.subtext}>Register a new patient and send their case directly to the triage queue.</Text>
              {[
                { label: `${t('patientName')} *`, value: newPatientName, setter: setNewPatientName, placeholder: t('patientName') },
                { label: `${t('phone')} *`, value: newPatientPhone, setter: setNewPatientPhone, placeholder: t('phone'), keyboardType: 'phone-pad' as const },
                { label: `${t('age')} *`, value: newPatientAge, setter: setNewPatientAge, placeholder: t('age'), keyboardType: 'numeric' as const },
                { label: `${t('gender')} *`, value: newPatientGender, setter: setNewPatientGender, placeholder: t('gender') },
                { label: `${t('duration')} *`, value: newCaseDuration, setter: setNewCaseDuration, placeholder: t('duration') },
              ].map((field) => (
                <View key={field.label}>
                  <Text style={styles.vitalLabel}>{field.label}</Text>
                  <TextInput style={styles.input} placeholder={field.placeholder} value={field.value} onChangeText={field.setter} keyboardType={field.keyboardType} editable />
                </View>
              ))}
              <Text style={styles.vitalLabel}>{t('symptoms')} *</Text>
              <TextInput style={[styles.input, { minHeight: 70 }]} placeholder={t('symptoms')} value={newCaseSymptoms} onChangeText={setNewCaseSymptoms} multiline editable />
              <Pressable style={[styles.primaryButton, addingCase && { backgroundColor: '#94a3b8' }]} onPress={handleAddNewTriageCase} disabled={addingCase}>
                <Text style={styles.primaryButtonText}>{addingCase ? 'Adding Case...' : t('addCaseButton')}</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ══ TRIAGE TAB ══ */}
        {activeTab === 'triage' && (
          <View style={styles.twoCol}>
            <View style={styles.leftCol}>
              <View style={styles.card}>
                <Text style={styles.cardHeader}>Select Case to Verify</Text>
                {triageCases.length === 0 ? <Text style={styles.emptyText}>No cases in queue.</Text> : triageCases.map((c) => (
                  <Pressable key={c.id} style={[styles.triageListItem, activeSupabaseCase?.id === c.id && styles.triageListItemActive]} onPress={() => setSelectedCaseId(c.id)}>
                    <Text style={[styles.triageListName, activeSupabaseCase?.id === c.id && { color: '#fff' }]}>{c.patients?.name || 'Patient'}</Text>
                    <Text style={[styles.triageListMeta, activeSupabaseCase?.id === c.id && { color: '#99f6e4' }]}>{c.symptoms} · {c.status}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={styles.rightCol}>
              {activeSupabaseCase ? (
                <>
                  <View style={styles.patientBanner}>
                    <Text style={styles.bannerTitle}>{activeSupabaseCase.patients?.name} ({activeSupabaseCase.age}y · {activeSupabaseCase.gender})</Text>
                    <Text style={styles.bannerSub}>"{activeSupabaseCase.symptoms}" — {activeSupabaseCase.symptom_duration}</Text>
                    <Text style={styles.metaText}>Known Conditions: {activeSupabaseCase.patients?.known_conditions || 'None'}</Text>
                  </View>
                  <View style={styles.card}>
                    <Text style={styles.cardHeader}>{t('liveVitals')}</Text>
                    <View style={styles.vitalsGrid}>
                      {[
                        { label: 'Temp (°C)', key: 'temperature', kbType: 'decimal-pad' as const },
                        { label: 'BP (mmHg)', key: 'bloodPressure', kbType: 'default' as const },
                        { label: 'SpO₂ (%)', key: 'spo2', kbType: 'numeric' as const },
                        { label: 'Pulse (bpm)', key: 'heartRate', kbType: 'numeric' as const },
                        { label: 'Resp (/min)', key: 'respiratoryRate', kbType: 'numeric' as const },
                      ].map((v) => (
                        <View key={v.key} style={styles.vitalInputBox}>
                          <Text style={styles.vitalLabel}>{v.label}</Text>
                          <TextInput style={styles.vitalField} keyboardType={v.kbType} value={(draftVitals as any)[v.key]} onChangeText={(text) => setDraftVitals((prev) => ({ ...prev, [v.key]: text }))} />
                        </View>
                      ))}
                    </View>
                    <Pressable style={styles.primaryButton} onPress={() => testGeminiForCase(activeSupabaseCase)}>
                      <Text style={styles.primaryButtonText}>{loadingGemini ? 'Analyzing...' : '✨ Run Gemini Clinical Follow-up Analysis'}</Text>
                    </Pressable>
                  </View>
                  {parsedQuestions.length > 0 && (
                    <View style={styles.card}>
                      <Text style={styles.cardHeader}>Answer Follow-up Questions</Text>
                      {parsedQuestions.map((q, i) => (
                        <View key={i} style={{ marginBottom: 12 }}>
                          <Text style={styles.questionText}>{i + 1}. {q}</Text>
                          <TextInput style={styles.answerInput} placeholder="Worker's answer..." value={answers[i] || ''} onChangeText={(text) => setAnswers((prev) => ({ ...prev, [i]: text }))} multiline />
                        </View>
                      ))}
                      <Pressable style={styles.primaryButton} onPress={getAssessment}>
                        <Text style={styles.primaryButtonText}>{loadingAssessment ? 'Assessing...' : '🩺 Get Clinical Risk Assessment'}</Text>
                      </Pressable>
                    </View>
                  )}
                  {geminiResponse !== '' && parsedQuestions.length === 0 && (
                    <View style={styles.geminiBox}>
                      <Text style={styles.geminiTitle}>Gemini Output</Text>
                      <Text style={styles.geminiText}>{geminiResponse}</Text>
                    </View>
                  )}
                  {assessment && (
                    <View style={[styles.assessmentCard, assessment.urgency === 'critical' && styles.assessmentCritical, assessment.urgency === 'moderate' && styles.assessmentModerate, assessment.urgency === 'low' && styles.assessmentLow]}>
                      <Text style={styles.assessmentUrgencyText}>{assessment.urgency === 'critical' ? '🔴 CRITICAL' : assessment.urgency === 'moderate' ? '🟠 MODERATE' : '🟢 LOW RISK'}</Text>
                      <Text style={styles.assessmentReasoning}>{assessment.reasoning}</Text>
                      <Text style={styles.assessmentAction}>Next step: {assessment.recommended_action}</Text>
                    </View>
                  )}
                  <Pressable style={[styles.primaryButton, { backgroundColor: '#16a34a', marginTop: 4 }]} onPress={handleSubmitVerifiedCase}>
                    <Text style={styles.primaryButtonText}>✓ {t('submitDoctor')}</Text>
                  </Pressable>
                </>
              ) : (
                <View style={styles.card}><Text style={styles.emptyText}>Select a case from the left panel to begin.</Text></View>
              )}
            </View>
          </View>
        )}

        {/* ══ REFERRALS TAB ══ */}
        {activeTab === 'referrals' && (
          <View style={styles.singleColWrap}>
            <View style={styles.card}>
              <Text style={styles.cardHeader}>🚑 Upward Referral & Transport Management</Text>
              {referrals.map((r) => (
                <View key={r.id} style={styles.referralCard}>
                  <Text style={styles.referralTitle}>Patient: {r.patientName}</Text>
                  <Text style={styles.metaText}>Destination: {r.destination}</Text>
                  <Text style={styles.metaText}>Reason: {r.reason}</Text>
                  <Text style={[styles.metaText, { color: '#dc2626', fontWeight: '800' }]}>Priority: {r.priority}</Text>
                  <Text style={styles.metaText}>Transport: {r.transportStatus}</Text>
                  <Pressable style={styles.ambulanceButton} onPress={() => handleRequestAmbulance(r.patientName)}>
                    <Text style={styles.ambulanceButtonText}>🚑 Request Ambulance Transport</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ══ FOLLOWUPS TAB ══ */}
        {activeTab === 'followups' && (
          <View style={styles.singleColWrap}>
            <View style={styles.card}>
              <Text style={styles.cardHeader}>📋 Follow-ups Due Today</Text>
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

        {/* ══ DOCUMENTS TAB ══ */}
        {activeTab === 'documents' && (
          <View style={styles.singleColWrap}>
            <View style={styles.card}>
              <Text style={styles.cardHeader}>📁 Patient Document Vault & Capture</Text>
              <Text style={styles.subtext}>Photograph paper prescriptions or lab reports directly into the patient record.</Text>
              <Pressable style={styles.primaryButton} onPress={handlePickDocument}>
                <Text style={styles.primaryButtonText}>📷 Take Photo / Upload Document</Text>
              </Pressable>
              <Text style={[styles.cardHeader, { marginTop: 20 }]}>Stored Documents</Text>
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
  root: { flex: 1, backgroundColor: '#f0f4f8' },
  header: { paddingTop: 48, paddingHorizontal: 20, paddingBottom: 14, backgroundColor: '#0f2744', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' },
  headerTitle: { fontSize: 19, fontWeight: '800', color: '#ffffff', letterSpacing: 0.3 },
  headerSub: { fontSize: 12, color: '#7dd3fc', marginTop: 2 },
  offlineBadge: { backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#fcd34d' },
  offlineText: { fontSize: 10, fontWeight: '800', color: '#92400e' },
  logoutBtn: { backgroundColor: '#dc2626', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  logoutText: { fontSize: 12, color: '#ffffff', fontWeight: '800' },
  noticeBanner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 2, minHeight: 42 },
  noticeText: { flex: 1, fontSize: 12, fontWeight: '700', color: '#1e293b', lineHeight: 18 },
  noticeDots: { flexDirection: 'row', gap: 4, marginLeft: 10 },
  noticeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#cbd5e1' },
  noticeDotActive: { backgroundColor: '#0d9488' },
  tabBar: { backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tabBarInner: { paddingHorizontal: 12 },
  tab: { paddingVertical: 11, paddingHorizontal: 14, borderBottomWidth: 3, borderBottomColor: 'transparent', marginRight: 2 },
  tabActive: { borderBottomColor: '#0d9488' },
  tabText: { fontSize: 11, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.3 },
  tabTextActive: { color: '#0d9488', fontWeight: '800' },
  tabContent: { flex: 1 },
  tabContentInner: { padding: 16, paddingBottom: 40 },
  twoCol: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' },
  leftCol: { flex: 2, minWidth: 280, gap: 16 },
  rightCol: { flex: 1, minWidth: 240, gap: 16 },
  singleColWrap: { maxWidth: 700, width: '100%', alignSelf: 'center' },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statTile: { flex: 1, minWidth: 120, padding: 16, borderRadius: 14, borderWidth: 1, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  statVal: { fontSize: 28, fontWeight: '900', lineHeight: 34 },
  statLabel: { fontSize: 11, color: '#64748b', textAlign: 'center', marginTop: 4, fontWeight: '600' },
  statIcon: { fontSize: 16, marginTop: 4 },
  pollOptionBtn: { backgroundColor: '#f0fdfa', borderWidth: 1.5, borderColor: '#0d9488', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center' },
  pollOptionText: { fontSize: 13, fontWeight: '700', color: '#0d9488' },
  pollBarRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  pollBarLabel: { fontSize: 12, color: '#334155', fontWeight: '600', flex: 1 },
  pollPct: { fontSize: 12, fontWeight: '800', color: '#0d9488' },
  pollBarTrack: { height: 10, backgroundColor: '#e2e8f0', borderRadius: 5, overflow: 'hidden' },
  pollBarFill: { height: 10, borderRadius: 5 },
  pollThanks: { textAlign: 'center', fontSize: 12, color: '#0d9488', fontWeight: '700', marginTop: 4 },
  leaderRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 10, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0', gap: 10 },
  leaderBadge: { fontSize: 22, width: 30, textAlign: 'center' },
  leaderInfo: { flex: 1 },
  leaderName: { fontSize: 13, fontWeight: '800', color: '#0f2744' },
  leaderCases: { fontSize: 11, color: '#64748b', marginTop: 2 },
  leaderRankBadge: { backgroundColor: '#e2e8f0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  leaderRankText: { fontSize: 11, fontWeight: '800', color: '#475569' },
  priorityItem: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#f8fafc', borderRadius: 10, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0', gap: 10 },
  priorityRankCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#0d9488', alignItems: 'center', justifyContent: 'center' },
  priorityRankText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  priorityUrgency: { fontSize: 13, fontWeight: '800', color: '#0f2744' },
  card: { backgroundColor: '#ffffff', borderRadius: 14, padding: 18, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#0f2744', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  cardHeader: { fontSize: 16, fontWeight: '800', color: '#0f2744', marginBottom: 6 },
  subtext: { fontSize: 12, color: '#64748b', lineHeight: 18, marginBottom: 12 },
  queueItem: { backgroundColor: '#f8fafc', padding: 13, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  queueName: { fontSize: 14, fontWeight: '800', color: '#0f2744' },
  queueComplaint: { fontSize: 12, color: '#475569', marginTop: 3, lineHeight: 18 },
  metaText: { fontSize: 11, color: '#94a3b8', marginTop: 2, lineHeight: 17 },
  triageListItem: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  triageListItemActive: { backgroundColor: '#0d9488', borderColor: '#0d9488' },
  triageListName: { fontSize: 13, fontWeight: '800', color: '#0f2744' },
  triageListMeta: { fontSize: 11, color: '#64748b', marginTop: 3 },
  patientBanner: { backgroundColor: '#f0fdfa', padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#5eead4', marginBottom: 4 },
  bannerTitle: { fontSize: 15, fontWeight: '800', color: '#0d9488' },
  bannerSub: { fontSize: 12, color: '#0f766e', marginTop: 4, lineHeight: 18, fontStyle: 'italic' },
  vitalsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 },
  vitalInputBox: { width: '31%', minWidth: 90 },
  vitalLabel: { fontSize: 11, fontWeight: '700', color: '#334155', marginBottom: 5 },
  vitalField: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9, fontSize: 13, color: '#0f2744' },
  geminiBox: { marginTop: 4, padding: 14, backgroundColor: '#f0fdfa', borderRadius: 10, borderWidth: 1, borderColor: '#99f6e4' },
  geminiTitle: { fontSize: 13, fontWeight: '800', color: '#0d9488', marginBottom: 7 },
  geminiText: { fontSize: 12, color: '#334155', lineHeight: 19 },
  questionText: { fontSize: 13, fontWeight: '700', color: '#0f2744', marginBottom: 5, lineHeight: 19 },
  answerInput: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: '#0f2744', minHeight: 44 },
  assessmentCard: { marginTop: 4, padding: 16, borderRadius: 12, borderWidth: 1 },
  assessmentCritical: { backgroundColor: '#fff1f2', borderColor: '#fca5a5' },
  assessmentModerate: { backgroundColor: '#fffbeb', borderColor: '#fcd34d' },
  assessmentLow: { backgroundColor: '#f0fdf4', borderColor: '#86efac' },
  assessmentUrgencyText: { fontSize: 15, fontWeight: '900', marginBottom: 7, color: '#0f2744' },
  assessmentReasoning: { fontSize: 13, color: '#475569', marginBottom: 7, lineHeight: 19 },
  assessmentAction: { fontSize: 13, fontWeight: '700', color: '#0f2744' },
  primaryButton: { backgroundColor: '#0d9488', paddingVertical: 13, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 8, minHeight: 48 },
  primaryButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  secondaryButton: { backgroundColor: '#f8fafc', paddingVertical: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 8, borderWidth: 1, borderColor: '#cbd5e1', minHeight: 42 },
  secondaryButtonText: { color: '#334155', fontSize: 12, fontWeight: '800' },
  ambulanceButton: { backgroundColor: '#dc2626', paddingVertical: 11, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 10, minHeight: 44 },
  ambulanceButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#0f2744', marginBottom: 12 },
  referralCard: { backgroundColor: '#f8fafc', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12 },
  referralTitle: { fontSize: 14, fontWeight: '800', color: '#0f2744', marginBottom: 5 },
  followupCard: { backgroundColor: '#f8fafc', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  docRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 8 },
  docName: { fontSize: 12, fontWeight: '700', color: '#334155' },
  docAction: { fontSize: 12, color: '#0284c7', fontWeight: '800' },
  emptyText: { fontSize: 13, color: '#94a3b8', paddingVertical: 12, textAlign: 'center' },
});
