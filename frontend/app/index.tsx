import NetInfo from '@react-native-community/netinfo';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  const router = useRouter();
  const [selectedLang, setSelectedLang] = useState<'mr' | 'hi' | 'en'>('en');
  const [isOnline, setIsOnline] = useState<boolean>(true);

  // Listen to network status changes in real time
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(Boolean(state.isConnected && state.isInternetReachable));
    });

    return () => unsubscribe();
  }, []);

  return (
    <View style={styles.container}>
      {/* Content wrapper ensures clean rendering on both web desktop & mobile */}
      <View style={styles.contentWrapper}>
        
        {/* Live Offline/Online Status Badge */}
        <View style={styles.statusBadge}>
          <View style={[styles.statusDot, { backgroundColor: isOnline ? '#2e7d32' : '#d32f2f' }]} />
          <Text style={styles.statusText}>
            {isOnline ? 'Online Sync Active' : 'Offline Mode (Local Storage)'}
          </Text>
        </View>

        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.logo}
        />

        <Text style={styles.appName}>ArogyaConnect</Text>

        <Text style={styles.tagline}>
          Healthcare within reach
        </Text>

        <Text style={styles.question}>
          Who are you?
        </Text>

        {/* Navigates to app/patient */}
        <Pressable style={styles.button} onPress={() => router.push('/patient' as any)}>
          <Text style={styles.buttonText}>Patient</Text>
        </Pressable>

        {/* Navigates to app/admin (or app/asha) */}
        <Pressable style={styles.button} onPress={() => router.push('/admin' as any)}>
          <Text style={styles.buttonText}>ASHA / ANM Worker</Text>
        </Pressable>

        {/* Navigates to app/doctor */}
        <Pressable style={styles.button} onPress={() => router.push('/doctor' as any)}>
          <Text style={styles.buttonText}>Doctor</Text>
        </Pressable>

        {/* Language Switcher */}
        <View style={styles.langContainer}>
          <Pressable onPress={() => setSelectedLang('mr')}>
            <Text style={[styles.langText, selectedLang === 'mr' && styles.activeLang]}>मराठी</Text>
          </Pressable>
          <Text style={styles.langDivider}>|</Text>
          <Pressable onPress={() => setSelectedLang('hi')}>
            <Text style={[styles.langText, selectedLang === 'hi' && styles.activeLang]}>हिंदी</Text>
          </Pressable>
          <Text style={styles.langDivider}>|</Text>
          <Pressable onPress={() => setSelectedLang('en')}>
            <Text style={[styles.langText, selectedLang === 'en' && styles.activeLang]}>English</Text>
          </Pressable>
        </View>

        <Text style={styles.security}>
          🔒 Secure & Private
        </Text>

        <Text style={styles.legal}>
          Privacy Policy  ·  Terms
        </Text>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  contentWrapper: {
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },

  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },

  logo: {
    width: 70,
    height: 70,
    marginBottom: 16,
  },

  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0f172a',
  },

  tagline: {
    fontSize: 16,
    marginTop: 6,
    marginBottom: 40,
    color: '#64748b',
  },

  question: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    color: '#1e293b',
  },

  button: {
    width: '100%',
    padding: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    marginBottom: 14,
    alignItems: 'center',
  },

  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
  },

  langContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },

  langText: {
    fontSize: 15,
    color: '#64748b',
    paddingHorizontal: 6,
  },

  activeLang: {
    fontWeight: 'bold',
    color: '#0284c7',
  },

  langDivider: {
    color: '#cbd5e1',
  },

  security: {
    marginTop: 25,
    fontSize: 14,
    color: '#475569',
  },

  legal: {
    marginTop: 12,
    fontSize: 12,
    color: '#94a3b8',
  },
});