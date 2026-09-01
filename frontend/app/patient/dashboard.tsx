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

export default function PatientDashboardScreen() {
  const router = useRouter();

  const [patientData] = useState({
    name: 'Lakshmiamma',
    age: 48,
    gender: 'Female',
    phone: '9876543210',
    queueStatus: {
      position: 2,
      estimatedWait: 'approx. 15 mins',
      ashaWorker: 'Sunita (Village Sub-Center 3)',
      triageStatus: 'Ready for Tele-Consultation',
    },
    activeReferral: {
      facility: 'District Hospital Hub',
      reason: 'Specialist evaluation for chronic hypertension tracking',
      status: 'Pending Transport / Active',
    },
    followUp: {
      dueDate: 'September 10, 2026',
      instruction: 'Asha worker home visit scheduled for vitals re-check.',
      completed: false,
    },
    records: [
      {
        id: 'rec-1',
        date: 'Aug 28, 2026',
        diagnosis: 'Acute Viral Fever with Dehydration',
        prescriptions: 'Paracetamol 650mg (TDS x 3 days), ORS sachets',
        doctor: 'Dr. Ramesh (Tele-Triage)',
      },
    ],
  });

  // Consultation Intake Form State
  const [complaint, setComplaint] = useState('');
  const [duration, setDuration] = useState('');
  const [attachedFileName, setAttachedFileName] = useState<string | null>(null);

  // Document Vault State
  const [vaultDocs, setVaultDocs] = useState<{ [key: string]: string }>({});

  const handleJoinCall = (mode: string) => {
    Alert.alert(
      'Tele-Consultation Link',
      `Connecting to doctor via ${mode} through your assigned ASHA worker's device...`
    );
  };

  // Direct Upload Handler using Expo Document Picker
  const handleUploadDocument = async (category: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'], // Accept PDFs and image scans
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setVaultDocs((prev) => ({ ...prev, [category]: file.name }));
        Alert.alert('Upload Successful', `${file.name} has been securely added to your ${category} vault.`);
      }
    } catch (error) {
      console.error('Document picker error:', error);
      Alert.alert('Upload Failed', 'Could not process the selected file. Please try again.');
    }
  };

  // Intake Report Attachment Handler
  const handleAttachReportForConsultation = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setAttachedFileName(file.name);
        Alert.alert('Report Attached', `${file.name} is linked to this consultation request.`);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not attach report.');
    }
  };

  const handleBookConsultation = () => {
    if (!complaint || !duration) {
      Alert.alert('Missing Details', 'Please provide your primary complaint and how long you have had it.');
      return;
    }
    Alert.alert(
      'Consultation Requested',
      'Your intake details and attached documents have been routed to your ASHA worker and triage queue.'
    );
    setComplaint('');
    setDuration('');
    setAttachedFileName(null);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Patient Health Portal</Text>
          <Text style={styles.subtitle}>Welcome, {patientData.name}</Text>
        </View>
        <Pressable onPress={() => router.replace('/patient' as any)}>
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* 1. LIVE TELE-CONSULTATION & QUEUE STATUS */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Doctor Triage & Call Status</Text>
          <View style={styles.queueBox}>
            <View style={{ flex: 1 }}>
              <Text style={styles.queuePosition}>Queue Position: #{patientData.queueStatus.position}</Text>
              <Text style={styles.metaText}>Estimated Wait: {patientData.queueStatus.estimatedWait}</Text>
              <Text style={styles.metaText}>Assigned ASHA: {patientData.queueStatus.ashaWorker}</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{patientData.queueStatus.triageStatus}</Text>
            </View>
          </View>

          <View style={styles.callSection}>
            <Text style={styles.callPromptText}>Doctor is ready for your consultation session:</Text>
            <View style={styles.commRow}>
              <Pressable style={[styles.commButton, { backgroundColor: '#0284c7' }]} onPress={() => handleJoinCall('Video Call')}>
                <Text style={styles.commButtonText}>📹 Join Video</Text>
              </Pressable>
              <Pressable style={[styles.commButton, { backgroundColor: '#0d9488' }]} onPress={() => handleJoinCall('Audio Call')}>
                <Text style={styles.commButtonText}>📞 Audio Link</Text>
              </Pressable>
              <Pressable style={[styles.commButton, { backgroundColor: '#475569' }]} onPress={() => handleJoinCall('Text / ASHA Relay')}>
                <Text style={styles.commButtonText}>💬 ASHA Relay</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* 2. REQUEST CONSULTATION / INTAKE WIZARD WITH FILE ATTACHMENT */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Book New Consultation / Request Help</Text>
          <Text style={styles.subtext}>Provide your symptoms and any relevant documents for the doctor:</Text>

          <TextInput
            style={styles.input}
            placeholder="Primary complaint (e.g., severe dizziness, persistent cough)"
            value={complaint}
            onChangeText={setComplaint}
          />

          <TextInput
            style={styles.input}
            placeholder="How long have you had it? (e.g., 3 days)"
            value={duration}
            onChangeText={setDuration}
          />

          <Pressable 
            style={[styles.uploadButton, attachedFileName ? { backgroundColor: '#16a34a' } : { backgroundColor: '#64748b' }]} 
            onPress={handleAttachReportForConsultation}
          >
            <Text style={styles.uploadButtonText}>
              {attachedFileName ? `✓ Attached: ${attachedFileName}` : '📎 Attach Recent Test Report / Vitals (Optional)'}
            </Text>
          </Pressable>

          <Pressable style={styles.primaryButton} onPress={handleBookConsultation}>
            <Text style={styles.primaryButtonText}>Submit to Triage Queue</Text>
          </Pressable>
        </View>

        {/* 3. HEALTH PROFILE DOCUMENT VAULT (FUNCTIONAL UPLOADS) */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Health Profile Document Vault</Text>
          <Text style={styles.subtext}>Select documents from your device to store in your record archive:</Text>

          <View style={styles.vaultGrid}>
            <Pressable 
              style={[styles.vaultButton, vaultDocs['Prescriptions'] && styles.vaultButtonActive]} 
              onPress={() => handleUploadDocument('Prescriptions')}
            >
              <Text style={styles.vaultButtonText}>
                {vaultDocs['Prescriptions'] ? '📄 Prescription Uploaded' : '📄 Upload Prescriptions'}
              </Text>
            </Pressable>

            <Pressable 
              style={[styles.vaultButton, vaultDocs['Lab Reports'] && styles.vaultButtonActive]} 
              onPress={() => handleUploadDocument('Lab Reports')}
            >
              <Text style={styles.vaultButtonText}>
                {vaultDocs['Lab Reports'] ? '🧪 Lab Reports Uploaded' : '🧪 Upload Lab Reports'}
              </Text>
            </Pressable>
          </View>

          <Pressable 
            style={[styles.vaultButtonFull, vaultDocs['Identity/Insurance'] && styles.vaultButtonActiveFull]} 
            onPress={() => handleUploadDocument('Identity/Insurance')}
          >
            <Text style={styles.vaultButtonTextFull}>
              {vaultDocs['Identity/Insurance'] ? '✓ Identity / Insurance ID Linked Securely' : '🆔 Upload Identity Card / Insurance (Optional)'}
            </Text>
          </Pressable>
        </View>

        {/* 4. UPWARD REFERRAL TRACKER */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Upward Referral Tracker</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Target Facility:</Text>
            <Text style={styles.value}>{patientData.activeReferral.facility}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Escalation Reason:</Text>
            <Text style={styles.value}>{patientData.activeReferral.reason}</Text>
          </View>
          <View style={[styles.referralFlag, { backgroundColor: '#fef3c7' }]}>
            <Text style={{ color: '#b45309', fontWeight: 'bold', fontSize: 12 }}>
              Status: {patientData.activeReferral.status}
            </Text>
          </View>
        </View>

        {/* 5. FOLLOW-UP REMINDERS */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Follow-up Reminders</Text>
          <View style={styles.followUpBox}>
            <Text style={styles.dueDateText}>Due Date: {patientData.followUp.dueDate}</Text>
            <Text style={styles.instructionText}>{patientData.followUp.instruction}</Text>
            <Text style={[styles.metaText, { color: '#dc2626', marginTop: 6 }]}>
              {patientData.followUp.completed ? '✓ Completed' : '⚠ Pending ASHA Home Check'}
            </Text>
          </View>
        </View>

        {/* 6. HEALTH RECORD ARCHIVE */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Past Health Records & Diagnoses</Text>
          {patientData.records.map((rec) => (
            <View key={rec.id} style={styles.recordItem}>
              <View style={styles.rowBetween}>
                <Text style={styles.recordDate}>{rec.date}</Text>
                <Text style={styles.doctorText}>{rec.doctor}</Text>
              </View>
              <Text style={styles.diagnosisText}>Diagnosis: {rec.diagnosis}</Text>
              <Text style={styles.rxText}>Rx: {rec.prescriptions}</Text>
            </View>
          ))}
          <Text style={styles.autoSyncNote}>* Consultations and prescriptions added automatically by system telemetry.</Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingTop: 50, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },
  logoutText: { fontSize: 14, color: '#ef4444', fontWeight: '600' },
  scrollContent: { padding: 16, maxWidth: 800, width: '100%', alignSelf: 'center' },
  card: { backgroundColor: '#ffffff', borderRadius: 10, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { fontSize: 15, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  subtext: { fontSize: 12, color: '#64748b', marginBottom: 10 },
  queueBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: 12, borderRadius: 8 },
  queuePosition: { fontSize: 15, fontWeight: 'bold', color: '#0284c7' },
  metaText: { fontSize: 12, color: '#64748b', marginTop: 2 },
  statusBadge: { backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  statusBadgeText: { fontSize: 11, fontWeight: 'bold', color: '#b45309' },
  callSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  callPromptText: { fontSize: 12, fontWeight: '600', color: '#334155', marginBottom: 8 },
  commRow: { flexDirection: 'row', justifyContent: 'space-between' },
  commButton: { flex: 1, paddingVertical: 9, borderRadius: 6, alignItems: 'center', marginHorizontal: 2 },
  commButtonText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: '#0f172a', marginBottom: 10 },
  uploadButton: { paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  uploadButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  primaryButton: { backgroundColor: '#0284c7', paddingVertical: 11, borderRadius: 8, alignItems: 'center' },
  primaryButtonText: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },
  vaultGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  vaultButton: { flex: 1, backgroundColor: '#f1f5f9', paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginHorizontal: 3, borderWidth: 1, borderColor: '#cbd5e1' },
  vaultButtonActive: { backgroundColor: '#dcfce7', borderColor: '#86efac' },
  vaultButtonText: { fontSize: 11, fontWeight: '600', color: '#334155' },
  vaultButtonFull: { backgroundColor: '#f1f5f9', paddingVertical: 10, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#cbd5e1' },
  vaultButtonActiveFull: { backgroundColor: '#dcfce7', borderColor: '#86efac' },
  vaultButtonTextFull: { fontSize: 12, fontWeight: '600', color: '#334155' },
  infoRow: { flexDirection: 'row', marginBottom: 6 },
  label: { fontSize: 12, fontWeight: '600', color: '#64748b', width: 130 },
  value: { fontSize: 12, color: '#0f172a', flex: 1 },
  referralFlag: { padding: 8, borderRadius: 6, marginTop: 8 },
  followUpBox: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 8 },
  dueDateText: { fontSize: 13, fontWeight: 'bold', color: '#0f172a' },
  instructionText: { fontSize: 12, color: '#334155', marginTop: 2 },
  recordItem: { backgroundColor: '#f8fafc', padding: 10, borderRadius: 8, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: '#0284c7' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  recordDate: { fontSize: 11, fontWeight: 'bold', color: '#64748b' },
  doctorText: { fontSize: 11, color: '#0284c7', fontWeight: '600' },
  diagnosisText: { fontSize: 13, fontWeight: 'bold', color: '#0f172a', marginBottom: 2 },
  rxText: { fontSize: 12, color: '#334155' },
  autoSyncNote: { fontSize: 11, color: '#64748b', fontStyle: 'italic', marginTop: 4, textAlign: 'center' },
});