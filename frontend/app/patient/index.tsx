import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/i18n';
export default function PatientAuthScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  // Controls which part of the authentication process is shown
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'otp'>(
    'login'
  );

  // Registration fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');

  // Login fields
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Shows the registration-success message on the login screen
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  // -----------------------------
  // REGISTER
  // -----------------------------
  const handleRegisterSubmit = () => {
    if (!name || !phone || !password) {
      Alert.alert(
        t('missingDetails'),
        t('requiredFields')
      );
      return;
    }

    // Move from Registration → OTP
    setAuthMode('otp');
  };

  // -----------------------------
  // VERIFY OTP
  // -----------------------------
const handleVerifyOtp = async () => {
  if (otpCode.length !== 4) {
    Alert.alert(
      'Invalid OTP',
      'Please enter any 4-digit OTP.'
    );
    return;
  }

  const { data, error } = await supabase
    .from('patients')
    .insert({
      name: name,
      phone: phone,
      email: email || null,
      password: password,
    })
    .select()
    .single();

  if (error) {
    console.log('Supabase registration error:', error);

    Alert.alert(
      t('error'),
      error.message
    );

    return;
  }

  console.log('Patient added to Supabase:', data);

  setLoginPhone(phone);
  setOtpCode('');
  setRegistrationSuccess(true);
  setAuthMode('login');
};

  // -----------------------------
  // LOGIN
  // -----------------------------
const handleLoginSubmit = async () => {
  console.log('LOGIN BUTTON PRESSED');
  if (!loginPhone || !loginPassword) {
    Alert.alert(
      t('missingDetails'),
      `${t('phone')} and password are required.`
    );
    return;
  }

  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('phone', loginPhone)
    .eq('password', loginPassword)
    .single();

  if (error || !data) {
    console.log('Supabase error:', error);

    Alert.alert(
      t('error'),
      'Phone number or password is incorrect.'
    );
    return;
  }

  console.log('Logged in patient:', data);

  router.replace(`/patient/dashboard?patientId=${data.id}` as any);
};

  // -----------------------------
  // MAIN UI
  // -----------------------------
  return (
    <View style={styles.container}>
      <View style={styles.card}>

        {/* ========================= */}
        {/* LOGIN */}
        {/* ========================= */}
        {authMode === 'login' && (
          <View>
            {/* Registration success message */}
            {registrationSuccess && (
              <View style={styles.successMessage}>
                <Text style={styles.successTitle}>
                  Registration Successful
                </Text>

                <Text style={styles.successText}>
                  Your account has been registered successfully.
                  You can now log in normally.
                </Text>
              </View>
            )}

            <Text style={styles.badge}>
              Government Tele-Health Field Portal
            </Text>

            <Text style={styles.title}>
              {t('patient')} {t('login')}
            </Text>

            <Text style={styles.subtitle}>
              Access your health records and visits
            </Text>

            <TextInput
              style={styles.input}
              placeholder={t('phone')}
              keyboardType="phone-pad"
              value={loginPhone}
              onChangeText={setLoginPhone}
              autoCapitalize="none"
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
              secureTextEntry
              value={loginPassword}
              onChangeText={setLoginPassword}
            />

            <Pressable
              style={styles.primaryButton}
              onPress={handleLoginSubmit}
            >
              <Text style={styles.primaryButtonText}>
                {t('login')}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setRegistrationSuccess(false);
                setAuthMode('register');
              }}
              style={styles.switchRow}
            >
              <Text style={styles.switchText}>
                New user?{' '}
                <Text style={styles.linkText}>
                  Register here
                </Text>
              </Text>
            </Pressable>
          </View>
        )}

        {/* ========================= */}
        {/* REGISTER */}
        {/* ========================= */}
        {authMode === 'register' && (
          <View>
            <Text style={styles.badge}>
              Government Tele-Health Field Portal
            </Text>

            <Text style={styles.title}>
              {t('patientDetails')}
            </Text>

            <Text style={styles.subtitle}>
              Create your ArogyaConnect account
            </Text>

            <TextInput
              style={styles.input}
              placeholder={t('patientName')}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />

            <TextInput
              style={styles.input}
              placeholder={t('phone')}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              autoCapitalize="none"
            />

            <TextInput
              style={styles.input}
              placeholder="Email Address (Optional)"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
            />

            <TextInput
              style={styles.input}
              placeholder="Set Password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <Pressable
              style={styles.primaryButton}
              onPress={handleRegisterSubmit}
            >
              <Text style={styles.primaryButtonText}>
                {t('submit')}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setAuthMode('login')}
              style={styles.switchRow}
            >
              <Text style={styles.switchText}>
                Already registered?{' '}
                <Text style={styles.linkText}>
                  Log In
                </Text>
              </Text>
            </Pressable>
          </View>
        )}

        {/* ========================= */}
        {/* OTP */}
        {/* ========================= */}
        {authMode === 'otp' && (
          <View>
            <Text style={styles.badge}>
              Government Tele-Health Field Portal
            </Text>

            <Text style={styles.title}>
              Verify Phone Number
            </Text>

            <Text style={styles.subtitle}>
              Enter the 4-digit code sent to {phone}
            </Text>

            <TextInput
              style={styles.otpInput}
              placeholder="••••"
              keyboardType="number-pad"
              maxLength={4}
              value={otpCode}
              onChangeText={setOtpCode}
              textAlign="center"
            />

            <Pressable
              style={styles.verifyButton}
              onPress={handleVerifyOtp}
            >
              <Text style={styles.primaryButtonText}>
                Verify & Complete Registration
              </Text>
            </Pressable>
          </View>
        )}

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f7fa',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  card: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#ffffff',
    padding: 32,
    borderRadius: 16,
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

  backLink: {
    alignSelf: 'flex-start',
    marginBottom: 24,
    paddingVertical: 4,
  },

  backText: {
    fontSize: 14,
    color: '#45657f',
    fontWeight: '600',
  },

  badge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#087bb5',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 8,
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#143b61',
    marginBottom: 7,
  },

  subtitle: {
    fontSize: 14,
    color: '#698096',
    lineHeight: 21,
    marginBottom: 25,
  },

  input: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd9e3',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: '#122f4d',
    marginBottom: 15,
  },

  otpInput: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd9e3',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 15,
    fontSize: 24,
    fontWeight: '700',
    color: '#143b61',
    marginBottom: 15,
    letterSpacing: 10,
  },

  primaryButton: {
    width: '100%',
    backgroundColor: '#0788c5',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 7,
    minHeight: 50,
  },

  verifyButton: {
    width: '100%',
    backgroundColor: '#0d9488',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 7,
    minHeight: 50,
  },

  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },

  switchRow: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 5,
  },

  switchText: {
    fontSize: 14,
    color: '#698096',
  },

  linkText: {
    color: '#087bb5',
    fontWeight: '800',
  },

  successMessage: {
    backgroundColor: '#edf9f7',
    borderWidth: 1,
    borderColor: '#bfe6df',
    borderRadius: 10,
    padding: 14,
    marginBottom: 22,
  },

  successTitle: {
    color: '#08766c',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 5,
  },

  successText: {
    color: '#426477',
    fontSize: 13,
    lineHeight: 19,
  },
});