import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

export default function AshaCompleteDashboard() {
  const router = useRouter();

  // Navigation tab state ('home', 'patients', 'triage', 'referrals', 'followups', 'documents')
  const [activeTab, setActiveTab] = useState<'home' | 'patients' | 'triage' | 'referrals' | 'followups' | 'documents'>('home');

  // ASHA Worker Profile State
  const [ashaData] = useState({
    name: 'Sunita',
    subCenter: 'Village Sub-Center 3 (Bangalore Rural)',
    governmentId: 'AS-KA-2026-8891',
    offlinePendingCount: 3,
  });

  // Master Patient & Triage Cases
  const [patients, setPatients] = useState([
    {
      id: 'p-1',
      name: 'Lakshmiamma',
      age: 48,
      gender: 'Female',
      phone: '9876543210',
      village: 'Ward 3',
      abhaId: 'ABHA-9982-1029',
      complaint: 'Severe dizziness',
      duration: '3 days',
      status: 'Verification Required',
      priority: 'High Priority',
      vitals: { temp: '', bp: '', spO2: '', pulse: '', rr: '', weight: '' },
      triageFlags: { breathing: false, chestPain: false, bleeding: false, unconscious: false, dehydration: false, highFever: false },
      ashaNotes: '',
      attachedReport: 'LabReport_BloodTest.pdf',
    },
    {
      id: 'p-2',
      name: 'Ramesh Kumar',
      age: 62,
      gender: 'Male',
      phone: '9123456780',
      village: 'Ward 1',
      abhaId: 'ABHA-4451-2093',
      complaint: 'Persistent dry cough & breathlessness',
      duration: '1 week',
      status: 'Awaiting Doctor Review',
      priority: 'URGENT',
      vitals: { temp: '99.2', bp: '130/84', spO2: '95', pulse: '88', rr: '20', weight: '64' },
      triageFlags: { breathing: true, chestPain: false, bleeding: false, unconscious: false, dehydration: false, highFever: false },
      ashaNotes: 'History of chronic bronchitis. SpO2 borderline.',
      attachedReport: null,
    },
    {
      id: 'p-3',
      name: 'Anita Devi',
      age: 35,
      gender: 'Female',
      phone: '9988776655',
      village: 'Ward 2',
      abhaId: 'ABHA-1102-9981',
      complaint: 'Post-natal routine follow-up',
      duration: '1 day',
      status: 'Follow-up Due Today',
      priority: 'Normal',
      vitals: { temp: '98.4', bp: '120/80', spO2: '98', pulse: '76', rr: '16', weight: '55' },
      triageFlags: { breathing: false, chestPain: false, bleeding: false, unconscious: false, dehydration: false, highFever: false },
      ashaNotes: 'Vitals stable. Recovery progressing as expected.',
      attachedReport: null,
    },
  ]);

  // Selected Patient for Active Verification / Vitals Entry
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>('p-1');
  const activePatient = patients.find((p) => p.id === selectedPatientId) || patients[0];

  // New Patient Registration Form State
  const [regName, setRegName] = useState('');
  const [regAge, setRegAge] = useState('');
  const [regGender, setRegGender] = useState('Female');
  const [regPhone, setRegPhone] = useState('');
  const [regVillage, setRegVillage] = useState('');
  const [regAbha, setRegAbha] = useState('');

  // Referral Management State
  const [referrals, setReferrals] = useState([
    { id: 'ref-1', patientName: 'Ramesh Kumar', destination: 'District Hospital Hub', reason: 'Unstable SpO₂ & chest discomfort', priority: '🔴 Urgent', transportStatus: 'Waiting for transport' }
  ]);

  // Document Upload State
  const [capturedDocs, setCapturedDocs] = useState<string[]>(['Prescription_Aug2026.pdf']);

  // Handlers for Vitals & Triage Updates
  const handleUpdateActiveVitals = (key: string, value: string) => {
    setPatients((prev) =>
      prev.map((p) => (p.id === activePatient.id ? { ...p, vitals: { ...p.vitals, [key]: value } } : p))
    );
  };

  const handleToggleTriageFlag = (flagKey: string) => {
    setPatients((prev) =>
      prev.map((p) =>
        p.id === activePatient.id
          ? { ...p, triageFlags: { ...p.triageFlags, [flagKey]: !p.triageFlags[flagKey as keyof typeof p.triageFlags] } }
          : p
      )
    );
  };

  const handleUpdateNotes = (notes: string) => {
    setPatients((prev) =>
      prev.map((p) => (p.id === activePatient.id ? { ...p, ashaNotes: notes } : p))
    );
  };

  // Submit Verified Case to Doctor Queue
  const handleSubmitVerifiedCase = () => {
    setPatients((prev) =>
      prev.map((p) => (p.id === activePatient.id ? { ...p, status: 'Awaiting Doctor Review' } : p))
    );
    Alert.alert('Case Verified & Dispatched', `${activePatient.name}'s verified vitals and notes have been sent to the doctor's queue.`);
  };

  // Register New Patient
  const handleRegisterPatient = () => {
    if (!regName || !regPhone) {
      Alert.alert('Missing Details', 'Please provide at least the patient name and phone number.');
      return;
    }
    const newEntry = {
      id: `p-${Date.now()}`,
      name: regName,
      age: parseInt(regAge) || 30,
      gender: regGender,
      phone: regPhone,
      village: regVillage || 'Village Sub-Center 3',
      abhaId: regAbha || `ABHA-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
      complaint: 'General Health Check / Walk-in',
      duration: '1 day',
      status: 'Verification Required',
      priority: 'Normal',
      vitals: { temp: '', bp: '', spO2: '', pulse: '', rr: '', weight: '' },
      triageFlags: { breathing: false, chestPain: false, bleeding: false, unconscious: false, dehydration: false, highFever: false },
      ashaNotes: '',
      attachedReport: null,
    };
    setPatients((prev) => [newEntry, ...prev]);
    setRegName('');
    setRegAge('');
    setRegPhone('');
    setRegVillage('');
    setRegAbha('');
    Alert.alert('Patient Registered', 'Single source record created successfully and linked to ASHA queue.');
    setActiveTab('triage');
    setSelectedPatientId(newEntry.id);
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

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>ASHA Field Command Center</Text>
          <Text style={styles.subtitle}>Worker: {ashaData.name} | {ashaData.subCenter}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.offlineBadge}>
            <Text style={styles.offlineText}>⚠ Offline Mode ({ashaData.offlinePendingCount} pending sync)</Text>
          </View>
          <Pressable onPress={() => router.replace('/asha' as any)}>
            <Text style={styles.logoutText}>Log Out</Text>
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

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* ================= 1. HOME TAB ================= */}
        {activeTab === 'home' && (
          <View>
            <View style={styles.card}>
              <Text style={styles.cardHeader}>Today's Operational Task Summary</Text>
              <View style={styles.metricRow}>
                <View style={[styles.metricBox, { backgroundColor: '#fef2f2' }]}>
                  <Text style={[styles.metricVal, { color: '#dc2626' }]}>2</Text>
                  <Text style={styles.metricLbl}>High Priority</Text>
                </View>
                <View style={[styles.metricBox, { backgroundColor: '#fef3c7' }]}>
                  <Text style={[styles.metricVal, { color: '#d97706' }]}>3</Text>
                  <Text style={styles.metricLbl}>Awaiting Doctor</Text>
                </View>
                <View style={[styles.metricBox, { backgroundColor: '#f0fdf4' }]}>
                  <Text style={[styles.metricVal, { color: '#16a34a' }]}>4</Text>
                  <Text style={styles.metricLbl}>Follow-ups Due</Text>
                </View>
              </View>
              <Pressable style={styles.primaryButton} onPress={() => setActiveTab('triage')}>
                <Text style={styles.primaryButtonText}>Open Live Triage Queue →</Text>
              </Pressable>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardHeader}>My Active Queue</Text>
              {patients.map((p) => (
                <Pressable
                  key={p.id}
                  style={styles.queueItem}
                  onPress={() => {
                    setSelectedPatientId(p.id);
                    setActiveTab('triage');
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.queueName}>{p.name} ({p.age}y • {p.gender})</Text>
                    <Text style={styles.queueComplaint}>Complaint: {p.complaint}</Text>
                  </View>
                  <Text style={styles.queueStatusFlag}>{p.status}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* ================= 2. PATIENTS & REGISTRATION TAB ================= */}
        {activeTab === 'patients' && (
          <View>
            <View style={styles.card}>
              <Text style={styles.cardHeader}>Search Existing Patient</Text>
              <TextInput style={styles.input} placeholder="Search by Phone / ABHA ID / Patient ID" />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardHeader}>+ Register New Patient (Single Source of Truth)</Text>
              <Text style={styles.subtext}>Ensures patient links seamlessly to ASHA case, doctor queue, and history.</Text>

              <TextInput style={styles.input} placeholder="Full Legal Name" value={regName} onChangeText={setRegName} />
              <TextInput style={styles.input} placeholder="Age" keyboardType="numeric" value={regAge} onChangeText={setRegAge} />
              <TextInput style={styles.input} placeholder="Gender (Female / Male / Other)" value={regGender} onChangeText={setRegGender} />
              <TextInput style={styles.input} placeholder="Phone Number" keyboardType="phone-pad" value={regPhone} onChangeText={setRegPhone} />
              <TextInput style={styles.input} placeholder="Village / Ward" value={regVillage} onChangeText={setRegVillage} />
              <TextInput style={styles.input} placeholder="ABHA ID (Optional)" value={regAbha} onChangeText={setRegAbha} />

              <Pressable style={styles.primaryButton} onPress={handleRegisterPatient}>
                <Text style={styles.primaryButtonText}>Register & Add to Triage Queue</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ================= 3. TRIAGE QUEUE & VERIFICATION TAB ================= */}
        {activeTab === 'triage' && (
          <View>
            {/* Patient Selector */}
            <View style={styles.card}>
              <Text style={styles.cardHeader}>Select Patient to Verify</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                {patients.map((p) => (
                  <Pressable
                    key={p.id}
                    style={[styles.patientChip, activePatient.id === p.id && styles.patientChipActive]}
                    onPress={() => setSelectedPatientId(p.id)}
                  >
                    <Text style={[styles.patientChipText, activePatient.id === p.id && styles.patientChipTextActive]}>
                      {p.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <View style={styles.patientBanner}>
                <Text style={styles.bannerTitle}>Active Case: {activePatient.name} ({activePatient.age}y)</Text>
                <Text style={styles.bannerSub}>Patient Complaint: "{activePatient.complaint}" (Duration: {activePatient.duration})</Text>
                {activePatient.attachedReport && (
                  <Text style={styles.reportAttachedText}>📎 Attached Document: {activePatient.attachedReport}</Text>
                )}
              </View>
            </View>

            {/* Structured Vitals Entry */}
            <View style={styles.card}>
              <Text style={styles.cardHeader}>Structured Vitals Entry</Text>
              <View style={styles.vitalsGrid}>
                <View style={styles.vitalInputBox}>
                  <Text style={styles.vitalLabel}>Temp (°F)</Text>
                  <TextInput style={styles.vitalField} placeholder="102" value={activePatient.vitals.temp} onChangeText={(v) => handleUpdateActiveVitals('temp', v)} />
                </View>
                <View style={styles.vitalInputBox}>
                  <Text style={styles.vitalLabel}>BP (mmHg)</Text>
                  <TextInput style={styles.vitalField} placeholder="110/70" value={activePatient.vitals.bp} onChangeText={(v) => handleUpdateActiveVitals('bp', v)} />
                </View>
                <View style={styles.vitalInputBox}>
                  <Text style={styles.vitalLabel}>SpO₂ (%)</Text>
                  <TextInput style={styles.vitalField} placeholder="96" value={activePatient.vitals.spO2} onChangeText={(v) => handleUpdateActiveVitals('spO2', v)} />
                </View>
                <View style={styles.vitalInputBox}>
                  <Text style={styles.vitalLabel}>Pulse (bpm)</Text>
                  <TextInput style={styles.vitalField} placeholder="82" value={activePatient.vitals.pulse} onChangeText={(v) => handleUpdateActiveVitals('pulse', v)} />
                </View>
                <View style={styles.vitalInputBox}>
                  <Text style={styles.vitalLabel}>Resp Rate (/min)</Text>
                  <TextInput style={styles.vitalField} placeholder="18" value={activePatient.vitals.rr} onChangeText={(v) => handleUpdateActiveVitals('rr', v)} />
                </View>
                <View style={styles.vitalInputBox}>
                  <Text style={styles.vitalLabel}>Weight (kg)</Text>
                  <TextInput style={styles.vitalField} placeholder="52" value={activePatient.vitals.weight} onChangeText={(v) => handleUpdateActiveVitals('weight', v)} />
                </View>
              </View>
            </View>

            {/* Triage Questions / Risk Flags */}
            <View style={styles.card}>
              <Text style={styles.cardHeader}>Clinical Triage Risk Checklist</Text>
              <Text style={styles.subtext}>Does the patient exhibit any of the following emergency indicators?</Text>
              
              {[
                { key: 'breathing', label: 'Difficulty breathing / Shortness of breath' },
                { key: 'chestPain', label: 'Chest pain or discomfort' },
                { key: 'bleeding', label: 'Severe bleeding' },
                { key: 'unconscious', label: 'Loss of consciousness / Confusion' },
                { key: 'dehydration', label: 'Severe dehydration / inability to retain fluids' },
                { key: 'highFever', label: 'Very high sustained fever (> 103°F)' },
              ].map((item) => (
                <Pressable
                  key={item.key}
                  style={styles.checkboxRow}
                  onPress={() => handleToggleTriageFlag(item.key)}
                >
                  <Text style={styles.checkboxBox}>
                    {activePatient.triageFlags[item.key as keyof typeof activePatient.triageFlags] ? '☑' : '☐'}
                  </Text>
                  <Text style={styles.checkboxLabel}>{item.label}</Text>
                </Pressable>
              ))}

              {(activePatient.triageFlags.breathing || activePatient.triageFlags.chestPain || activePatient.triageFlags.unconscious) && (
                <View style={styles.alertFlagBox}>
                  <Text style={styles.alertFlagText}>⚠ HIGH RISK DETECTED: Critical symptom flags checked. Prioritize doctor review & consider emergency referral.</Text>
                </View>
              )}
            </View>

            {/* ASHA Triage Notes */}
            <View style={styles.card}>
              <Text style={styles.cardHeader}>ASHA Observations & Triage Notes</Text>
              <TextInput
                style={styles.textArea}
                multiline
                numberOfLines={3}
                placeholder="Enter patient background, local treatment given (e.g. paracetamol), and observations..."
                value={activePatient.ashaNotes}
                onChangeText={handleUpdateNotes}
              />
              <Pressable style={styles.primaryButton} onPress={handleSubmitVerifiedCase}>
                <Text style={styles.primaryButtonText}>✓ Submit Verified Case to Doctor Queue</Text>
              </Pressable>
            </View>
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
                <Text style={styles.queueName}>Lakshmiamma (High Risk)</Text>
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
  queueItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  queueName: { fontSize: 13, fontWeight: 'bold', color: '#0f172a' },
  queueComplaint: { fontSize: 11, color: '#475569', marginTop: 2 },
  queueStatusFlag: { fontSize: 10, fontWeight: 'bold', color: '#b45309', backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: '#0f172a', marginBottom: 10 },
  patientChip: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#f1f5f9', borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#cbd5e1' },
  patientChipActive: { backgroundColor: '#0d9488', borderColor: '#0d9488' },
  patientChipText: { fontSize: 12, fontWeight: '600', color: '#334155' },
  patientChipTextActive: { color: '#ffffff' },
  patientBanner: { backgroundColor: '#f0fdfa', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ccfbf1', marginTop: 8 },
  bannerTitle: { fontSize: 13, fontWeight: 'bold', color: '#134e4a' },
  bannerSub: { fontSize: 12, color: '#0f766e', marginTop: 2 },
  reportAttachedText: { fontSize: 11, color: '#0284c7', fontWeight: '600', marginTop: 4 },
  vitalsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  vitalInputBox: { width: '31%', marginBottom: 10 },
  vitalLabel: { fontSize: 11, fontWeight: '600', color: '#475569', marginBottom: 2 },
  vitalField: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 8, fontSize: 12, color: '#0f172a' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  checkboxBox: { fontSize: 16, marginRight: 8, color: '#0d9488', fontWeight: 'bold' },
  checkboxLabel: { fontSize: 12, color: '#334155' },
  alertFlagBox: { backgroundColor: '#fef2f2', padding: 10, borderRadius: 6, borderWidth: 1, borderColor: '#fecaca', marginTop: 8 },
  alertFlagText: { fontSize: 11, color: '#dc2626', fontWeight: 'bold' },
  textArea: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: '#0f172a', height: 80, textAlignVertical: 'top', marginBottom: 8 },
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
