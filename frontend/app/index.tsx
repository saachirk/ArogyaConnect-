import NetInfo from '@react-native-community/netinfo';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Language, useLanguage } from './lib/i18n';

export default function HomeScreen() {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
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
            {isOnline ? t('online') : t('offline')}
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
          {t('whoAreYou')}
        </Text>

        {/* Navigates to app/patient */}
        <Pressable style={styles.button} onPress={() => router.push('/patient' as any)}>
          <Text style={styles.buttonText}>{t('patient')}</Text>
        </Pressable>

        {/* Navigates to app/admin (or app/asha) */}
        <Pressable style={styles.button} onPress={() => router.push('/admin' as any)}>
          <Text style={styles.buttonText}>{t('worker')}</Text>
        </Pressable>

        {/* Navigates to app/doctor */}
        <Pressable style={styles.button} onPress={() => router.push('/doctor' as any)}>
          <Text style={styles.buttonText}>{t('doctor')}</Text>
        </Pressable>

        {/* Language Switcher */}
        <View style={styles.langContainer}>
          <Text style={styles.languageLabel}>{t('language')}: </Text>
          {(['en', 'hi', 'mr', 'kn'] as Language[]).map((option, index) => (
            <React.Fragment key={option}>
              {index > 0 && <Text style={styles.langDivider}>|</Text>}
              <Pressable onPress={() => setLanguage(option)}>
                <Text style={[styles.langText, language === option && styles.activeLang]}>
                  {t(option === 'en' ? 'english' : option === 'hi' ? 'hindi' : option === 'mr' ? 'marathi' : 'kannada')}
                </Text>
              </Pressable>
            </React.Fragment>
          ))}
        </View>

        <Text style={styles.security}>
          🔒 {t('secure')}
        </Text>

        <Text style={styles.legal}>
          {t('privacy')}
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

  languageLabel: {
    fontSize: 15,
    color: '#334155',
    fontWeight: '600',
    marginRight: 4,
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