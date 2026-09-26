import * as DocumentPicker from 'expo-document-picker';
import * as Linking from 'expo-linking';
import NetInfo from '@react-native-community/netinfo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/i18n';
import { runOfflineTriage, OfflineTriageResult } from '../lib/offlineTriage';

const ASHA_PHONE = '+919483412554';

// Collapsible section component
function Section({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={sectionStyles.wrapper}>
      <Pressable style={sectionStyles.header} onPress={() => setOpen((v) => !v)}>
        <Text style={sectionStyles.title}>{title}</Text>
        <Text style={sectionStyles.chevron}>{open ? '−' : '+'}</Text>
      </Pressable>
      {open && <View style={sectionStyles.body}>{children}</View>}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  wrapper: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#e4e8ed', marginBottom: 10, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14 },
  title: { fontSize: 13, fontWeight: '700', color: '#1a2332', letterSpacing: 0.2, textTransform: 'uppercase' },
  chevron: { fontSize: 18, color: '#6b7a8d', fontWeight: '300', lineHeight: 22 },
  body: { paddingHorizontal: 18, paddingBottom: 18, paddingTop: 4, borderTopWidth: 1, borderTopColor: '#f0f2f5' },
});

export default function PatientDashboardScreen() {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(true);
  const { t } = useLanguage();
  const { patientId } = useLocalSearchParams();
  const currentPatientId = Array.isArray(patientId) ? patientId[0] : patientId;
  const [patientData, setPatientData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [profileOpen, setProfileOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editGender, setEditGender] = useState('');
  const [editVillage, setEditVillage] = useState('');
  const [editBloodGroup, setEditBloodGroup] = useState('');
  const [editConditions, setEditConditions] = useState('');
  const [workflowData] = useState({
    queueStatus: { position: 2, estimatedWait: 'approx. 15 mins', ashaWorker: 'Sunita — Village Sub-Center 3', triageStatus: 'Ready for Tele-Consultation' },
    activeReferral: { facility: 'District Hospital Hub', reason: 'Specialist evaluation for chronic hypertension tracking', status: 'Pending Transport' },
    followUp: { dueDate: 'September 10, 2026', instruction: 'ASHA worker home visit scheduled for vitals re-check.', completed: false },
    records: [{ id: 'rec-1', date: 'Aug 28, 2026', diagnosis: 'Acute Viral Fever with Dehydration', prescriptions: 'Paracetamol 650mg (TDS x 3 days), ORS sachets', doctor: 'Dr. Ramesh (Tele-Triage)' }],
  });
  const [complaint, setComplaint] = useState('');
  const [duration, setDuration] = useState('');
  const [attachedFileName, setAttachedFileName] = useState<string | null>(null);
  const [offlineTriageOpen, setOfflineTriageOpen] = useState(false);
  const [offlineSymptoms, setOfflineSymptoms] = useState('');
  const [offlineDuration, setOfflineDuration] = useState('');
  const [difficultyBreathing, setDifficultyBreathing] = useState<boolean | null>(null);
  const [chestPain, setChestPain] = useState<boolean | null>(null);
  const [unconscious, setUnconscious] = useState<boolean | null>(null);
  const [seizure, setSeizure] = useState<boolean | null>(null);
  const [severeBleeding, setSevereBleeding] = useState<boolean | null>(null);
  const [poisoning, setPoisoning] = useState<boolean | null>(null);
  const [offlineResult, setOfflineResult] = useState<OfflineTriageResult | null>(null);
  const [ashaCallActive, setAshaCallActive] = useState(false);
  const [ashaCallRejected, setAshaCallRejected] = useState(false);
  const [ashaCountdown, setAshaCountdown] = useState<number | null>(null);
  const ashaCallPlacedRef = useRef(false);
  const [vaultDocs, setVaultDocs] = useState<{ [key: string]: string }>({});

  useEffect(() => { const u = NetInfo.addEventListener((s) => setIsOnline(s.isConnected === true && s.isInternetReachable !== false)); return () => u(); }, []);

  useEffect(() => {
    const fetchPatient = async () => {
      if (!currentPatientId) { setLoading(false); return; }
      const { data, error } = await supabase.from('patients').select('*').eq('id', currentPatientId).single();
      if (error) { setLoading(false); return; }
      setPatientData(data);
      setEditName(data.name || ''); setEditEmail(data.email || ''); setEditAge(data.age ? String(data.age) : '');
      setEditGender(data.gender || ''); setEditVillage(data.village || ''); setEditBloodGroup(data.blood_group || ''); setEditConditions(data.known_conditions || '');
      setLoading(false);
    };
    fetchPatient();
  }, [currentPatientId]);

  useEffect(() => {
    if (!currentPatientId) return;
    const load = async () => {
      const { data, error } = await supabase.from('prescriptions').select('*').eq('patient_id', currentPatientId).order('created_at', { ascending: false });
      if (!error) setPrescriptions(data || []);
    };
    load();
    const pid = setInterval(load, 5000);
    const ch = supabase.channel(`patient-prescriptions-${currentPatientId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prescriptions', filter: `patient_id=eq.${currentPatientId}` }, load).subscribe();
    return () => { clearInterval(pid); void supabase.removeChannel(ch); };
  }, [currentPatientId]);

  useEffect(() => {
    if (offlineResult?.level === 'RED') {
      ashaCallPlacedRef.current = false; setAshaCallActive(true); setAshaCallRejected(false); setAshaCountdown(5);
      Alert.alert('Critical Situation Detected', 'Your responses indicate a potentially life-threatening emergency. We will open a call to your assigned ASHA worker shortly.', [{ text: 'OK' }]);
    } else { ashaCallPlacedRef.current = false; setAshaCallActive(false); setAshaCallRejected(false); setAshaCountdown(null); }
  }, [offlineResult]);

  useEffect(() => {
    if (!ashaCallActive || ashaCallRejected || ashaCountdown === null) return;
    if (ashaCountdown <= 0) {
      if (!ashaCallPlacedRef.current) { ashaCallPlacedRef.current = true; Linking.openURL(`tel:${ASHA_PHONE}`).catch(console.error); }
      return;
    }
    const tid = setTimeout(() => setAshaCountdown((p) => (p !== null ? p - 1 : p)), 1000);
    return () => clearTimeout(tid);
  }, [ashaCallActive, ashaCallRejected, ashaCountdown]);

  const handleJoinCall = (mode: string) => Alert.alert('Tele-Consultation', `Connecting via ${mode} through your assigned ASHA worker's device...`);
  const handleUploadDocument = async (category: string) => {
    try {
      const r = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
      if (!r.canceled && r.assets?.length) { setVaultDocs((p) => ({ ...p, [category]: r.assets[0].name })); Alert.alert('Uploaded', `${r.assets[0].name} added to ${category}.`); }
    } catch { Alert.alert('Error', 'Could not process the file.'); }
  };
  const handleAttachReport = async () => {
    try {
      const r = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
      if (!r.canceled && r.assets?.length) { setAttachedFileName(r.assets[0].name); }
    } catch { Alert.alert('Error', 'Could not attach report.'); }
  };
  const handleBookConsultation = async () => {
    if (!complaint || !duration) { Alert.alert('Missing Details', 'Please provide your primary complaint and duration.'); return; }
    try {
      const { error } = await supabase.from('triage_cases').insert({ patient_id: currentPatientId, age: patientData.age || null, gender: patientData.gender || null, symptoms: complaint, symptom_duration: duration, status: 'Pending' }).select().single();
      if (error) { Alert.alert('Submission Failed', error.message); return; }
      setComplaint(''); setDuration(''); setAttachedFileName(null); Alert.alert('Submitted', 'Your consultation request has been sent.');
    } catch { Alert.alert('Error', 'Could not submit.'); }
  };
  const handleRunOfflineTriage = () => {
    if ([difficultyBreathing, chestPain, unconscious, seizure, severeBleeding, poisoning].some((v) => v === null)) { Alert.alert('Incomplete', 'Please answer all questions.'); return; }
    const patientAge = patientData?.age ? Number(patientData.age) : 0;
    setOfflineResult(runOfflineTriage({ symptoms: offlineSymptoms, symptomDuration: offlineDuration, difficultyBreathing: Boolean(difficultyBreathing), chestPain: Boolean(chestPain), unconscious: Boolean(unconscious), seizure: Boolean(seizure), severeBleeding: Boolean(severeBleeding), poisoning: Boolean(poisoning), severeDehydration: false, suspectedFracture: false, highFever: false, persistentVomiting: false, age: patientAge, isPregnant: false, hasChronicCondition: Boolean(patientData?.known_conditions?.trim()), isInfantUnder1: patientAge > 0 && patientAge < 1 }));
  };
  const handleRejectAshaCall = () => { ashaCallPlacedRef.current = true; setAshaCallActive(false); setAshaCallRejected(true); setAshaCountdown(null); };
  const handleResetOfflineTriage = () => {
    setOfflineTriageOpen(false); setOfflineSymptoms(''); setOfflineDuration('');
    setDifficultyBreathing(null); setChestPain(null); setUnconscious(null); setSeizure(null); setSevereBleeding(null); setPoisoning(null);
    setOfflineResult(null); ashaCallPlacedRef.current = false; setAshaCallActive(false); setAshaCallRejected(false); setAshaCountdown(null);
  };
  const handleOpenProfile = () => {
    if (!patientData) return;
    setEditName(patientData.name || ''); setEditEmail(patientData.email || ''); setEditAge(patientData.age ? String(patientData.age) : '');
    setEditGender(patientData.gender || ''); setEditVillage(patientData.village || ''); setEditBloodGroup(patientData.blood_group || ''); setEditConditions(patientData.known_conditions || '');
    setEditingProfile(false); setProfileOpen(true);
  };
  const handleSaveProfile = async () => {
    if (!currentPatientId) return;
    const ageNumber = editAge.trim() === '' ? null : Number(editAge);
    if (editAge.trim() !== '' && Number.isNaN(ageNumber)) { Alert.alert('Invalid Age', 'Please enter a valid age.'); return; }
    const { data, error } = await supabase.from('patients').update({ name: editName, email: editEmail, age: ageNumber, gender: editGender, village: editVillage, blood_group: editBloodGroup, known_conditions: editConditions }).eq('id', currentPatientId).select().single();
    if (error) { Alert.alert('Update Failed', error.message); return; }
    setPatientData(data); setEditingProfile(false); Alert.alert('Profile Updated', 'Your health profile has been saved.');
  };

  if (loading) return <View style={s.center}><Text style={s.muted}>Loading...</Text></View>;
  if (!patientData) return (
    <View style={s.center}>
      <Text style={s.h2}>Unable to load profile</Text>
      <Text style={s.muted}>Please return to login and try again.</Text>
      <Pressable style={[s.btn, { marginTop: 16 }]} onPress={() => router.replace('/patient' as any)}><Text style={s.btnText}>Back to Login</Text></Pressable>
    </View>
  );

  return (
    <View style={s.root}>
      {/* HEADER */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Patient Portal</Text>
          <Text style={s.headerSub}>Welcome, {patientData.name}</Text>
        </View>
        <View style={s.headerRight}>
          <View style={[s.statusPill, { backgroundColor: isOnline ? '#e6f4ea' : '#fce8e6' }]}>
            <View style={[s.statusDot, { backgroundColor: isOnline ? '#2d7a3e' : '#c5221f' }]} />
            <Text style={[s.statusText, { color: isOnline ? '#2d7a3e' : '#c5221f' }]}>{isOnline ? 'Online' : 'Offline'}</Text>
          </View>
          <Pressable style={s.headerBtn} onPress={() => router.push('/patient/map' as any)}><Text style={s.headerBtnText}>Map</Text></Pressable>
          <Pressable style={s.headerBtn} onPress={handleOpenProfile}><Text style={s.headerBtnText}>Profile</Text></Pressable>
          <Pressable onPress={() => router.replace('/patient' as any)}><Text style={s.logoutText}>Sign Out</Text></Pressable>
        </View>
      </View>

      {/* KPI BAR */}
      <View style={s.kpiBar}>
        <View style={s.kpiItem}><Text style={s.kpiVal}>#{workflowData.queueStatus.position}</Text><Text style={s.kpiLabel}>Queue Position</Text></View>
        <View style={s.kpiDivider} />
        <View style={s.kpiItem}><Text style={s.kpiVal}>~15 min</Text><Text style={s.kpiLabel}>Estimated Wait</Text></View>
        <View style={s.kpiDivider} />
        <View style={s.kpiItem}><Text style={s.kpiVal}>{prescriptions.length}</Text><Text style={s.kpiLabel}>Prescriptions</Text></View>
        <View style={s.kpiDivider} />
        <View style={s.kpiItem}><Text style={[s.kpiVal, { color: workflowData.followUp.completed ? '#2d7a3e' : '#b45309' }]}>{workflowData.followUp.completed ? 'Done' : 'Pending'}</Text><Text style={s.kpiLabel}>Follow-up</Text></View>
      </View>

      {/* MAIN CONTENT */}
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* TELE-CONSULTATION */}
        <Section title="Tele-Consultation" defaultOpen>
          <View style={s.infoGrid}>
            <View style={s.infoCell}><Text style={s.infoLabel}>Queue Position</Text><Text style={s.infoValue}>#{workflowData.queueStatus.position}</Text></View>
            <View style={s.infoCell}><Text style={s.infoLabel}>Est. Wait</Text><Text style={s.infoValue}>{workflowData.queueStatus.estimatedWait}</Text></View>
            <View style={s.infoCell}><Text style={s.infoLabel}>Assigned ASHA</Text><Text style={s.infoValue}>{workflowData.queueStatus.ashaWorker}</Text></View>
            <View style={s.infoCell}><Text style={s.infoLabel}>Status</Text><Text style={[s.infoValue, { color: '#2d7a3e' }]}>{workflowData.queueStatus.triageStatus}</Text></View>
          </View>
          <Text style={s.sectionLabel}>Join Session</Text>
          <View style={s.btnRow}>
            <Pressable style={[s.outlineBtn, { flex: 1 }]} onPress={() => handleJoinCall('Video Call')}><Text style={s.outlineBtnText}>Video Call</Text></Pressable>
            <Pressable style={[s.outlineBtn, { flex: 1 }]} onPress={() => handleJoinCall('Audio Call')}><Text style={s.outlineBtnText}>Audio Call</Text></Pressable>
            <Pressable style={[s.outlineBtn, { flex: 1 }]} onPress={() => handleJoinCall('ASHA Relay')}><Text style={s.outlineBtnText}>ASHA Relay</Text></Pressable>
          </View>
        </Section>

        {/* REQUEST CONSULTATION */}
        {isOnline ? (
          <Section title="Request Consultation">
            <Text style={s.hint}>Describe your condition so the doctor can prepare before the call.</Text>
            <Text style={s.fieldLabel}>Primary Complaint</Text>
            <TextInput style={s.input} placeholder="e.g. Persistent cough, severe dizziness" value={complaint} onChangeText={setComplaint} />
            <Text style={s.fieldLabel}>Duration</Text>
            <TextInput style={s.input} placeholder="e.g. 3 days" value={duration} onChangeText={setDuration} />
            <Pressable style={s.attachBtn} onPress={handleAttachReport}>
              <Text style={s.attachBtnText}>{attachedFileName ? `Attached: ${attachedFileName}` : 'Attach Test Report or Vitals (optional)'}</Text>
            </Pressable>
            <Pressable style={s.btn} onPress={handleBookConsultation}><Text style={s.btnText}>Submit Request</Text></Pressable>
          </Section>
        ) : (
          <Section title="Offline Health Check">
            {!offlineTriageOpen ? (
              <>
                <View style={s.alertBox}><Text style={s.alertText}>You are currently offline. You can still complete a basic health assessment on this device.</Text></View>
                <Pressable style={s.btn} onPress={() => setOfflineTriageOpen(true)}><Text style={s.btnText}>Begin Health Check</Text></Pressable>
              </>
            ) : (
              <>
                <Text style={s.fieldLabel}>Describe your symptoms</Text>
                <TextInput style={s.input} placeholder="Symptoms" value={offlineSymptoms} onChangeText={setOfflineSymptoms} multiline />
                <Text style={s.fieldLabel}>Duration</Text>
                <TextInput style={s.input} placeholder="e.g. 2 days" value={offlineDuration} onChangeText={setOfflineDuration} />
                {[
                  { q: 'Difficulty breathing?', val: difficultyBreathing, yes: () => setDifficultyBreathing(true), no: () => setDifficultyBreathing(false) },
                  { q: 'Chest pain?', val: chestPain, yes: () => setChestPain(true), no: () => setChestPain(false) },
                  { q: 'Unconscious or seizure?', val: unconscious, yes: () => { setUnconscious(true); setSeizure(true); }, no: () => { setUnconscious(false); setSeizure(false); } },
                  { q: 'Severe bleeding or poisoning?', val: severeBleeding, yes: () => { setSevereBleeding(true); setPoisoning(true); }, no: () => { setSevereBleeding(false); setPoisoning(false); } },
                ].map((item, i) => (
                  <View key={i} style={s.questionRow}>
                    <Text style={s.questionText}>{item.q}</Text>
                    <View style={s.toggleRow}>
                      <Pressable style={[s.toggleBtn, item.val === true && s.toggleOn]} onPress={item.yes}><Text style={[s.toggleBtnText, item.val === true && s.toggleOnText]}>Yes</Text></Pressable>
                      <Pressable style={[s.toggleBtn, item.val === false && s.toggleOn]} onPress={item.no}><Text style={[s.toggleBtnText, item.val === false && s.toggleOnText]}>No</Text></Pressable>
                    </View>
                  </View>
                ))}
                {!offlineResult && <Pressable style={s.btn} onPress={handleRunOfflineTriage}><Text style={s.btnText}>Assess My Situation</Text></Pressable>}
                {offlineResult && (
                  <View style={[s.resultBox, offlineResult.level === 'RED' ? s.resultRed : offlineResult.level === 'YELLOW' ? s.resultYellow : s.resultGreen]}>
                    <Text style={s.resultLevel}>{offlineResult.level === 'RED' ? 'CRITICAL' : offlineResult.level === 'YELLOW' ? 'NEEDS ATTENTION' : 'ROUTINE'}</Text>
                    <Text style={s.resultAction}>{offlineResult.recommendedAction}</Text>
                    {offlineResult.level === 'RED' && !ashaCallRejected && (
                      <View style={s.countdownBox}>
                        <Text style={s.countdownLabel}>Contacting ASHA worker in {ashaCountdown ?? 5}s</Text>
                        <Text style={s.countdownNum}>{ashaCountdown ?? 5}</Text>
                        <Pressable style={s.cancelBtn} onPress={handleRejectAshaCall}><Text style={s.cancelBtnText}>Cancel</Text></Pressable>
                      </View>
                    )}
                    {offlineResult.level === 'RED' && ashaCallRejected && (
                      <Pressable style={[s.btn, { backgroundColor: '#c5221f', marginTop: 12 }]} onPress={() => { ashaCallPlacedRef.current = false; setAshaCallRejected(false); setAshaCallActive(true); setAshaCountdown(5); }}>
                        <Text style={s.btnText}>Retry ASHA Contact</Text>
                      </Pressable>
                    )}
                    <Pressable style={[s.outlineBtn, { marginTop: 12 }]} onPress={handleResetOfflineTriage}><Text style={s.outlineBtnText}>Start Over</Text></Pressable>
                  </View>
                )}
              </>
            )}
          </Section>
        )}

        {/* REFERRAL TRACKER */}
        <Section title="Referral Tracker">
          <View style={s.infoGrid}>
            <View style={s.infoCell}><Text style={s.infoLabel}>Target Facility</Text><Text style={s.infoValue}>{workflowData.activeReferral.facility}</Text></View>
            <View style={s.infoCell}><Text style={s.infoLabel}>Status</Text><Text style={s.infoValue}>{workflowData.activeReferral.status}</Text></View>
          </View>
          <Text style={s.fieldLabel}>Reason</Text>
          <Text style={s.infoValue}>{workflowData.activeReferral.reason}</Text>
        </Section>

        {/* FOLLOW-UP */}
        <Section title="Follow-up Reminders">
          <View style={s.infoGrid}>
            <View style={s.infoCell}><Text style={s.infoLabel}>Due Date</Text><Text style={s.infoValue}>{workflowData.followUp.dueDate}</Text></View>
            <View style={s.infoCell}><Text style={s.infoLabel}>Status</Text><Text style={[s.infoValue, { color: workflowData.followUp.completed ? '#2d7a3e' : '#b45309' }]}>{workflowData.followUp.completed ? 'Completed' : 'Pending'}</Text></View>
          </View>
          <Text style={s.hint}>{workflowData.followUp.instruction}</Text>
        </Section>

        {/* HEALTH RECORDS */}
        <Section title="Health Records">
          {workflowData.records.map((rec) => (
            <View key={rec.id} style={s.recordRow}>
              <View style={s.recordMeta}><Text style={s.recordDate}>{rec.date}</Text><Text style={s.recordDoctor}>{rec.doctor}</Text></View>
              <Text style={s.recordDiag}>{rec.diagnosis}</Text>
              <Text style={s.recordRx}>Rx: {rec.prescriptions}</Text>
            </View>
          ))}
          {prescriptions.length > 0 && (
            <>
              <View style={s.divider} />
              <Text style={s.sectionLabel}>Recent Prescriptions</Text>
              {prescriptions.map((p) => (
                <View key={p.id} style={s.recordRow}>
                  <View style={s.recordMeta}><Text style={s.recordDate}>{new Date(p.created_at).toLocaleDateString()}</Text><Text style={s.recordDoctor}>{p.doctor_name || 'Doctor'}</Text></View>
                  <Text style={s.recordDiag}>{p.medicine_name} — {p.dosage}</Text>
                  <Text style={s.recordRx}>Duration: {p.duration || p.frequency}{p.instructions ? ` · ${p.instructions}` : ''}</Text>
                </View>
              ))}
            </>
          )}
        </Section>

        {/* DOCUMENT VAULT */}
        <Section title="Document Vault">
          <Text style={s.hint}>Upload documents to keep them securely linked to your health record.</Text>
          {[{ cat: 'Prescriptions', label: 'Prescriptions' }, { cat: 'Lab Reports', label: 'Lab Reports' }, { cat: 'Identity/Insurance', label: 'Identity / Insurance' }].map((v) => (
            <Pressable key={v.cat} style={[s.vaultRow, vaultDocs[v.cat] ? s.vaultRowDone : undefined]} onPress={() => handleUploadDocument(v.cat)}>
              <Text style={[s.vaultLabel, vaultDocs[v.cat] ? s.vaultLabelDone : undefined]}>{vaultDocs[v.cat] ? `${v.label} — Uploaded` : `Upload ${v.label}`}</Text>
              <Text style={s.vaultArrow}>{vaultDocs[v.cat] ? '✓' : '+'}</Text>
            </Pressable>
          ))}
        </Section>

      </ScrollView>

      {/* PROFILE DRAWER */}
      {profileOpen && (
        <View style={s.drawerOverlay}>
          <Pressable style={s.drawerBg} onPress={() => setProfileOpen(false)} />
          <View style={s.drawer}>
            <View style={s.drawerHeader}>
              <Text style={s.drawerTitle}>Health Profile</Text>
              <Pressable onPress={() => setProfileOpen(false)}><Text style={s.drawerClose}>×</Text></Pressable>
            </View>
            <ScrollView contentContainerStyle={s.drawerBody}>
              {!editingProfile ? (
                <>
                  <View style={s.avatarCircle}><Text style={s.avatarText}>{patientData.name?.charAt(0)?.toUpperCase() || '?'}</Text></View>
                  <Text style={s.avatarName}>{patientData.name}</Text>
                  <Text style={s.avatarPhone}>{patientData.phone}</Text>
                  <View style={s.divider} />
                  {[['Email', patientData.email], ['Age', patientData.age], ['Gender', patientData.gender], ['Village', patientData.village], ['Blood Group', patientData.blood_group], ['Known Conditions', patientData.known_conditions]].map(([k, v]) => (
                    <View key={k as string} style={s.profileRow}><Text style={s.profileKey}>{k}</Text><Text style={s.profileVal}>{v || '—'}</Text></View>
                  ))}
                  <Pressable style={[s.btn, { marginTop: 20 }]} onPress={() => setEditingProfile(true)}><Text style={s.btnText}>Edit Profile</Text></Pressable>
                </>
              ) : (
                <>
                  {([['Full Name', editName, setEditName, 'default'], ['Email', editEmail, setEditEmail, 'email-address'], ['Age', editAge, setEditAge, 'numeric'], ['Gender', editGender, setEditGender, 'default'], ['Village', editVillage, setEditVillage, 'default'], ['Blood Group', editBloodGroup, setEditBloodGroup, 'default']] as [string, string, React.Dispatch<React.SetStateAction<string>>, any][]).map(([label, val, setter, kb]) => (
                    <View key={label}><Text style={s.fieldLabel}>{label}</Text><TextInput style={s.input} value={val} onChangeText={setter} keyboardType={kb} /></View>
                  ))}
                  <Text style={s.fieldLabel}>Known Conditions</Text>
                  <TextInput style={[s.input, { minHeight: 80 }]} value={editConditions} onChangeText={setEditConditions} multiline />
                  <Pressable style={[s.btn, { marginTop: 8 }]} onPress={handleSaveProfile}><Text style={s.btnText}>Save Changes</Text></Pressable>
                  <Pressable style={[s.outlineBtn, { marginTop: 8 }]} onPress={() => setEditingProfile(false)}><Text style={s.outlineBtnText}>Cancel</Text></Pressable>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f5f6f8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#f5f6f8' },
  h2: { fontSize: 18, fontWeight: '700', color: '#1a2332', marginBottom: 8 },
  muted: { fontSize: 13, color: '#6b7a8d' },

  // Header
  header: { backgroundColor: '#1c2b3a', paddingTop: 48, paddingBottom: 16, paddingHorizontal: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#ffffff', letterSpacing: 0.2 },
  headerSub: { fontSize: 12, color: '#8fa8bf', marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 5 },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },
  statusText: { fontSize: 11, fontWeight: '600' },
  headerBtn: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  headerBtnText: { color: '#ccdae6', fontSize: 12, fontWeight: '600' },
  logoutText: { color: '#8fa8bf', fontSize: 12, fontWeight: '600' },

  // KPI Bar
  kpiBar: { backgroundColor: '#ffffff', flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e4e8ed', paddingVertical: 12 },
  kpiItem: { flex: 1, alignItems: 'center' },
  kpiVal: { fontSize: 16, fontWeight: '700', color: '#1c2b3a' },
  kpiLabel: { fontSize: 10, color: '#6b7a8d', marginTop: 2, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.4 },
  kpiDivider: { width: 1, height: 32, backgroundColor: '#e4e8ed' },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { padding: 14, paddingBottom: 40, maxWidth: 960, width: '100%', alignSelf: 'center' },

  // Form elements
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#4a5568', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#d1d8e0', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: '#1a2332', marginBottom: 4 },
  hint: { fontSize: 12, color: '#6b7a8d', lineHeight: 18, marginBottom: 10 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#4a5568', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8, marginTop: 14 },

  // Buttons
  btn: { backgroundColor: '#1c2b3a', paddingVertical: 12, borderRadius: 6, alignItems: 'center', marginTop: 10 },
  btnText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  outlineBtn: { backgroundColor: 'transparent', paddingVertical: 11, borderRadius: 6, alignItems: 'center', borderWidth: 1, borderColor: '#c8d0da' },
  outlineBtnText: { color: '#1c2b3a', fontSize: 12, fontWeight: '600' },
  btnRow: { flexDirection: 'row', gap: 8 },
  attachBtn: { backgroundColor: '#f0f2f5', borderWidth: 1, borderColor: '#d1d8e0', borderRadius: 6, paddingVertical: 11, paddingHorizontal: 14, alignItems: 'center', marginBottom: 4, marginTop: 6 },
  attachBtnText: { color: '#4a5568', fontSize: 12, fontWeight: '600' },

  // Info grid
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 0, marginBottom: 4 },
  infoCell: { width: '50%', paddingVertical: 6, paddingRight: 12 },
  infoLabel: { fontSize: 10, fontWeight: '700', color: '#6b7a8d', textTransform: 'uppercase', letterSpacing: 0.4 },
  infoValue: { fontSize: 13, fontWeight: '500', color: '#1a2332', marginTop: 2 },

  // Offline toggle
  questionRow: { marginBottom: 12 },
  questionText: { fontSize: 13, color: '#1a2332', marginBottom: 6 },
  toggleRow: { flexDirection: 'row', gap: 8 },
  toggleBtn: { flex: 1, paddingVertical: 9, borderRadius: 6, alignItems: 'center', borderWidth: 1, borderColor: '#d1d8e0', backgroundColor: '#f9fafb' },
  toggleOn: { backgroundColor: '#1c2b3a', borderColor: '#1c2b3a' },
  toggleBtnText: { fontSize: 12, fontWeight: '600', color: '#4a5568' },
  toggleOnText: { color: '#ffffff' },

  // Result box
  resultBox: { borderRadius: 6, padding: 16, marginTop: 12, borderWidth: 1 },
  resultRed: { backgroundColor: '#fdf2f2', borderColor: '#e8b4b4' },
  resultYellow: { backgroundColor: '#fdf8ee', borderColor: '#e6d08a' },
  resultGreen: { backgroundColor: '#f2faf4', borderColor: '#a8d5b5' },
  resultLevel: { fontSize: 12, fontWeight: '800', color: '#1a2332', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 },
  resultAction: { fontSize: 13, color: '#1a2332', lineHeight: 19 },
  countdownBox: { backgroundColor: '#1a2332', borderRadius: 6, padding: 14, alignItems: 'center', marginTop: 12 },
  countdownLabel: { color: '#ccdae6', fontSize: 12, fontWeight: '600', marginBottom: 6 },
  countdownNum: { color: '#ffffff', fontSize: 32, fontWeight: '800' },
  cancelBtn: { backgroundColor: '#c5221f', paddingVertical: 9, paddingHorizontal: 24, borderRadius: 5, marginTop: 10 },
  cancelBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },

  // Records
  recordRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f2f5' },
  recordMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  recordDate: { fontSize: 11, color: '#6b7a8d', fontWeight: '600' },
  recordDoctor: { fontSize: 11, color: '#6b7a8d' },
  recordDiag: { fontSize: 13, fontWeight: '600', color: '#1a2332' },
  recordRx: { fontSize: 12, color: '#4a5568', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#e4e8ed', marginVertical: 12 },

  // Vault
  vaultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: '#d1d8e0', borderRadius: 6, marginBottom: 8, backgroundColor: '#f9fafb' },
  vaultRowDone: { borderColor: '#a8d5b5', backgroundColor: '#f2faf4' },
  vaultLabel: { fontSize: 13, color: '#4a5568', fontWeight: '600' },
  vaultLabelDone: { color: '#2d7a3e' },
  vaultArrow: { fontSize: 14, color: '#6b7a8d', fontWeight: '700' },

  // Drawer
  drawerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row', zIndex: 1000 },
  drawerBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  drawer: { width: 340, backgroundColor: '#ffffff', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  drawerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#e4e8ed', backgroundColor: '#1c2b3a' },
  drawerTitle: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
  drawerClose: { fontSize: 22, color: '#8fa8bf', lineHeight: 26 },
  drawerBody: { padding: 20, paddingBottom: 40 },
  avatarCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#1c2b3a', alignSelf: 'center', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  avatarText: { fontSize: 24, fontWeight: '700', color: '#ffffff' },
  avatarName: { fontSize: 16, fontWeight: '700', color: '#1a2332', textAlign: 'center' },
  avatarPhone: { fontSize: 12, color: '#6b7a8d', textAlign: 'center', marginTop: 2 },
  profileRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#f0f2f5' },
  profileKey: { fontSize: 12, fontWeight: '600', color: '#6b7a8d' },
  profileVal: { fontSize: 12, color: '#1a2332', maxWidth: '60%', textAlign: 'right' },

  alertBox: { backgroundColor: '#fdf8ee', borderWidth: 1, borderColor: '#e6d08a', borderRadius: 6, padding: 12, marginBottom: 12 },
  alertText: { fontSize: 12, color: '#7a5c00', lineHeight: 18 },
});
