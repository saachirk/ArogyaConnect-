import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from 'react-native';

export default function DoctorDashboardScreen() {
  const router = useRouter();

  const [isOnline, setIsOnline] = useState(true);

  const [activeTab, setActiveTab] = useState<
    'queue' | 'history' | 'followups'
  >('queue');

  // Selected case
  const [selectedCase, setSelectedCase] = useState<any | null>(null);

  // Structured Prescription State
  const [drugName, setDrugName] = useState('');
  const [dosage, setDosage] = useState('');
  const [duration, setDuration] = useState('');
  const [instructions, setInstructions] = useState('');

  // Referral State
  const [referralFacility, setReferralFacility] = useState('');
  const [referralReason, setReferralReason] = useState('');

  // Mock Queue Data
  const [queueCases, setQueueCases] = useState([
    {
      id: '1',
      patientName: 'Lakshmiamma',
      age: 48,
      gender: 'Female',
      ashaWorker: 'Sunita',
      symptoms: 'High fever, chills, body ache',
      vitals: 'Temp: 102°F | BP: 110/70 | SpO2: 96%',
      risk: 'Moderate',
      ashaNotes: 'History of diabetes. Paracetamol given locally.',
      history: 'Type-2 Diabetes (5 years). No prior hospitalizations.',
    },
    {
      id: '2',
      patientName: 'Ramesh Kumar',
      age: 62,
      gender: 'Male',
      ashaWorker: 'Geetha',
      symptoms: 'Chest discomfort & shortness of breath',
      vitals: 'Temp: 98.4°F | BP: 140/90 | SpO2: 91%',
      risk: 'High',
      ashaNotes:
        'Urgent review requested. SpO2 dropped after walking.',
      history: 'Hypertension, Smoker.',
    },
  ]);

  // Tracked Referrals
  const [referrals, setReferrals] = useState([
    {
      id: 'ref-101',
      patientName: 'Ramesh Kumar',
      facility: 'District Hospital Hub',
      reason: 'Unstable SpO2 & chest pain',
      status: 'Pending Transport',
    },
  ]);

  // Follow-ups
  const [followUps, setFollowUps] = useState([
    {
      id: 'fu-1',
      patientName: 'Lakshmiamma',
      risk: 'High',
      ashaCompleted: false,
      dueDate: 'Today',
    },
  ]);

  // Communication
  const handleStartCall = (
    mode: 'Video' | 'Audio' | 'Text Fallback'
  ) => {
    Alert.alert(
      'Communication Link',
      `Initiating ${mode} connection with ASHA & Patient...`
    );
  };

  // Prescription
  const handleIssuePrescription = () => {
    if (!drugName || !dosage) {
      Alert.alert(
        'Error',
        'Please fill out at least the drug name and dosage.'
      );
      return;
    }

    Alert.alert(
      'Prescription Saved',
      `Structured Rx: ${drugName} (${dosage}) for ${duration}. Sent to ASHA.`
    );

    setDrugName('');
    setDosage('');
    setDuration('');
    setInstructions('');
  };

  // Referral
  const handleCreateReferral = () => {
    if (!referralFacility || !referralReason) {
      Alert.alert(
        'Error',
        'Provide both facility and reason for upward referral.'
      );
      return;
    }

    if (!selectedCase) {
      return;
    }

    setReferrals([
      ...referrals,
      {
        id: `ref-${Date.now()}`,
        patientName: selectedCase.patientName,
        facility: referralFacility,
        reason: referralReason,
        status: 'Active Tracker',
      },
    ]);

    Alert.alert(
      'Referral Logged',
      'Patient referred upward. Status is now tracked in the system.'
    );

    setReferralFacility('');
    setReferralReason('');
  };

  return (
    <View style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>
            Doctor Triage & Operations
          </Text>

          <Text style={styles.subtitle}>
            Unified Rural Health Tele-Link
          </Text>
        </View>

        <View style={styles.statusBox}>
          <Text
            style={[
              styles.statusText,
              {
                color: isOnline ? '#16a34a' : '#dc2626',
              },
            ]}
          >
            {isOnline ? '● Online' : '● Offline'}
          </Text>

          <Switch
            value={isOnline}
            onValueChange={setIsOnline}
          />
        </View>
      </View>

      {/* NAVIGATION TABS */}
      <View style={styles.tabNav}>

        <Pressable
          style={[
            styles.subTab,
            activeTab === 'queue' && styles.activeSubTab,
          ]}
          onPress={() => {
            setActiveTab('queue');
            setSelectedCase(null);
          }}
        >
          <Text
            style={[
              styles.subTabText,
              activeTab === 'queue' &&
                styles.activeSubTabText,
            ]}
          >
            Queue & Review
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.subTab,
            activeTab === 'followups' &&
              styles.activeSubTab,
          ]}
          onPress={() => {
            setActiveTab('followups');
            setSelectedCase(null);
          }}
        >
          <Text
            style={[
              styles.subTabText,
              activeTab === 'followups' &&
                styles.activeSubTabText,
            ]}
          >
            High-Risk Follow-ups
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.subTab,
            activeTab === 'history' &&
              styles.activeSubTab,
          ]}
          onPress={() => {
            setActiveTab('history');
            setSelectedCase(null);
          }}
        >
          <Text
            style={[
              styles.subTabText,
              activeTab === 'history' &&
                styles.activeSubTabText,
            ]}
          >
            Referrals & Past Cases
          </Text>
        </Pressable>

      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* QUEUE */}
        {activeTab === 'queue' && !selectedCase && (
          <View>

            <Text style={styles.sectionHeader}>
              Patients Waiting ({queueCases.length}) - Triage Notes Loaded
            </Text>

            {queueCases.map((item) => (
              <View
                key={item.id}
                style={styles.card}
              >

                <View style={styles.rowBetween}>

                  <Text style={styles.cardTitle}>
                    {item.patientName}, {item.age}y ({item.gender})
                  </Text>

                  <View
                    style={[
                      styles.badge,
                      item.risk === 'High'
                        ? styles.badgeHigh
                        : styles.badgeMod,
                    ]}
                  >
                    <Text style={styles.badgeText}>
                      {item.risk} Risk
                    </Text>
                  </View>

                </View>

                <Text style={styles.metaText}>
                  ASHA Reporter: {item.ashaWorker}
                </Text>

                <View style={styles.infoBox}>

                  <Text style={styles.labelText}>
                    Symptoms & Vitals (ASHA Verified):
                  </Text>

                  <Text style={styles.valueText}>
                    {item.symptoms}
                  </Text>

                  <Text style={styles.vitalsText}>
                    {item.vitals}
                  </Text>

                  <Text style={styles.labelText}>
                    ASHA Triage Notes:
                  </Text>

                  <Text style={styles.notesText}>
                    "{item.ashaNotes}"
                  </Text>

                </View>

                <Pressable
                  style={styles.primaryButton}
                  onPress={() => setSelectedCase(item)}
                >
                  <Text style={styles.primaryButtonText}>
                    Review History & Consult
                  </Text>
                </Pressable>

              </View>
            ))}

          </View>
        )}

        {/* ACTIVE CONSULTATION */}
        {activeTab === 'queue' && selectedCase && (
          <View style={styles.card}>

            <Pressable
              onPress={() => setSelectedCase(null)}
              style={styles.backLink}
            >
              <Text style={styles.backLinkText}>
                ← Back to Queue
              </Text>
            </Pressable>

            <Text style={styles.sectionTitle}>
              Consultation: {selectedCase.patientName}
            </Text>

            {/* PATIENT HISTORY */}
            <View style={styles.infoBox}>

              <Text style={styles.labelText}>
                Pre-Call Medical History:
              </Text>

              <Text style={styles.valueText}>
                {selectedCase.history}
              </Text>

              <Text style={styles.labelText}>
                Current Vitals:
              </Text>

              <Text style={styles.vitalsText}>
                {selectedCase.vitals}
              </Text>

            </View>

            {/* COMMUNICATION */}
            <Text style={styles.sectionSubHeader}>
              Communication Channel
            </Text>

            <View style={styles.commRow}>

              <Pressable
                style={[
                  styles.commButton,
                  { backgroundColor: '#0284c7' },
                ]}
                onPress={() => handleStartCall('Video')}
              >
                <Text style={styles.commButtonText}>
                  Video Call
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.commButton,
                  { backgroundColor: '#0d9488' },
                ]}
                onPress={() => handleStartCall('Audio')}
              >
                <Text style={styles.commButtonText}>
                  Audio Call
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.commButton,
                  { backgroundColor: '#475569' },
                ]}
                onPress={() =>
                  handleStartCall('Text Fallback')
                }
              >
                <Text style={styles.commButtonText}>
                  Text Chat
                </Text>
              </Pressable>

            </View>

            {/* PRESCRIPTION */}
            <Text style={styles.sectionSubHeader}>
              Structured Prescription Form
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Drug Name (e.g. Amoxicillin)"
              value={drugName}
              onChangeText={setDrugName}
            />

            <TextInput
              style={styles.input}
              placeholder="Dosage (e.g. 500mg)"
              value={dosage}
              onChangeText={setDosage}
            />

            <TextInput
              style={styles.input}
              placeholder="Duration / Frequency (e.g. 5 days, Twice daily)"
              value={duration}
              onChangeText={setDuration}
            />

            <TextInput
              style={styles.input}
              placeholder="Special Instructions"
              value={instructions}
              onChangeText={setInstructions}
            />

            <Pressable
              style={[
                styles.primaryButton,
                { backgroundColor: '#16a34a' },
              ]}
              onPress={handleIssuePrescription}
            >
              <Text style={styles.primaryButtonText}>
                Issue Structured Prescription
              </Text>
            </Pressable>

            {/* REFERRAL */}
            <Text style={styles.sectionSubHeader}>
              Upward Referral Mechanism
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Referral Facility (e.g. Community Health Center)"
              value={referralFacility}
              onChangeText={setReferralFacility}
            />

            <TextInput
              style={styles.input}
              placeholder="Reason for Escalation"
              value={referralReason}
              onChangeText={setReferralReason}
            />

            <Pressable
              style={[
                styles.primaryButton,
                { backgroundColor: '#b91c1c' },
              ]}
              onPress={handleCreateReferral}
            >
              <Text style={styles.primaryButtonText}>
                Submit Tracked Upward Referral
              </Text>
            </Pressable>

          </View>
        )}

        {/* HIGH-RISK FOLLOW-UPS */}
        {activeTab === 'followups' && (
          <View>

            <Text style={styles.sectionHeader}>
              High-Risk Patient Follow-up Tracker
            </Text>

            {followUps.map((fu) => (
              <View
                key={fu.id}
                style={styles.card}
              >

                <Text style={styles.cardTitle}>
                  {fu.patientName}
                </Text>

                <Text style={styles.metaText}>
                  Risk Tier:{' '}
                  <Text
                    style={{
                      color: '#dc2626',
                      fontWeight: 'bold',
                    }}
                  >
                    {fu.risk}
                  </Text>
                </Text>

                <Text style={styles.metaText}>
                  Scheduled Follow-up: {fu.dueDate}
                </Text>

                <View
                  style={[
                    styles.statusFlag,
                    {
                      backgroundColor: fu.ashaCompleted
                        ? '#f0fdf4'
                        : '#fef2f2',
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: fu.ashaCompleted
                        ? '#16a34a'
                        : '#dc2626',
                      fontWeight: 'bold',
                    }}
                  >
                    {fu.ashaCompleted
                      ? '✓ ASHA Completed Visit'
                      : '⚠ Pending ASHA Verification'}
                  </Text>
                </View>

              </View>
            ))}

          </View>
        )}

        {/* REFERRALS & PAST CASES */}
        {activeTab === 'history' && (
          <View>

            <Text style={styles.sectionHeader}>
              Active Tracked Referrals
            </Text>

            {referrals.map((ref) => (
              <View
                key={ref.id}
                style={styles.card}
              >

                <Text style={styles.cardTitle}>
                  {ref.patientName}
                </Text>

                <Text style={styles.metaText}>
                  Target: {ref.facility}
                </Text>

                <Text style={styles.metaText}>
                  Reason: {ref.reason}
                </Text>

                <Text
                  style={[
                    styles.metaText,
                    {
                      color: '#0284c7',
                      fontWeight: 'bold',
                      marginTop: 4,
                    },
                  ]}
                >
                  Status: {ref.status}
                </Text>

              </View>
            ))}

            <Text
              style={[
                styles.sectionHeader,
                { marginTop: 20 },
              ]}
            >
              Reviewable Past Cases Archive
            </Text>

            <View style={styles.card}>

              <Text style={styles.cardTitle}>
                Anand Kumar, 54y
              </Text>

              <Text style={styles.metaText}>
                Completed Consultation Log • Date: Yesterday
              </Text>

              <Text style={styles.notesText}>
                Diagnosis: Mild Acute Gastroenteritis.
                Prescribed ORS & Zinc. Follow-up resolved.
              </Text>

            </View>

          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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

  statusBox: {
    alignItems: 'flex-end',
  },

  statusText: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },

  tabNav: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    padding: 4,
  },

  subTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },

  activeSubTab: {
    backgroundColor: '#ffffff',
    borderRadius: 6,
  },

  subTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
  },

  activeSubTabText: {
    color: '#0284c7',
  },

  scrollContent: {
    padding: 16,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },

  sectionHeader: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 10,
  },

  sectionSubHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 14,
    marginBottom: 8,
  },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0f172a',
    flex: 1,
    marginRight: 8,
  },

  metaText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },

  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },

  badgeHigh: {
    backgroundColor: '#fee2e2',
  },

  badgeMod: {
    backgroundColor: '#fef3c7',
  },

  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#b91c1c',
  },

  infoBox: {
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 6,
    marginVertical: 8,
  },

  labelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 4,
  },

  valueText: {
    fontSize: 13,
    color: '#0f172a',
  },

  vitalsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0284c7',
  },

  notesText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#334155',
  },

  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0f172a',
    marginBottom: 8,
  },

  primaryButton: {
    backgroundColor: '#0284c7',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },

  primaryButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },

  commRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  commButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginHorizontal: 2,
  },

  commButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },

  backLink: {
    marginBottom: 8,
  },

  backLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0284c7',
  },

  statusFlag: {
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    alignItems: 'center',
  },
});
