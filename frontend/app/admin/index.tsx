
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
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
export default function AshaAuthScreen() {
  
  const router = useRouter();
  const { t } = useLanguage();
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Form states
  const [fullName, setFullName] = useState('');
  const [governmentId, setGovernmentId] = useState('');
  const [phone, setPhone] = useState('');
  const [subCenter, setSubCenter] = useState('');

const handleAuthAction = async () => {
  if (!governmentId || !phone || (isRegistering && (!fullName || !subCenter))) {
    Alert.alert(
      'Missing Details',
      'Please fill in all required fields to proceed.'
    );
    return;
  }

  if (isRegistering) {
    setIsLoading(true);
    setSuccessMessage('');

    try {
      const { data, error } = await supabase
        .from('asha_workers')
        .insert({
          full_name: fullName,
          government_id: governmentId,
          phone: phone,
          assigned_subcenter: subCenter,
        })
        .select()
        .single();

      if (error) {
        console.log('ASHA registration error:', error);

        Alert.alert(
          'Registration Failed',
          error.message
        );

        setIsLoading(false);
        return;
      }

      console.log('ASHA worker registered:', data);

      setIsLoading(false);
      setSuccessMessage('');
      setIsRegistering(false);

      setGovernmentId('');
      setPhone('');
      setFullName('');
      setSubCenter('');

      Alert.alert(
        'Registration Successful',
        'Your registration has been submitted for government verification. You can now sign in.'
      );

    } catch (error) {
      console.log('ASHA registration error:', error);

      setIsLoading(false);

      Alert.alert(
        'Registration Failed',
        'Could not complete registration.'
      );
    }

  } else {
    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('asha_workers')
        .select('*')
        .eq('government_id', governmentId)
        .eq('phone', phone)
        .single();

      if (error || !data) {
        console.log('ASHA login error:', error);

        Alert.alert(
          'Login Failed',
          'Government ID or phone number is incorrect.'
        );

        setIsLoading(false);
        return;
      }

      console.log('ASHA worker logged in:', data);

      setIsLoading(false);

      router.replace(`/admin/dashboard?ashaId=${data.id}` as any);

    } catch (error) {
      console.log('ASHA login error:', error);

      setIsLoading(false);

      Alert.alert(
        'Login Failed',
        'Could not complete login.'
      );
    }
  }
};

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        {/* Header */}
        <Text style={styles.badge}>Government Tele-Health Field Portal</Text>
        <Text style={styles.title}>ASHA Worker Gateway</Text>
        <Text style={styles.subtitle}>
          {isRegistering
            ? 'Register with your official State Health ID'
            : 'Sign in to manage village sub-center queues and triage'}
        </Text>

        {/* Success / Status Banner during 3-second wait */}
        {successMessage ? (
          <View style={styles.banner}>
            <ActivityIndicator size="small" color="#0d9488" style={{ marginRight: 8 }} />
            <Text style={styles.bannerText}>{successMessage}</Text>
          </View>
        ) : null}

        {isRegistering && (
          <>
            <Text style={styles.label}>Full Legal Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Sunita Devi"
              value={fullName}
              onChangeText={setFullName}
              editable={!isLoading}
            />
          </>
        )}

        <Text style={styles.label}>Official Government ASHA / Health ID</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., AS-KA-2026-8891"
          value={governmentId}
          onChangeText={setGovernmentId}
          autoCapitalize="characters"
          editable={!isLoading}
        />

        <Text style={styles.label}>Registered Mobile Number</Text>
        <TextInput
          style={styles.input}
          placeholder="10-digit mobile number"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          editable={!isLoading}
        />

        {isRegistering && (
          <>
            <Text style={styles.label}>Assigned Village Sub-Center</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Sub-Center Ward 3, Bangalore Rural"
              value={subCenter}
              onChangeText={setSubCenter}
              editable={!isLoading}
            />
          </>
        )}

        {/* Action Button */}
        <Pressable
          style={[styles.primaryButton, isLoading && { backgroundColor: '#94a3b8' }]}
          onPress={handleAuthAction}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.primaryButtonText}>
                {isRegistering ? t('submit') : t('login')}
            </Text>
          )}
        </Pressable>

        {/* Toggle between Login and Registration */}
        {!isLoading && (
          <Pressable
            style={styles.switchButton}
            onPress={() => setIsRegistering(!isRegistering)}
          >
            <Text style={styles.switchButtonText}>
              {isRegistering
                ? 'Already registered? Sign in here'
                : 'New ASHA worker? Register with Gov ID'}
            </Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#f8fafc', justifyContent: 'center', padding: 16 },
  card: { backgroundColor: '#ffffff', borderRadius: 12, padding: 24, maxWidth: 450, width: '100%', alignSelf: 'center', borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  badge: { fontSize: 11, fontWeight: 'bold', color: '#0d9488', textTransform: 'uppercase', marginBottom: 4 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#64748b', marginBottom: 20 },
  banner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdfa', borderWidth: 1, borderColor: '#ccfbf1', padding: 12, borderRadius: 8, marginBottom: 16 },
  bannerText: { fontSize: 12, color: '#0f766e', fontWeight: '600', flex: 1 },
  label: { fontSize: 12, fontWeight: '600', color: '#334155', marginBottom: 6 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: '#0f172a', marginBottom: 14 },
  primaryButton: { backgroundColor: '#0d9488', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 6 },
  primaryButtonText: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },
  switchButton: { marginTop: 16, alignItems: 'center' },
  switchButtonText: { color: '#0284c7', fontSize: 13, fontWeight: '600' },
});
