import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLanguage } from '../lib/i18n';

export default function DoctorAuthScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  // Login comes first
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  const [fullName, setFullName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [councilRegNo, setCouncilRegNo] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [email, setEmail] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const [hasClinic, setHasClinic] = useState(false);
  const [clinicDetails, setClinicDetails] = useState('');

  const [isVolunteer, setIsVolunteer] = useState(false);
  const [volunteerRadius, setVolunteerRadius] = useState('');

  const [hasLegalHistory, setHasLegalHistory] = useState(false);
  const [legalExplanation, setLegalExplanation] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets?.length > 0) {
        setSelectedFile(result.assets[0].name);
      }
    } catch (error) {
      console.log('Document picker error:', error);
      Alert.alert('Error', 'Could not select the document.');
    }
  };

  const handleLogin = async () => {
    if (!councilRegNo || !mobileNo) {
      Alert.alert(
        'Missing Details',
        'Please enter your registration number and mobile number.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      setTimeout(() => {
        setIsSubmitting(false);
        router.replace('/doctor/dashboard' as any);
      }, 1000);
    } catch (error) {
      console.log('Doctor login error:', error);
      setIsSubmitting(false);
      Alert.alert('Login Failed', 'Could not complete login.');
    }
  };

  const handleRegister = async () => {
    if (
      !fullName ||
      !specialty ||
      !councilRegNo ||
      !mobileNo ||
      !email
    ) {
      Alert.alert(
        'Missing Details',
        'Please fill in all required professional details.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      setTimeout(() => {
        setIsSubmitting(false);

        Alert.alert(
          'Registration Submitted',
          'Your registration has been submitted for verification.'
        );

        setActiveTab('login');
      }, 1000);
    } catch (error) {
      console.log('Doctor registration error:', error);
      setIsSubmitting(false);
      Alert.alert(
        'Registration Failed',
        'Could not complete registration.'
      );
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.card}>

        {/* LOGIN */}
        {activeTab === 'login' && (
          <View>
            <Text style={styles.badge}>
              Government Tele-Health Field Portal
            </Text>

            <Text style={styles.title}>
              Doctor Login
            </Text>

            <Text style={styles.subtitle}>
              Sign in to access your doctor dashboard
            </Text>

            <Text style={styles.label}>
              Medical Council Registration No.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Enter registration number"
              value={councilRegNo}
              onChangeText={setCouncilRegNo}
              autoCapitalize="characters"
              editable={!isSubmitting}
            />

            <Text style={styles.label}>
              Registered Mobile Number
            </Text>

            <TextInput
              style={styles.input}
              placeholder="10-digit mobile number"
              keyboardType="phone-pad"
              value={mobileNo}
              onChangeText={setMobileNo}
              editable={!isSubmitting}
            />

            <Text style={styles.label}>
              Password / OTP
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Enter password or OTP"
              secureTextEntry
              editable={!isSubmitting}
            />

            <Pressable
              style={[
                styles.primaryButton,
                isSubmitting && styles.disabledButton,
              ]}
              onPress={handleLogin}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {t('login')}
                </Text>
              )}
            </Pressable>

            {!isSubmitting && (
              <Pressable
                style={styles.switchButton}
                onPress={() => setActiveTab('register')}
              >
                <Text style={styles.switchButtonText}>
                  New doctor? Register here
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {/* REGISTER */}
        {activeTab === 'register' && (
          <View>
            <Text style={styles.badge}>
              Government Tele-Health Field Portal
            </Text>

            <Text style={styles.title}>
              Doctor Registration
            </Text>

            <Text style={styles.subtitle}>
              Register as a verified medical professional
            </Text>

            <Text style={styles.sectionNumber}>
              1. Professional Identity
            </Text>

            <Text style={styles.label}>
              Full Name (with Title)
            </Text>

            <TextInput
              style={styles.input}
              placeholder="e.g., Dr. Ananya Sharma"
              value={fullName}
              onChangeText={setFullName}
              editable={!isSubmitting}
            />

            <Text style={styles.label}>
              Primary Qualification & Specialty
            </Text>

            <TextInput
              style={styles.input}
              placeholder="e.g., MBBS, General Medicine"
              value={specialty}
              onChangeText={setSpecialty}
              editable={!isSubmitting}
            />

            <Text style={styles.label}>
              State Council Registration Number
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Enter council registration number"
              value={councilRegNo}
              onChangeText={setCouncilRegNo}
              autoCapitalize="characters"
              editable={!isSubmitting}
            />

            <Text style={styles.label}>
              Mobile Number
            </Text>

            <TextInput
              style={styles.input}
              placeholder="10-digit mobile number"
              keyboardType="phone-pad"
              value={mobileNo}
              onChangeText={setMobileNo}
              editable={!isSubmitting}
            />

            <Text style={styles.label}>
              Email
            </Text>

            <TextInput
              style={styles.input}
              placeholder="doctor@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              editable={!isSubmitting}
            />

            <Text style={styles.label}>
              Upload Medical Registration / Degree Certificate
            </Text>

            <Pressable
              style={styles.uploadButton}
              onPress={handlePickDocument}
              disabled={isSubmitting}
            >
              <Text style={styles.uploadIcon}>
                ↑
              </Text>

              <View style={styles.uploadTextContainer}>
                <Text style={styles.uploadTitle}>
                  {selectedFile
                    ? selectedFile
                    : 'Choose PDF, JPG or PNG'}
                </Text>

                <Text style={styles.uploadSubtitle}>
                  Optional for quick test
                </Text>
              </View>
            </Pressable>

            <Text style={styles.sectionNumber}>
              2. Clinical Practice & Availability
            </Text>

            <View style={styles.switchRow}>
              <View style={styles.switchTextContainer}>
                <Text style={styles.switchLabel}>
                  I have a private clinic
                </Text>

                <Text style={styles.switchDescription}>
                  Provide clinic details for patient access
                </Text>
              </View>

              <Switch
                value={hasClinic}
                onValueChange={setHasClinic}
                trackColor={{
                  false: '#cbd5e1',
                  true: '#80cbc4',
                }}
                thumbColor={
                  hasClinic ? '#0d9488' : '#f4f4f5'
                }
              />
            </View>

            {hasClinic && (
              <TextInput
                style={[
                  styles.input,
                  styles.multilineInput,
                ]}
                placeholder="Enter clinic name, address and timings"
                value={clinicDetails}
                onChangeText={setClinicDetails}
                multiline
                numberOfLines={3}
                editable={!isSubmitting}
              />
            )}

            <View style={styles.switchRow}>
              <View style={styles.switchTextContainer}>
                <Text style={styles.switchLabel}>
                  Available for rural field volunteering
                </Text>

                <Text style={styles.switchDescription}>
                  Help patients in underserved areas
                </Text>
              </View>

              <Switch
                value={isVolunteer}
                onValueChange={setIsVolunteer}
                trackColor={{
                  false: '#cbd5e1',
                  true: '#80cbc4',
                }}
                thumbColor={
                  isVolunteer ? '#0d9488' : '#f4f4f5'
                }
              />
            </View>

            {isVolunteer && (
              <TextInput
                style={styles.input}
                placeholder="Maximum travel distance, e.g. 20 km"
                value={volunteerRadius}
                onChangeText={setVolunteerRadius}
                editable={!isSubmitting}
              />
            )}

            <Text style={styles.sectionNumber}>
              3. Conduct & Legal Declarations
            </Text>

            <View style={styles.switchRow}>
              <View style={styles.switchTextContainer}>
                <Text style={styles.switchLabel}>
                  Previous license suspension or legal history
                </Text>

                <Text style={styles.switchDescription}>
                  Declare any relevant professional history
                </Text>
              </View>

              <Switch
                value={hasLegalHistory}
                onValueChange={setHasLegalHistory}
                trackColor={{
                  false: '#cbd5e1',
                  true: '#80cbc4',
                }}
                thumbColor={
                  hasLegalHistory
                    ? '#0d9488'
                    : '#f4f4f5'
                }
              />
            </View>

            {hasLegalHistory && (
              <TextInput
                style={[
                  styles.input,
                  styles.multilineInput,
                ]}
                placeholder="Please provide an explanation"
                value={legalExplanation}
                onChangeText={setLegalExplanation}
                multiline
                numberOfLines={3}
                editable={!isSubmitting}
              />
            )}

            <Pressable
              style={[
                styles.primaryButton,
                isSubmitting && styles.disabledButton,
              ]}
              onPress={handleRegister}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  Submit Registration
                </Text>
              )}
            </Pressable>

            {!isSubmitting && (
              <Pressable
                style={styles.switchButton}
                onPress={() => setActiveTab('login')}
              >
                <Text style={styles.switchButtonText}>
                  Already registered? Sign in here
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  /* EXACT ASHA PAGE SIZING */
  container: {
    flexGrow: 1,
    minHeight: '100%',
    backgroundColor: '#f3f7fa',
    justifyContent: 'center',
    padding: 24,
  },

  card: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    borderWidth: 1,
    borderColor: '#d9e3ea',

    shadowColor: '#123b5d',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 4,
  },

  /* SAME ASHA FONT */
  badge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7002de',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 8,
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#143b61',
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 14,
    color: '#698096',
    lineHeight: 21,
    marginBottom: 26,
  },

  sectionNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: '#183d60',
    marginBottom: 7,
    marginTop: 4,
  },

  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#183d60',
    marginBottom: 7,
    marginTop: 4,
  },

  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd9e3',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: '#122f4d',
    marginBottom: 17,
  },

  multilineInput: {
    minHeight: 90,
    textAlignVertical: 'top',
  },

  primaryButton: {
    backgroundColor: '#7002de',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    minHeight: 50,
  },

  disabledButton: {
    backgroundColor: '#94a3b8',
  },

  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },

  switchButton: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 5,
  },

  switchButtonText: {
    color: '#087bb5',
    fontSize: 14,
    fontWeight: '700',
  },

  uploadButton: {
    minHeight: 60,
    borderWidth: 1,
    borderColor: '#cbd9e3',
    borderStyle: 'dashed',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 17,
  },

  uploadIcon: {
    fontSize: 22,
    color: '#0d9488',
    marginRight: 12,
  },

  uploadTextContainer: {
    flex: 1,
  },

  uploadTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#183d60',
  },

  uploadSubtitle: {
    fontSize: 13,
    color: '#698096',
    marginTop: 3,
  },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#cbd9e3',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 17,
  },

  switchTextContainer: {
    flex: 1,
    paddingRight: 12,
  },

  switchLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#183d60',
  },

  switchDescription: {
    fontSize: 12,
    color: '#698096',
    marginTop: 3,
    lineHeight: 17,
  },
});