import * as DocumentPicker from 'expo-document-picker';
import * as Linking from 'expo-linking';
import NetInfo from '@react-native-community/netinfo';
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
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/i18n';
import { runOfflineTriage, OfflineTriageResult } from '../lib/offlineTriage';

// TODO: Replace with the assigned/demo ASHA worker's actual phone number
// before using this in a real triage flow.
const ASHA_PHONE = '+919483412554';

export default function PatientDashboardScreen() {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(true);
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
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online =
        state.isConnected === true &&
        state.isInternetReachable !== false;

      setIsOnline(online);
    });

    return () => unsubscribe();
  }, []);

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
  const [offlineTriageOpen, setOfflineTriageOpen] = useState(false);

  const [offlineSymptoms, setOfflineSymptoms] = useState('');
  const [offlineDuration, setOfflineDuration] = useState('');

  // Tri-state (null = not yet answered) so a red-flag question can never
  // silently default to "No" before the patient actually answers it.
  const [difficultyBreathing, setDifficultyBreathing] = useState<boolean | null>(null);
  const [chestPain, setChestPain] = useState<boolean | null>(null);
  const [unconscious, setUnconscious] = useState<boolean | null>(null);
  const [seizure, setSeizure] = useState<boolean | null>(null);
  const [severeBleeding, setSevereBleeding] = useState<boolean | null>(null);
  const [poisoning, setPoisoning] = useState<boolean | null>(null);

  const [offlineResult, setOfflineResult] = useState<OfflineTriageResult | null>(null);

  // =========================
  // ASHA EMERGENCY CALL
  // Declared after offlineResult so useEffects below
  // can safely reference both in their dependency arrays.
  // =========================

  const [ashaCallActive, setAshaCallActive] = useState(false);
  const [ashaCallRejected, setAshaCallRejected] = useState(false);
  // Seconds remaining before the phone dialer is opened (5 -> 0), or null when no countdown is running.
  const [ashaCountdown, setAshaCountdown] = useState<number | null>(null);
  // Guards against opening the dialer more than once for the same countdown.
  const ashaCallPlacedRef = useRef(false);

  // Fire automatically the moment a RED result lands: start the 5-second countdown.
  useEffect(() => {
    if (offlineResult?.level === 'RED') {
      ashaCallPlacedRef.current = false;
      setAshaCallActive(true);
      setAshaCallRejected(false);
      setAshaCountdown(5);
      Alert.alert(
        '🚨 Critical Situation Detected',
        'Your responses indicate a potentially life-threatening emergency. We will open a call to your assigned ASHA worker shortly.',
        [{ text: 'OK', style: 'default' }]
      );
    } else {
      // Result cleared or changed to a non-RED level — stop any countdown in progress.
      ashaCallPlacedRef.current = false;
      setAshaCallActive(false);
      setAshaCallRejected(false);
      setAshaCountdown(null);
    }
  }, [offlineResult]);

  // Countdown ticker: decrements every second while active, and opens the
  // phone dialer via Linking once it reaches 0. Cleans itself up on
  // cancel, unmount, or whenever its dependencies change.
  useEffect(() => {
    if (!ashaCallActive || ashaCallRejected || ashaCountdown === null) {
      return;
    }

    if (ashaCountdown <= 0) {
      if (!ashaCallPlacedRef.current) {
        ashaCallPlacedRef.current = true;
        Linking.openURL(`tel:${ASHA_PHONE}`).catch((err) => {
          console.error('Could not open phone dialer:', err);
        });
      }
      return;
    }

    const timeoutId = setTimeout(() => {
      setAshaCountdown((prev) => (prev !== null ? prev - 1 : prev));
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [ashaCallActive, ashaCallRejected, ashaCountdown]);

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
  // OFFLINE TRIAGE
  // =========================

  const handleRunOfflineTriage = () => {
    const unanswered = [
      difficultyBreathing,
      chestPain,
      unconscious,
      seizure,
      severeBleeding,
      poisoning,
    ].some((v) => v === null);

    if (unanswered) {
      Alert.alert(
        'Incomplete',
        'Please answer Yes or No to every question before checking your situation.'
      );
      return;
    }

    const patientAge = patientData?.age ? Number(patientData.age) : 0;
    const hasChronicCondition = Boolean(
      patientData?.known_conditions && String(patientData.known_conditions).trim().length > 0
    );

    const result = runOfflineTriage({
      symptoms: offlineSymptoms,
      symptomDuration: offlineDuration,
      difficultyBreathing: Boolean(difficultyBreathing),
      chestPain: Boolean(chestPain),
      unconscious: Boolean(unconscious),
      seizure: Boolean(seizure),
      severeBleeding: Boolean(severeBleeding),
      poisoning: Boolean(poisoning),
      // Not collected by this quick-check form yet — defaulted safely.
      // Consider adding dedicated questions if these need to affect triage.
      severeDehydration: false,
      suspectedFracture: false,
      highFever: false,
      persistentVomiting: false,
      age: patientAge,
      isPregnant: false,
      hasChronicCondition,
      isInfantUnder1: patientAge > 0 && patientAge < 1,
    });

    setOfflineResult(result);
  };

  // =========================
  // ASHA CALL — REJECT
  // =========================

  const handleRejectAshaCall = () => {
    // Stop the countdown immediately; the triage result stays visible and unchanged.
    ashaCallPlacedRef.current = true; // guard: prevents the countdown effect from placing a call
    setAshaCallActive(false);
    setAshaCallRejected(true);
    setAshaCountdown(null);
  };

  const handleResetOfflineTriage = () => {
    setOfflineTriageOpen(false);
    setOfflineSymptoms('');
    setOfflineDuration('');
    setDifficultyBreathing(null);
    setChestPain(null);
    setUnconscious(null);
    setSeizure(null);
    setSevereBleeding(null);
    setPoisoning(null);
    setOfflineResult(null);
    // Reset ASHA call state too
    ashaCallPlacedRef.current = false;
    setAshaCallActive(false);
    setAshaCallRejected(false);
    setAshaCountdown(null);
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
        {isOnline ? (
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
        ) : (
          <View style={styles.card}>
            {!offlineTriageOpen ? (
              <>
                <View
                  style={{
                    backgroundColor: '#fee2e2',
                    padding: 14,
                    borderRadius: 6,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: '#fecaca',
                  }}
                >
                  <Text
                    style={{
                      color: '#b91c1c',
                      fontWeight: '800',
                      fontSize: 14,
                    }}
                  >
                    🔴 You are offline
                  </Text>

                  <Text
                    style={{
                      color: '#991b1b',
                      fontSize: 12,
                      marginTop: 4,
                    }}
                  >
                    Internet is unavailable. You can still complete a basic
                    health check on your device.
                  </Text>
                </View>

                <Text style={styles.cardHeader}>
                  Offline Health Check
                </Text>

                <Text style={styles.subtext}>
                  You are currently offline. Please answer a few essential
                  questions so we can understand how serious your situation may
                  be and guide you on what to do next.
                </Text>

                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: '#64748b',
                    marginBottom: 12,
                  }}
                >
                  6 essential questions • No internet required
                </Text>

                <Pressable
                  style={styles.primaryButton}
                  onPress={() => setOfflineTriageOpen(true)}
                >
                  <Text style={styles.primaryButtonText}>
                    Start Offline Health Check
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.cardHeader}>
                  Offline Health Check
                </Text>

                <Text style={styles.subtext}>
                  Please answer these questions about your current condition.
                </Text>

                <Text style={styles.fieldLabel}>
                  What symptoms are you experiencing?
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="Describe your symptoms"
                  value={offlineSymptoms}
                  onChangeText={setOfflineSymptoms}
                  multiline
                />

                <Text style={styles.fieldLabel}>
                  How long have you had these symptoms?
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="For example: 2 days"
                  value={offlineDuration}
                  onChangeText={setOfflineDuration}
                />

                <Text style={styles.fieldLabel}>
                  Are you having difficulty breathing?
                </Text>

                <View style={styles.commRow}>
                  <Pressable
                    style={[styles.toggleButton, difficultyBreathing === true && styles.toggleButtonSelected]}
                    onPress={() => setDifficultyBreathing(true)}
                  >
                    <Text style={styles.toggleButtonText}>Yes</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.toggleButton, difficultyBreathing === false && styles.toggleButtonSelected]}
                    onPress={() => setDifficultyBreathing(false)}
                  >
                    <Text style={styles.toggleButtonText}>No</Text>
                  </Pressable>
                </View>

                <Text style={styles.fieldLabel}>
                  Are you experiencing chest pain?
                </Text>

                <View style={styles.commRow}>
                  <Pressable
                    style={[styles.toggleButton, chestPain === true && styles.toggleButtonSelected]}
                    onPress={() => setChestPain(true)}
                  >
                    <Text style={styles.toggleButtonText}>Yes</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.toggleButton, chestPain === false && styles.toggleButtonSelected]}
                    onPress={() => setChestPain(false)}
                  >
                    <Text style={styles.toggleButtonText}>No</Text>
                  </Pressable>
                </View>

                <Text style={styles.fieldLabel}>
                  Have you been unconscious or had a seizure?
                </Text>

                <View style={styles.commRow}>
                  <Pressable
                    style={[styles.toggleButton, unconscious === true && styles.toggleButtonSelected]}
                    onPress={() => {
                      setUnconscious(true);
                      setSeizure(true);
                    }}
                  >
                    <Text style={styles.toggleButtonText}>Yes</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.toggleButton, unconscious === false && styles.toggleButtonSelected]}
                    onPress={() => {
                      setUnconscious(false);
                      setSeizure(false);
                    }}
                  >
                    <Text style={styles.toggleButtonText}>No</Text>
                  </Pressable>
                </View>

                <Text style={styles.fieldLabel}>
                  Are you experiencing severe bleeding or possible poisoning?
                </Text>

                <View style={styles.commRow}>
                  <Pressable
                    style={[styles.toggleButton, severeBleeding === true && styles.toggleButtonSelected]}
                    onPress={() => {
                      setSevereBleeding(true);
                      setPoisoning(true);
                    }}
                  >
                    <Text style={styles.toggleButtonText}>Yes</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.toggleButton, severeBleeding === false && styles.toggleButtonSelected]}
                    onPress={() => {
                      setSevereBleeding(false);
                      setPoisoning(false);
                    }}
                  >
                    <Text style={styles.toggleButtonText}>No</Text>
                  </Pressable>
                </View>

                {!offlineResult && (
                  <Pressable
                    style={styles.primaryButton}
                    onPress={handleRunOfflineTriage}
                  >
                    <Text style={styles.primaryButtonText}>
                      Check My Situation
                    </Text>
                  </Pressable>
                )}

                {offlineResult && (
                  <View
                    style={[
                      styles.resultCard,
                      offlineResult.level === 'RED'
                        ? styles.resultCardRed
                        : offlineResult.level === 'YELLOW'
                        ? styles.resultCardYellow
                        : styles.resultCardGreen,
                    ]}
                  >
                    <Text style={styles.resultLevelText}>
                      {offlineResult.level === 'RED'
                        ? '🔴 RED — Critical'
                        : offlineResult.level === 'YELLOW'
                        ? '🟡 YELLOW — Needs Attention'
                        : '🟢 GREEN — Routine'}
                    </Text>

                    <Text style={styles.resultUrgencyText}>
                      Urgency: {offlineResult.urgency}
                    </Text>

                    <Text style={styles.resultActionText}>
                      {offlineResult.recommendedAction}
                    </Text>

                    {offlineResult.matchedReasons && offlineResult.matchedReasons.length > 0 && (
                      <View style={styles.resultReasonsBox}>
                        <Text style={styles.resultReasonsTitle}>Based on:</Text>

                        {offlineResult.matchedReasons.map((reason, idx) => (
                          <Text key={idx} style={styles.resultReasonItem}>
                            • {reason}
                          </Text>
                        ))}
                      </View>
                    )}

                    {/* =======================================
                        ASHA EMERGENCY CALL — shown only
                        when the result is RED / Critical
                    ======================================= */}
                    {offlineResult.level === 'RED' && (
                      <View style={styles.ashaCallSection}>

                        {!ashaCallRejected ? (
                          <View style={styles.ashaCountdownBox}>
                            <Text style={styles.ashaCountdownTitle}>
                              CRITICAL CASE
                            </Text>

                            <Text style={styles.ashaCountdownSubtext}>
                              ASHA worker will be contacted in {ashaCountdown ?? 5} second
                              {(ashaCountdown ?? 5) === 1 ? '' : 's'}.
                            </Text>

                            <Text style={styles.ashaCountdownNumber}>
                              {ashaCountdown ?? 5}
                            </Text>

                            <Pressable
                              style={styles.ashaCancelButton}
                              onPress={handleRejectAshaCall}
                              accessibilityLabel="Cancel automatic ASHA worker call"
                            >
                              <Text style={styles.ashaCancelButtonText}>
                                CANCEL CALL
                              </Text>
                            </Pressable>
                          </View>
                        ) : (
                          /* Rejected state */
                          <View style={styles.ashaRejectedBox}>
                            <Text style={styles.ashaRejectedTitle}>
                              ⚠ ASHA Contact Cancelled
                            </Text>

                            <Text style={styles.ashaRejectedText}>
                              You cancelled the ASHA worker alert. For a critical emergency, go to the nearest health centre immediately or call emergency services.
                            </Text>

                            <Pressable
                              style={styles.ashaRetryButton}
                              onPress={() => {
                                ashaCallPlacedRef.current = false;
                                setAshaCallRejected(false);
                                setAshaCallActive(true);
                                setAshaCountdown(5);
                              }}
                            >
                              <Text style={styles.ashaRetryButtonText}>
                                ↺ Retry ASHA Contact
                              </Text>
                            </Pressable>
                          </View>
                        )}

                      </View>
                    )}
                    {/* END ASHA EMERGENCY CALL */}

                    <Pressable
                      style={styles.resetOfflineButton}
                      onPress={handleResetOfflineTriage}
                    >
                      <Text style={styles.resetOfflineButtonText}>
                        Start Over
                      </Text>
                    </Pressable>
                  </View>
                )}
              </>
            )}
          </View>
        )}

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

  toggleButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 4,
    alignItems: 'center',
    marginHorizontal: 3,
    backgroundColor: '#cbd5e1',
  },

  toggleButtonSelected: {
    backgroundColor: '#0d9488',
  },

  toggleButtonText: {
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

  resultCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 6,
    borderWidth: 1,
  },

  resultCardRed: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
  },

  resultCardYellow: {
    backgroundColor: '#fef9c3',
    borderColor: '#fde047',
  },

  resultCardGreen: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
  },

  resultLevelText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#143b61',
    marginBottom: 4,
  },

  resultUrgencyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3f5a6c',
    marginBottom: 8,
  },

  resultActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#183d60',
    lineHeight: 20,
    marginBottom: 10,
  },

  resultReasonsBox: {
    marginTop: 4,
    marginBottom: 12,
  },

  resultReasonsTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#3f5a6c',
    marginBottom: 4,
  },

  resultReasonItem: {
    fontSize: 12,
    color: '#3f5a6c',
    lineHeight: 18,
  },

  resetOfflineButton: {
    backgroundColor: '#475569',
    paddingVertical: 11,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 12,
  },

  resetOfflineButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },

  // =========================
  // ASHA EMERGENCY CALL
  // =========================

  ashaCallSection: {
    marginTop: 14,
    marginBottom: 4,
    borderTopWidth: 1,
    borderTopColor: '#fca5a5',
    paddingTop: 14,
  },

  ashaAutoAlertBanner: {
    backgroundColor: '#7f1d1d',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginBottom: 10,
    alignItems: 'center',
  },

  ashaAutoAlertText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  // Countdown box shown while the automatic ASHA call is pending.
  ashaCountdownBox: {
    backgroundColor: '#0f172a',
    borderRadius: 6,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#ef4444',
    alignItems: 'center',
  },

  ashaCountdownTitle: {
    color: '#fecaca',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 6,
  },

  ashaCountdownSubtext: {
    color: '#f1f5f9',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
  },

  ashaCountdownNumber: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 16,
  },

  ashaCancelButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 4,
    alignItems: 'center',
  },

  ashaCancelButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  // The main "Contacting..." button — pressing it fires handleRejectAshaCall
  ashaContactingButton: {
    backgroundColor: '#0f172a',
    borderRadius: 6,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: '#3b82f6',
  },

  ashaContactingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },

  // Animated pulsing green circle
  ashaPulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4ade80',
    marginRight: 9,
    flexShrink: 0,
  },

  ashaContactingTitle: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },

  ashaContactingWorker: {
    color: '#93c5fd',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 19,
    marginBottom: 10,
  },

  ashaContactingDivider: {
    height: 1,
    backgroundColor: '#1e3a5f',
    marginBottom: 9,
  },

  ashaContactingRejectHint: {
    color: '#fca5a5',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Shown after the patient rejects the call
  ashaRejectedBox: {
    backgroundColor: '#fef3c7',
    padding: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },

  ashaRejectedTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400e',
    marginBottom: 6,
  },

  ashaRejectedText: {
    fontSize: 12,
    color: '#78350f',
    lineHeight: 18,
    marginBottom: 12,
  },

  ashaRetryButton: {
    backgroundColor: '#b45309',
    paddingVertical: 10,
    borderRadius: 4,
    alignItems: 'center',
  },

  ashaRetryButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },

  // =========================
  // DOCUMENT VAULT
  // =========================

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
