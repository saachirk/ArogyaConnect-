import * as DocumentPicker from 'expo-document-picker';
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

export default function DoctorAuthScreen() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>(
    'register'
  );

  // Form State
  const [fullName, setFullName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [councilRegNo, setCouncilRegNo] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [email, setEmail] = useState('');

  // Document Picker State
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    uri: string;
  } | null>(null);

  // Clinic Details
  const [hasClinic, setHasClinic] = useState(false);
  const [clinicDetails, setClinicDetails] = useState('');

  // Volunteering Details
  const [isVolunteer, setIsVolunteer] = useState(false);
  const [volunteerRadius, setVolunteerRadius] = useState('10 km');

  // Legal / Ethical Self-Declaration
  const [hasLegalHistory, setHasLegalHistory] = useState(false);
  const [legalExplanation, setLegalExplanation] = useState('');

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png'],
        copyToCacheDirectory: true,
      });

      if (
        !result.canceled &&
        result.assets &&
        result.assets.length > 0
      ) {
        const file = result.assets[0];

        setSelectedFile({
          name: file.name,
          uri: file.uri,
        });
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'Could not open document picker.'
      );
    }
  };

  const handleRegister = () => {
    // Prevent multiple clicks
    if (isSubmitting) {
      return;
    }

    // Show submitted state
    setIsSubmitting(true);

    // Wait 2 seconds, then return to the main app screen
    setTimeout(() => {
      router.replace('/');
    }, 5000);
  };

  const handleLogin = () => {
    router.replace('/doctor/dashboard' as any);
    
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Doctor Portal</Text>

        <Text style={styles.subtitle}>
          Verified Clinical & Tele-triage Access
        </Text>

        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <Pressable
            style={[
              styles.tab,
              activeTab === 'login' && styles.activeTab,
            ]}
            onPress={() => setActiveTab('login')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'login' && styles.activeTabText,
              ]}
            >
              Log In
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.tab,
              activeTab === 'register' && styles.activeTab,
            ]}
            onPress={() => setActiveTab('register')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'register' && styles.activeTabText,
              ]}
            >
              Register
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.formScroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {activeTab === 'login' ? (
          /* LOGIN FORM */
          <View style={styles.section}>
            <Text style={styles.label}>
              Medical Council Registration No. / Mobile
            </Text>

            <TextInput
              style={styles.input}
              placeholder="e.g. 123"
              defaultValue="123"
            />

            <Text style={styles.label}>
              Password / OTP
            </Text>

            <TextInput
              style={styles.input}
              placeholder="••••••••"
              secureTextEntry
              defaultValue="123"
            />

            <Pressable
              style={styles.primaryButton}
              onPress={handleLogin}
            >
              <Text style={styles.primaryButtonText}>
                Log In to Portal
              </Text>
            </Pressable>
          </View>
        ) : (
          /* REGISTRATION FORM */
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>
              1. Professional Identity
            </Text>

            <Text style={styles.label}>
              Full Name (with Title)
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Dr. A"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />

            <Text style={styles.label}>
              Primary Qualification & Specialty
            </Text>

            <TextInput
              style={styles.input}
              placeholder="MBBS"
              value={specialty}
              onChangeText={setSpecialty}
            />

            <Text style={styles.label}>
              State Council Registration Number
            </Text>

            <TextInput
              style={styles.input}
              placeholder="123"
              value={councilRegNo}
              onChangeText={setCouncilRegNo}
              autoCapitalize="characters"
            />

            <Text style={styles.label}>
              Mobile Number (for SMS Verification Alerts)
            </Text>

            <TextInput
              style={styles.input}
              placeholder="9876543210"
              keyboardType="phone-pad"
              value={mobileNo}
              onChangeText={setMobileNo}
            />

            <Text style={styles.label}>
              Email Address
            </Text>

            <TextInput
              style={styles.input}
              placeholder="test@test.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={styles.label}>
              Upload Medical Registration / Degree Certificate
              (Optional for quick test)
            </Text>

            <Pressable
              style={[
                styles.uploadBox,
                selectedFile
                  ? styles.uploadBoxSuccess
                  : null,
              ]}
              onPress={handlePickDocument}
            >
              <Text style={styles.uploadText}>
                {selectedFile
                  ? `✓ Attached: ${selectedFile.name}`
                  : '📄 Tap to Select Certificate (or skip)'}
              </Text>
            </Pressable>

            <Text style={styles.sectionHeader}>
              2. Clinical Practice & Availability
            </Text>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>
                Do you operate a private clinic?
              </Text>

              <Switch
                value={hasClinic}
                onValueChange={setHasClinic}
              />
            </View>

            {hasClinic && (
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Clinic details"
                multiline
                numberOfLines={3}
                value={clinicDetails}
                onChangeText={setClinicDetails}
              />
            )}

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>
                Available for Rural Field Volunteering?
              </Text>

              <Switch
                value={isVolunteer}
                onValueChange={setIsVolunteer}
              />
            </View>

            {isVolunteer && (
              <View>
                <Text style={styles.label}>
                  Max Travel Distance
                </Text>

                <TextInput
                  style={styles.input}
                  value={volunteerRadius}
                  onChangeText={setVolunteerRadius}
                />
              </View>
            )}

            <Text style={styles.sectionHeader}>
              3. Conduct & Legal Declarations
            </Text>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>
                Any prior license suspensions?
              </Text>

              <Switch
                value={hasLegalHistory}
                onValueChange={setHasLegalHistory}
              />
            </View>

            {hasLegalHistory && (
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Provide details"
                multiline
                numberOfLines={3}
                value={legalExplanation}
                onChangeText={setLegalExplanation}
              />
            )}

            {/* SUBMIT BUTTON */}
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
                isSubmitting && styles.disabledButton,
              ]}
              onPress={handleRegister}
              disabled={isSubmitting}
            >
              <Text style={styles.primaryButtonText}>
                {isSubmitting
                  ? 'Application Submitted...'
                  : 'Submit Registration for Verification'}
              </Text>
            </Pressable>

            {/* SUBMISSION MESSAGE */}
            {isSubmitting && (
              <View style={styles.submissionMessage}>
                <Text style={styles.submissionTitle}>
                  Application Submitted
                </Text>

                <Text style={styles.submissionText}>
                  Your registration has been submitted for verification.
                  Please wait for SMS and email confirmation.
                </Text>
              </View>
            )}
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
  },

  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
  },

  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 16,
  },

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 4,
  },

  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },

  activeTab: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },

  activeTabText: {
    color: '#0284c7',
  },

  formScroll: {
    padding: 20,
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
  },

  section: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  sectionHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 6,
  },

  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
    marginTop: 8,
  },

  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0f172a',
    width: '100%',
  },

  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },

  uploadBox: {
    borderWidth: 1.5,
    borderColor: '#0284c7',
    borderStyle: 'dashed',
    backgroundColor: '#f0f9ff',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 6,
  },

  uploadBoxSuccess: {
    borderColor: '#16a34a',
    backgroundColor: '#f0fdf4',
    borderStyle: 'solid',
  },

  uploadText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0369a1',
    textAlign: 'center',
  },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 10,
  },

  switchLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
    paddingRight: 10,
  },

  primaryButton: {
    backgroundColor: '#0284c7',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    minHeight: 50,
  },

  buttonPressed: {
    opacity: 0.7,
  },

  disabledButton: {
    opacity: 0.6,
  },

  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  submissionMessage: {
    marginTop: 14,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    alignItems: 'center',
  },

  submissionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0369a1',
    marginBottom: 5,
  },

  submissionText: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 19,
  },
});