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

export default function PatientDashboardScreen() {
  const router = useRouter();
  const { patientId } = useLocalSearchParams();

  // =========================
  // PATIENT PROFILE DATA
  // =========================

  const [patientData, setPatientData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
      if (!patientId) {
        console.log('No patient ID found.');
        setLoading(false);
        return;
      }

      console.log('Fetching patient:', patientId);

      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
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
  }, [patientId]);

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
        patient_id: patientId,
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
    Alert.alert(
      'Consultation Requested',
      'Your case has been submitted to the triage queue.'
    );



  } catch (error) {
    console.log('Triage submission error:', error);

    Alert.alert(
      'Submission Failed',
      'Could not submit your case to the triage queue.'
    );
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
    if (!patientId) {
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
      .eq('id', patientId)
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
            Patient Health Portal
          </Text>

          <Text style={styles.subtitle}>
            Welcome, {patientData.name}
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
            Doctor Triage & Call Status
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
            Book New Consultation / Request Help
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
              Submit to Triage Queue
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
            Past Health Records & Diagnoses
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
    backgroundColor: '#f8fafc',
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  loadingText: {
    fontSize: 16,
    color: '#64748b',
  },

  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },

  errorText: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 20,
    textAlign: 'center',
  },

  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },

  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  profileButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bae6fd',
  },

  profileIcon: {
    fontSize: 18,
  },

  logoutText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '600',
  },

  scrollContent: {
    padding: 16,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  cardHeader: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },

  subtext: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 10,
  },

  queueBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
  },

  queuePosition: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0284c7',
  },

  metaText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },

  statusBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },

  statusBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#b45309',
  },

  callSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },

  callPromptText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },

  commRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  commButton: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 6,
    alignItems: 'center',
    marginHorizontal: 2,
  },

  commButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },

  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
    marginBottom: 10,
  },

  uploadButton: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },

  uploadButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },

  primaryButton: {
    backgroundColor: '#0284c7',
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
  },

  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  vaultGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  vaultButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },

  vaultButtonActive: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
  },

  vaultButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },

  vaultButtonFull: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },

  vaultButtonActiveFull: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
  },

  vaultButtonTextFull: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },

  infoRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },

  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    width: 130,
  },

  value: {
    fontSize: 12,
    color: '#0f172a',
    flex: 1,
  },

  referralFlag: {
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },

  followUpBox: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
  },

  dueDateText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0f172a',
  },

  instructionText: {
    fontSize: 12,
    color: '#334155',
    marginTop: 2,
  },

  recordItem: {
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#0284c7',
  },

  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },

  recordDate: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748b',
  },

  doctorText: {
    fontSize: 11,
    color: '#0284c7',
    fontWeight: '600',
  },

  diagnosisText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 2,
  },

  rxText: {
    fontSize: 12,
    color: '#334155',
  },

  autoSyncNote: {
    fontSize: 11,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 4,
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
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },

  drawer: {
    width: 360,
    maxWidth: '88%',
    backgroundColor: '#ffffff',
    height: '100%',
    borderLeftWidth: 1,
    borderLeftColor: '#e2e8f0',
  },

  drawerHeader: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  drawerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },

  drawerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },

  closeButton: {
    fontSize: 22,
    color: '#475569',
    padding: 4,
  },

  drawerContent: {
    padding: 20,
    paddingBottom: 40,
  },

  profileCircle: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 10,
  },

  profileCircleText: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#0284c7',
  },

  profileName: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'center',
  },

  profilePhone: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
  },

  profileDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 18,
  },

  profileSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 12,
    marginTop: 6,
  },

  profileDetail: {
    marginBottom: 14,
  },

  profileLabel: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 3,
  },

  profileValue: {
    fontSize: 13,
    color: '#0f172a',
    lineHeight: 19,
  },

  editButton: {
    backgroundColor: '#0284c7',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },

  editButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 5,
    marginTop: 8,
  },

  profileInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
  },

  disabledInput: {
    backgroundColor: '#e2e8f0',
    color: '#64748b',
  },

  fieldHint: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 3,
  },

  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },

  saveButton: {
    backgroundColor: '#16a34a',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },

  saveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  cancelButton: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },

  cancelButtonText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '600',
  },

});
