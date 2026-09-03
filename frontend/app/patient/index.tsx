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
export default function PatientAuthScreen() {
  const router = useRouter();

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
        'Missing Information',
        'Please fill in all required fields.'
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
      'Registration Failed',
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
      'Missing Information',
      'Please enter your phone number and password.'
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
      'Login Failed',
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

        {/* BACK TO HOME */}
        <Pressable
          onPress={() => router.replace('/' as any)}
          style={styles.backLink}
        >
          <Text style={styles.backText}>
            ← Back to Home
          </Text>
        </Pressable>

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

            <Text style={styles.title}>
              Patient Login
            </Text>

            <Text style={styles.subtitle}>
              Access your health records and visits
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Phone Number"
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
                Log In
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
            <Text style={styles.title}>
              Patient Registration
            </Text>

            <Text style={styles.subtitle}>
              Create your ArogyaConnect account
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Full Name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />

            <TextInput
              style={styles.input}
              placeholder="Phone Number"
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
                Continue & Send OTP
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
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',

    // Works on mobile
    elevation: 2,

    // Works on web and is ignored safely where unsupported
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },

  backLink: {
    marginBottom: 16,
  },

  backText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },

  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },

  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 20,
  },

  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 12,
  },

  otpInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 22,
    color: '#0f172a',
    marginBottom: 12,
    letterSpacing: 8,
  },

  primaryButton: {
    backgroundColor: '#0284c7',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },

  verifyButton: {
    backgroundColor: '#16a34a',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },

  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },

  switchRow: {
    marginTop: 16,
    alignItems: 'center',
  },

  switchText: {
    fontSize: 13,
    color: '#64748b',
  },

  linkText: {
    color: '#0284c7',
    fontWeight: 'bold',
  },

  successMessage: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },

  successTitle: {
    color: '#166534',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },

  successText: {
    color: '#166534',
    fontSize: 13,
    lineHeight: 18,
  },
});
