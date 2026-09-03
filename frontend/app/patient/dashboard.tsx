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
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/i18n';

export default function PatientDashboardScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { patientId } = useLocalSearchParams();
  const currentPatientId = Array.isArray(patientId) ? patientId[0] : patientId;

  // =========================
  // PATIENT PROFILE DATA
  // =========================

  const [patientData, setPatientData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);

  // Profile drawer
  const [profileOpen, setProfileOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);

  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editGender, setEditGender] = useState('');
  const [editVillage, setEditVillage] = useState('');
  const [editBloodGroup, setEditBloodGroup] = useState('');
  const [editConditions, setEditConditions] = useState('');

  // =========================
  // WORKFLOW MOCK DATA
  // =========================
  // These sections will later come from their own
  // Supabase tables: consultations, referrals,
  // follow_ups, records, etc.

  const [workflowData] = useState({
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
      instruction: 'ASHA worker home visit scheduled for vitals re-check.',
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

  // =========================
  // FETCH PATIENT
  // =========================

  useEffect(() => {
    const fetchPatient = async () => {
      if (!currentPatientId) {
        console.log('No patient ID found.');
        setLoading(false);
        return;
      }

      console.log('Fetching patient:', currentPatientId);

      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', currentPatientId)
        .single();

      if (error) {
        console.log('Patient fetch error:', error);
        setLoading(false);
        return;
      }

      console.log('Patient loaded:', data);

      setPatientData(data);

      // Populate profile edit fields
      setEditName(data.name || '');
      setEditEmail(data.email || '');
      setEditAge(data.age ? String(data.age) : '');
      setEditGender(data.gender || '');
      setEditVillage(data.village || '');
      setEditBloodGroup(data.blood_group || '');
      setEditConditions(data.known_conditions || '');

      setLoading(false);
    };

    fetchPatient();
  }, [currentPatientId]);

  useEffect(() => {
    if (!currentPatientId) return;

    const loadPrescriptions = async () => {
      const { data, error } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('patient_id', currentPatientId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Could not load prescriptions:', error);
        return;
      }

      setPrescriptions(data || []);
    };

    loadPrescriptions();

    const pollingId = setInterval(loadPrescriptions, 5000);

    const channel = supabase
      .channel(`patient-prescriptions-${currentPatientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prescriptions',
          filter: `patient_id=eq.${currentPatientId}`,
        },
        loadPrescriptions
      )
      .subscribe();

    return () => {
      clearInterval(pollingId);
      void supabase.removeChannel(channel);
    };
  }, [currentPatientId]);

  // =========================
  // CONSULTATION INTAKE
  // =========================

  const [complaint, setComplaint] = useState('');
  const [duration, setDuration] = useState('');
  const [attachedFileName, setAttachedFileName] = useState<string | null>(null);

  // =========================
  // DOCUMENT VAULT
  // =========================

  const [vaultDocs, setVaultDocs] = useState<{ [key: string]: string }>({});

  // =========================
  // JOIN CONSULTATION
  // =========================

  const handleJoinCall = (mode: string) => {
    Alert.alert(
      'Tele-Consultation Link',
      `Connecting to doctor via ${mode} through your assigned ASHA worker's device...`
    );
  };

  // =========================
  // DOCUMENT UPLOAD
  // =========================

  const handleUploadDocument = async (category: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (
        !result.canceled &&
        result.assets &&
        result.assets.length > 0
      ) {
        const file = result.assets[0];

        setVaultDocs((prev) => ({
          ...prev,
          [category]: file.name,
        }));

        Alert.alert(
          'Upload Successful',
          `${file.name} has been securely added to your ${category} vault.`
        );
      }
    } catch (error) {
      console.error('Document picker error:', error);

      Alert.alert(
        'Upload Failed',
        'Could not process the selected file. Please try again.'
      );
    }
  };

  // =========================
  // CONSULTATION REPORT
  // =========================

  const handleAttachReportForConsultation = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (
        !result.canceled &&
        result.assets &&
        result.assets.length > 0
      ) {
        const file = result.assets[0];

        setAttachedFileName(file.name);

        Alert.alert(
          'Report Attached',
          `${file.name} is linked to this consultation request.`
        );
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'Could not attach report.'
      );
    }
  };

  // =========================
  // BOOK CONSULTATION
  // =========================

  const handleBookConsultation = async () => {
  if (!complaint || !duration) {
    Alert.alert(
      'Missing Details',
      'Please provide your primary complaint and how long you have had it.'
    );
    return;
  }

  try {
    const { data, error } = await supabase
      .from('triage_cases')
      .insert({
        patient_id: currentPatientId,
        age: patientData.age || null,
        gender: patientData.gender || null,
        symptoms: complaint,
        symptom_duration: duration,
        status: 'Pending',
      })
      .select()
      .single();

    if (error) {
      console.log('Triage submission error:', error);

      Alert.alert(
        'Submission Failed',
        error.message
      );

      return;
    }

    console.log('Triage case created:', data);
        setComplaint('');
    setDuration('');
    setAttachedFileName(null);
    Alert.alert(t('success'), t('triageSuccess'));



  } catch (error) {
    console.log('Triage submission error:', error);

    Alert.alert(t('error'), t('failedSubmit'));
  }
};
  // =========================
  // OPEN PROFILE
  // =========================

  const handleOpenProfile = () => {
    if (!patientData) {
      return;
    }

    setEditName(patientData.name || '');
    setEditEmail(patientData.email || '');
    setEditAge(patientData.age ? String(patientData.age) : '');
    setEditGender(patientData.gender || '');
    setEditVillage(patientData.village || '');
    setEditBloodGroup(patientData.blood_group || '');
    setEditConditions(patientData.known_conditions || '');

    setEditingProfile(false);
    setProfileOpen(true);
  };

  // =========================
  // SAVE PROFILE
  // =========================

  const handleSaveProfile = async () => {
    if (!currentPatientId) {
      return;
    }

    const ageNumber =
      editAge.trim() === ''
        ? null
        : Number(editAge);

    if (
      editAge.trim() !== '' &&
      Number.isNaN(ageNumber)
    ) {
      Alert.alert(
        'Invalid Age',
        'Please enter a valid age.'
      );
      return;
    }

    const { data, error } = await supabase
      .from('patients')
      .update({
        name: editName,
        email: editEmail,
        age: ageNumber,
        gender: editGender,
        village: editVillage,
        blood_group: editBloodGroup,
        known_conditions: editConditions,
      })
      .eq('id', currentPatientId)
      .select()
      .single();

    if (error) {
      console.log('Profile update error:', error);

      Alert.alert(
        'Update Failed',
        error.message
      );

      return;
    }

    console.log('Profile updated:', data);

    setPatientData(data);
    setEditingProfile(false);

    Alert.alert(
      'Profile Updated',
      'Your health profile has been updated successfully.'
    );
  };

  // =========================
  // LOADING SCREEN
  // =========================

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>
          Loading patient data...
        </Text>
      </View>
    );
  }

  // =========================
  // ERROR SCREEN
  // =========================

  if (!patientData) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorTitle}>
          Unable to load patient profile
        </Text>

        <Text style={styles.errorText}>
          Please return to the login page and try again.
        </Text>

        <Pressable
          style={styles.primaryButton}
          onPress={() => router.replace('/patient' as any)}
        >
          <Text style={styles.primaryButtonText}>
            Back to Login
          </Text>
        </Pressable>
      </View>
    );
  }

  // =========================
  // MAIN DASHBOARD
  // =========================

  return (
    <View style={styles.container}>

      {/* =========================
          HEADER
      ========================= */}

      <View style={styles.header}>

        <View>
          <Text style={styles.title}>
            {t('patientPortal')}
          </Text>

          <Text style={styles.subtitle}>
            {t('welcome')}, {patientData.name}
          </Text>
        </View>

        <View style={styles.headerActions}>

          {/* PROFILE BUTTON */}
          <Pressable
            style={styles.profileButton}
            onPress={handleOpenProfile}
          >
            <Text style={styles.profileIcon}>
              👤
            </Text>
          </Pressable>

          {/* LOGOUT */}
          <Pressable
            onPress={() => router.replace('/patient' as any)}
          >
            <Text style={styles.logoutText}>
              Log Out
            </Text>
          </Pressable>

        </View>

      </View>

      {/* =========================
          MAIN SCROLL
      ========================= */}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* =========================
            1. LIVE TELE-CONSULTATION
        ========================= */}

        <View style={styles.card}>

          <Text style={styles.cardHeader}>
            {t('triageOperations')}
          </Text>

          <View style={styles.queueBox}>

            <View style={{ flex: 1 }}>

              <Text style={styles.queuePosition}>
                Queue Position: #{workflowData.queueStatus.position}
              </Text>

              <Text style={styles.metaText}>
                Estimated Wait: {workflowData.queueStatus.estimatedWait}
              </Text>

              <Text style={styles.metaText}>
                Assigned ASHA: {workflowData.queueStatus.ashaWorker}
              </Text>

            </View>

            <View style={styles.statusBadge}>

              <Text style={styles.statusBadgeText}>
                {workflowData.queueStatus.triageStatus}
              </Text>

            </View>

          </View>

          <View style={styles.callSection}>

            <Text style={styles.callPromptText}>
              Doctor is ready for your consultation session:
            </Text>

            <View style={styles.commRow}>

              <Pressable
                style={[
                  styles.commButton,
                  { backgroundColor: '#0284c7' },
                ]}
                onPress={() => handleJoinCall('Video Call')}
              >
                <Text style={styles.commButtonText}>
                  📹 Join Video
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.commButton,
                  { backgroundColor: '#0d9488' },
                ]}
                onPress={() => handleJoinCall('Audio Call')}
              >
                <Text style={styles.commButtonText}>
                  📞 Audio Link
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.commButton,
                  { backgroundColor: '#475569' },
                ]}
                onPress={() => handleJoinCall('Text / ASHA Relay')}
              >
                <Text style={styles.commButtonText}>
                  💬 ASHA Relay
                </Text>
              </Pressable>

            </View>

          </View>

        </View>

        {/* =========================
            2. REQUEST CONSULTATION
        ========================= */}

        <View style={styles.card}>

          <Text style={styles.cardHeader}>
            {t('patientDetails')}
          </Text>

          <Text style={styles.subtext}>
            Provide your symptoms and any relevant documents for the doctor:
          </Text>

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
            style={[
              styles.uploadButton,
              attachedFileName
                ? { backgroundColor: '#16a34a' }
                : { backgroundColor: '#64748b' },
            ]}
            onPress={handleAttachReportForConsultation}
          >

            <Text style={styles.uploadButtonText}>
              {attachedFileName
                ? `✓ Attached: ${attachedFileName}`
                : '📎 Attach Recent Test Report / Vitals (Optional)'}
            </Text>

          </Pressable>

          <Pressable
            style={styles.primaryButton}
            onPress={handleBookConsultation}
          >
            <Text style={styles.primaryButtonText}>
              {t('submit')}
            </Text>
          </Pressable>

        </View>

        {/* =========================
            3. DOCUMENT VAULT
        ========================= */}

        <View style={styles.card}>

          <Text style={styles.cardHeader}>
            Health Profile Document Vault
          </Text>

          <Text style={styles.subtext}>
            Select documents from your device to store in your record archive:
          </Text>

          <View style={styles.vaultGrid}>

            <Pressable
              style={[
                styles.vaultButton,
                vaultDocs['Prescriptions'] &&
                  styles.vaultButtonActive,
              ]}
              onPress={() => handleUploadDocument('Prescriptions')}
            >

              <Text style={styles.vaultButtonText}>
                {vaultDocs['Prescriptions']
                  ? '📄 Prescription Uploaded'
                  : '📄 Upload Prescriptions'}
              </Text>

            </Pressable>

            <Pressable
              style={[
                styles.vaultButton,
                vaultDocs['Lab Reports'] &&
                  styles.vaultButtonActive,
              ]}
              onPress={() => handleUploadDocument('Lab Reports')}
            >

              <Text style={styles.vaultButtonText}>
                {vaultDocs['Lab Reports']
                  ? '🧪 Lab Reports Uploaded'
                  : '🧪 Upload Lab Reports'}
              </Text>

            </Pressable>

          </View>

          <Pressable
            style={[
              styles.vaultButtonFull,
              vaultDocs['Identity/Insurance'] &&
                styles.vaultButtonActiveFull,
            ]}
            onPress={() =>
              handleUploadDocument('Identity/Insurance')
            }
          >

            <Text style={styles.vaultButtonTextFull}>
              {vaultDocs['Identity/Insurance']
                ? '✓ Identity / Insurance ID Linked Securely'
                : '🆔 Upload Identity Card / Insurance (Optional)'}
            </Text>

          </Pressable>

        </View>

        {/* =========================
            4. REFERRAL TRACKER
        ========================= */}

        <View style={styles.card}>

          <Text style={styles.cardHeader}>
            Upward Referral Tracker
          </Text>

          <View style={styles.infoRow}>

            <Text style={styles.label}>
              Target Facility:
            </Text>

            <Text style={styles.value}>
              {workflowData.activeReferral.facility}
            </Text>

          </View>

          <View style={styles.infoRow}>

            <Text style={styles.label}>
              Escalation Reason:
            </Text>

            <Text style={styles.value}>
              {workflowData.activeReferral.reason}
            </Text>

          </View>

          <View
            style={[
              styles.referralFlag,
              { backgroundColor: '#fef3c7' },
            ]}
          >

            <Text
              style={{
                color: '#b45309',
                fontWeight: 'bold',
                fontSize: 12,
              }}
            >
              Status: {workflowData.activeReferral.status}
            </Text>

          </View>

        </View>

        {/* =========================
            5. FOLLOW-UP
        ========================= */}

        <View style={styles.card}>

          <Text style={styles.cardHeader}>
            Follow-up Reminders
          </Text>

          <View style={styles.followUpBox}>

            <Text style={styles.dueDateText}>
              Due Date: {workflowData.followUp.dueDate}
            </Text>

            <Text style={styles.instructionText}>
              {workflowData.followUp.instruction}
            </Text>

            <Text
              style={[
                styles.metaText,
                {
                  color: '#dc2626',
                  marginTop: 6,
                },
              ]}
            >
              {workflowData.followUp.completed
                ? '✓ Completed'
                : '⚠ Pending ASHA Home Check'}
            </Text>

          </View>

        </View>

        {/* =========================
            6. HEALTH RECORDS
        ========================= */}

        <View style={styles.card}>

          <Text style={styles.cardHeader}>
            {t('history')}
          </Text>

          {workflowData.records.map((rec) => (

            <View
              key={rec.id}
              style={styles.recordItem}
            >

              <View style={styles.rowBetween}>

                <Text style={styles.recordDate}>
                  {rec.date}
                </Text>

                <Text style={styles.doctorText}>
                  {rec.doctor}
                </Text>

              </View>

              <Text style={styles.diagnosisText}>
                Diagnosis: {rec.diagnosis}
              </Text>

              <Text style={styles.rxText}>
                Rx: {rec.prescriptions}
              </Text>

            </View>

          ))}

          {prescriptions.length > 0 && (
            <>
              <Text style={[styles.cardHeader, { marginTop: 12 }]}>{t('recentPrescriptions')}</Text>

              {prescriptions.map((p) => (
                <View key={p.id} style={styles.recordItem}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.recordDate}>{new Date(p.created_at).toLocaleDateString()}</Text>
                    <Text style={styles.doctorText}>{p.doctor_name || 'Doctor'}</Text>
                  </View>

                  <Text style={styles.diagnosisText}>{t('medicine')}: {p.medicine_name} • {p.dosage}</Text>
                  <Text style={styles.rxText}>Duration: {p.duration || p.frequency} • Instructions: {p.instructions || '—'}</Text>
                </View>
              ))}
            </>
          )}

          <Text style={styles.autoSyncNote}>
            * Consultations and prescriptions added automatically by system telemetry.
          </Text>

        </View>

      </ScrollView>

      {/* =========================
          PROFILE DRAWER
      ========================= */}

      {profileOpen && (

        <View style={styles.drawerOverlay}>

          {/* Background area */}
          <Pressable
            style={styles.drawerBackground}
            onPress={() => setProfileOpen(false)}
          />

          {/* Drawer */}
          <View style={styles.drawer}>

            <View style={styles.drawerHeader}>

              <View>

                <Text style={styles.drawerTitle}>
                  My Profile
                </Text>

                <Text style={styles.drawerSubtitle}>
                  Patient information
                </Text>

              </View>

              <Pressable
                onPress={() => setProfileOpen(false)}
              >
                <Text style={styles.closeButton}>
                  ✕
                </Text>
              </Pressable>

            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.drawerContent}
            >

              {!editingProfile ? (

                <>

                  {/* Profile avatar */}

                  <View style={styles.profileCircle}>
                    <Text style={styles.profileCircleText}>
                      {patientData.name
                        ? patientData.name.charAt(0).toUpperCase()
                        : '?'}
                    </Text>
                  </View>

                  <Text style={styles.profileName}>
                    {patientData.name || 'Not provided'}
                  </Text>

                  <Text style={styles.profilePhone}>
                    📱 {patientData.phone || 'Not provided'}
                  </Text>

                  <View style={styles.profileDivider} />

                  <Text style={styles.profileSectionTitle}>
                    Personal Details
                  </Text>

                  <View style={styles.profileDetail}>
                    <Text style={styles.profileLabel}>
                      Email
                    </Text>

                    <Text style={styles.profileValue}>
                      {patientData.email || 'Not provided'}
                    </Text>
                  </View>

                  <View style={styles.profileDetail}>
                    <Text style={styles.profileLabel}>
                      Age
                    </Text>

                    <Text style={styles.profileValue}>
                      {patientData.age || 'Not provided'}
                    </Text>
                  </View>

                  <View style={styles.profileDetail}>
                    <Text style={styles.profileLabel}>
                      Gender
                    </Text>

                    <Text style={styles.profileValue}>
                      {patientData.gender || 'Not provided'}
                    </Text>
                  </View>

                  <View style={styles.profileDetail}>
                    <Text style={styles.profileLabel}>
                      Village
                    </Text>

                    <Text style={styles.profileValue}>
                      {patientData.village || 'Not provided'}
                    </Text>
                  </View>

                  <View style={styles.profileDivider} />

                  <Text style={styles.profileSectionTitle}>
                    Health Information
                  </Text>

                  <View style={styles.profileDetail}>
                    <Text style={styles.profileLabel}>
                      Blood Group
                    </Text>

                    <Text style={styles.profileValue}>
                      {patientData.blood_group || 'Not provided'}
                    </Text>
                  </View>

                  <View style={styles.profileDetail}>
                    <Text style={styles.profileLabel}>
                      Known Conditions
                    </Text>

                    <Text style={styles.profileValue}>
                      {patientData.known_conditions || 'None provided'}
                    </Text>
                  </View>

                  <Pressable
                    style={styles.editButton}
                    onPress={() => setEditingProfile(true)}
                  >
                    <Text style={styles.editButtonText}>
                      Edit Profile
                    </Text>
                  </Pressable>

                </>

              ) : (

                <>

                  <Text style={styles.profileSectionTitle}>
                    Edit Personal Details
                  </Text>

                  <Text style={styles.fieldLabel}>
                    Full Name
                  </Text>

                  <TextInput
                    style={styles.profileInput}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Full name"
                  />

                  <Text style={styles.fieldLabel}>
                    Email
                  </Text>

                  <TextInput
                    style={styles.profileInput}
                    value={editEmail}
                    onChangeText={setEditEmail}
                    placeholder="Email address"
                    keyboardType="email-address"
                  />

                  <Text style={styles.fieldLabel}>
                    Phone Number
                  </Text>

                  <TextInput
                    style={[
                      styles.profileInput,
                      styles.disabledInput,
                    ]}
                    value={patientData.phone || ''}
                    editable={false}
                  />

                  <Text style={styles.fieldHint}>
                    Phone number cannot be changed here.
                  </Text>

                  <Text style={styles.fieldLabel}>
                    Age
                  </Text>

                  <TextInput
                    style={styles.profileInput}
                    value={editAge}
                    onChangeText={setEditAge}
                    placeholder="Age"
                    keyboardType="numeric"
                  />

                  <Text style={styles.fieldLabel}>
                    Gender
                  </Text>

                  <TextInput
                    style={styles.profileInput}
                    value={editGender}
                    onChangeText={setEditGender}
                    placeholder="Gender"
                  />

                  <Text style={styles.fieldLabel}>
                    Village
                  </Text>

                  <TextInput
                    style={styles.profileInput}
                    value={editVillage}
                    onChangeText={setEditVillage}
                    placeholder="Village"
                  />

                  <Text style={styles.profileSectionTitle}>
                    Health Information
                  </Text>

                  <Text style={styles.fieldLabel}>
                    Blood Group
                  </Text>

                  <TextInput
                    style={styles.profileInput}
                    value={editBloodGroup}
                    onChangeText={setEditBloodGroup}
                    placeholder="e.g. O+"
                  />

                  <Text style={styles.fieldLabel}>
                    Known Conditions
                  </Text>

                  <TextInput
                    style={[
                      styles.profileInput,
                      styles.multilineInput,
                    ]}
                    value={editConditions}
                    onChangeText={setEditConditions}
                    placeholder="Known medical conditions"
                    multiline
                  />

                  <Pressable
                    style={styles.saveButton}
                    onPress={handleSaveProfile}
                  >
                    <Text style={styles.saveButtonText}>
                      Save Changes
                    </Text>
                  </Pressable>

                  <Pressable
                    style={styles.cancelButton}
                    onPress={() => setEditingProfile(false)}
                  >
                    <Text style={styles.cancelButtonText}>
                      Cancel
                    </Text>
                  </Pressable>

                </>

              )}

            </ScrollView>

          </View>

        </View>

      )}

    </View>
  );
}

// ======================================================
// STYLES
// ======================================================

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#f4f6f8',
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: '#f4f6f8',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  loadingText: {
    fontSize: 15,
    color: '#5f7181',
  },

  errorTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#143b61',
    marginBottom: 8,
  },

  errorText: {
    fontSize: 13,
    color: '#607487',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },

  header: {
    paddingTop: 50,
    paddingHorizontal: 28,
    paddingBottom: 18,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#d5dfe7',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#143b61',
    letterSpacing: 0.1,
  },

  subtitle: {
    fontSize: 13,
    color: '#667b8f',
    marginTop: 3,
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },

  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eef7fb',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#c4dde8',
  },

  profileIcon: {
    fontSize: 18,
  },

  logoutText: {
    fontSize: 14,
    color: '#c74f4f',
    fontWeight: '700',
  },

  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 34,
    maxWidth: 920,
    width: '100%',
    alignSelf: 'center',
  },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 6,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#d5dfe7',
  },

  cardHeader: {
    fontSize: 17,
    fontWeight: '800',
    color: '#143b61',
    marginBottom: 7,
  },

  subtext: {
    fontSize: 13,
    color: '#64798b',
    lineHeight: 20,
    marginBottom: 14,
  },

  queueBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f4f8fc',
    padding: 15,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#dce6ed',
  },

  queuePosition: {
    fontSize: 16,
    fontWeight: '800',
    color: '#087bb5',
  },

  metaText: {
    fontSize: 12,
    color: '#64778a',
    marginTop: 3,
  },

  statusBadge: {
    backgroundColor: '#fff6d9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#edd58c',
  },

  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9d6500',
  },

  callSection: {
    marginTop: 16,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e1e8ee',
  },

  callPromptText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#274864',
    marginBottom: 10,
  },

  commRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  commButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 4,
    alignItems: 'center',
    marginHorizontal: 3,
  },

  commButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },

  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#c8d5df',
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    color: '#183d60',
    marginBottom: 12,
  },

  uploadButton: {
    paddingVertical: 12,
    borderRadius: 4,
    alignItems: 'center',
    marginBottom: 12,
  },

  uploadButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },

  primaryButton: {
    backgroundColor: '#0d9488',
    paddingVertical: 14,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },

  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },

  vaultGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  vaultButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    borderRadius: 4,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#c8d5df',
  },

  vaultButtonActive: {
    backgroundColor: '#edf9f7',
    borderColor: '#9bd9d1',
  },

  vaultButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#183d60',
    textAlign: 'center',
  },

  vaultButtonFull: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    borderRadius: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#c8d5df',
  },

  vaultButtonActiveFull: {
    backgroundColor: '#edf9f7',
    borderColor: '#9bd9d1',
  },

  vaultButtonTextFull: {
    fontSize: 12,
    fontWeight: '700',
    color: '#183d60',
    textAlign: 'center',
  },

  infoRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },

  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64798b',
    width: 130,
  },

  value: {
    fontSize: 13,
    color: '#183d60',
    flex: 1,
    lineHeight: 19,
  },

  referralFlag: {
    padding: 9,
    borderRadius: 4,
    marginTop: 9,
    borderWidth: 1,
    borderColor: '#ead69a',
  },

  followUpBox: {
    backgroundColor: '#f4f8fc',
    padding: 15,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#dce6ed',
  },

  dueDateText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#143b61',
  },

  instructionText: {
    fontSize: 13,
    color: '#36566d',
    marginTop: 4,
    lineHeight: 19,
  },

  recordItem: {
    backgroundColor: '#f7fafc',
    padding: 14,
    borderRadius: 4,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#dce6ed',
    borderLeftWidth: 4,
    borderLeftColor: '#0d9488',
  },

  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },

  recordDate: {
    fontSize: 11,
    fontWeight: '800',
    color: '#657b8d',
  },

  doctorText: {
    fontSize: 11,
    color: '#087bb5',
    fontWeight: '800',
  },

  diagnosisText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#143b61',
    marginBottom: 3,
  },

  rxText: {
    fontSize: 12,
    color: '#3f5a6c',
    lineHeight: 18,
  },

  autoSyncNote: {
    fontSize: 11,
    color: '#6a7d8d',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },

  // =========================
  // PROFILE DRAWER
  // =========================

  drawerOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
  },

  drawerBackground: {
    flex: 1,
    backgroundColor: 'rgba(20, 59, 97, 0.28)',
  },

  drawer: {
    width: 380,
    maxWidth: '88%',
    backgroundColor: '#ffffff',
    height: '100%',
    borderLeftWidth: 1,
    borderLeftColor: '#d5dfe7',
  },

  drawerHeader: {
    paddingTop: 50,
    paddingHorizontal: 22,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#d5dfe7',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  drawerTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#143b61',
  },

  drawerSubtitle: {
    fontSize: 13,
    color: '#667b8f',
    marginTop: 3,
  },

  closeButton: {
    fontSize: 22,
    color: '#274864',
    padding: 4,
  },

  drawerContent: {
    padding: 22,
    paddingBottom: 40,
  },

  profileCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#edf7fb',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 11,
    borderWidth: 1,
    borderColor: '#c4dde8',
  },

  profileCircleText: {
    fontSize: 30,
    fontWeight: '800',
    color: '#087bb5',
  },

  profileName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#143b61',
    textAlign: 'center',
  },

  profilePhone: {
    fontSize: 12,
    color: '#667b8f',
    textAlign: 'center',
    marginTop: 5,
  },

  profileDivider: {
    height: 1,
    backgroundColor: '#d5dfe7',
    marginVertical: 19,
  },

  profileSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#143b61',
    marginBottom: 13,
    marginTop: 7,
  },

  profileDetail: {
    marginBottom: 15,
  },

  profileLabel: {
    fontSize: 11,
    color: '#657b8d',
    fontWeight: '600',
    marginBottom: 4,
  },

  profileValue: {
    fontSize: 13,
    color: '#183d60',
    lineHeight: 20,
  },

  editButton: {
    backgroundColor: '#0d9488',
    paddingVertical: 13,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    minHeight: 48,
  },

  editButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },

  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#274864',
    marginBottom: 6,
    marginTop: 9,
  },

  profileInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#c8d5df',
    borderRadius: 4,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 14,
    color: '#183d60',
  },

  disabledInput: {
    backgroundColor: '#eef2f5',
    color: '#697b8b',
  },

  fieldHint: {
    fontSize: 10,
    color: '#8093a3',
    marginTop: 4,
  },

  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },

  saveButton: {
    backgroundColor: '#0d9488',
    paddingVertical: 13,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
    minHeight: 48,
  },

  saveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },

  cancelButton: {
    backgroundColor: '#f4f6f8',
    paddingVertical: 13,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 9,
    borderWidth: 1,
    borderColor: '#d5dfe7',
  },

  cancelButtonText: {
    color: '#274864',
    fontSize: 14,
    fontWeight: '700',
  },

});
