import NetInfo from '@react-native-community/netinfo';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Language, useLanguage } from './lib/i18n';

export default function HomeScreen() {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();

  const [isOnline, setIsOnline] = useState<boolean>(true);

  const [infoModal, setInfoModal] = useState<
    'privacy' | 'terms' | 'support' | null
  >(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(
        Boolean(
          state.isConnected &&
            state.isInternetReachable
        )
      );
    });

    return () => unsubscribe();
  }, []);

  return (
    <View style={styles.container}>

      {/* ================= HEADER ================= */}

      <View style={styles.header}>

        <View style={styles.headerBrandArea}>

          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.headerLogo}
          />

          <View>
            <Text style={styles.headerBrand}>
              ArogyaConnect
            </Text>

            <Text style={styles.headerSubtext}>
              Public Healthcare Platform
            </Text>
          </View>

        </View>

        {/* Language selector */}
        <View style={styles.headerRight}>

          <Text style={styles.languageLabel}>
            {t('language')}
          </Text>

          {(['en', 'hi', 'mr', 'kn'] as Language[]).map(
            (option) => (
              <Pressable
                key={option}
                onPress={() => setLanguage(option)}
                style={[
                  styles.headerLanguageButton,
                  language === option &&
                    styles.headerLanguageActive,
                ]}
              >
                <Text
                  style={[
                    styles.headerLanguageText,
                    language === option &&
                      styles.headerLanguageActiveText,
                  ]}
                >
                  {option === 'en'
                    ? 'English'
                    : option === 'hi'
                    ? 'हिन्दी'
                    : option === 'mr'
                    ? 'मराठी'
                    : 'ಕನ್ನಡ'}
                </Text>
              </Pressable>
            )
          )}

        </View>

      </View>

      {/* ================= MAIN SCROLL ================= */}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >

        <View style={styles.main}>

          {/* ONLINE STATUS */}

          <View style={styles.statusBadge}>

            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: isOnline
                    ? '#238b45'
                    : '#c62828',
                },
              ]}
            />

            <Text style={styles.statusText}>
              {isOnline
                ? t('online')
                : t('offline')}
            </Text>

          </View>

          {/* ================= LOGO ================= */}

          <View style={styles.mainLogoContainer}>

            <Image
              source={require('@/assets/images/logo.png')}
              style={styles.mainLogo}
            />

          </View>

          {/* ================= TITLE ================= */}

          <Text style={styles.appName}>
            ArogyaConnect
          </Text>

          <View style={styles.greenUnderline} />

          <Text style={styles.tagline}>
            Healthcare within reach
          </Text>

          <Text style={styles.description}>
            Connecting communities with accessible public
            healthcare services across rural India.
          </Text>

          {/* ================= WHO ARE YOU ================= */}

          <Text style={styles.question}>
            {t('whoAreYou')}
          </Text>

          {/* ================= CARDS ================= */}

          <View style={styles.cardsRow}>

            {/* PATIENT */}

            <Pressable
              onPress={() =>
                router.push('/patient' as any)
              }
              style={({ pressed }) => [
                styles.card,
                styles.patientCard,
                pressed && styles.cardPressed,
              ]}
            >

              <View style={styles.imageCirclePatient}>

                <Image
                  source={require('@/assets/images/patient.png')}
                  style={styles.personImage}
                  resizeMode="contain"
                />

              </View>

              <Text style={styles.cardTitle}>
                {t('patient')}
              </Text>

              <Text style={styles.cardDescription}>
                Access health records, appointments and
                healthcare services
              </Text>

              <Text style={styles.cardArrow}>
                →
              </Text>

            </Pressable>

            {/* ASHA */}

            <Pressable
              onPress={() =>
                router.push('/admin' as any)
              }
              style={({ pressed }) => [
                styles.card,
                styles.ashaCard,
                pressed && styles.cardPressed,
              ]}
            >

              <View style={styles.imageCircleAsha}>

                <Image
                  source={require('@/assets/images/asha.png')}
                  style={styles.personImage}
                  resizeMode="contain"
                />

              </View>

              <Text style={styles.cardTitle}>
                {t('worker')}
              </Text>

              <Text style={styles.cardDescription}>
                Manage community health, patient registration
                and care
              </Text>

              <Text style={styles.cardArrow}>
                →
              </Text>

            </Pressable>

            {/* DOCTOR */}

            <Pressable
              onPress={() =>
                router.push('/doctor' as any)
              }
              style={({ pressed }) => [
                styles.card,
                styles.doctorCard,
                pressed && styles.cardPressed,
              ]}
            >

              <View style={styles.imageCircleDoctor}>

                <Image
                  source={require('@/assets/images/doctor.png')}
                  style={styles.personImage}
                  resizeMode="contain"
                />

              </View>

              <Text style={styles.cardTitle}>
                {t('doctor')}
              </Text>

              <Text style={styles.cardDescription}>
                Review patient cases, consultations and
                healthcare records
              </Text>

              <Text style={styles.cardArrow}>
                →
              </Text>

            </Pressable>

          </View>

          {/* ================= BENEFITS ================= */}

          <View style={styles.benefitsBar}>

            <View style={styles.benefit}>

              <Text style={styles.benefitIcon}>
                🛡
              </Text>

              <View>
                <Text style={styles.benefitTitle}>
                  Secure & Private
                </Text>

                <Text style={styles.benefitText}>
                  Protected health data
                </Text>
              </View>

            </View>

            <View style={styles.benefitDivider} />

            <View style={styles.benefit}>

              <Text style={styles.benefitIcon}>
                ☁
              </Text>

              <View>
                <Text style={styles.benefitTitle}>
                  Works Offline
                </Text>

                <Text style={styles.benefitText}>
                  Syncs when connected
                </Text>
              </View>

            </View>

            <View style={styles.benefitDivider} />

            <View style={styles.benefit}>

              <Text style={styles.benefitIcon}>
                ✓
              </Text>

              <View>
                <Text style={styles.benefitTitle}>
                  Public Healthcare
                </Text>

                <Text style={styles.benefitText}>
                  Built for rural communities
                </Text>
              </View>

            </View>

          </View>

          {/* ================= LANGUAGE ================= */}

          <View style={styles.bottomLanguage}>

            <Text style={styles.bottomLanguageLabel}>
              {t('language')}:
            </Text>

            {(['en', 'hi', 'mr', 'kn'] as Language[]).map(
              (option, index) => (
                <React.Fragment key={option}>

                  {index > 0 && (
                    <Text style={styles.divider}>
                      |
                    </Text>
                  )}

                  <Pressable
                    onPress={() =>
                      setLanguage(option)
                    }
                  >
                    <Text
                      style={[
                        styles.bottomLanguageText,
                        language === option &&
                          styles.activeLanguage,
                      ]}
                    >
                      {option === 'en'
                        ? 'English'
                        : option === 'hi'
                        ? 'हिन्दी'
                        : option === 'mr'
                        ? 'मराठी'
                        : 'ಕನ್ನಡ'}
                    </Text>
                  </Pressable>

                </React.Fragment>
              )
            )}

          </View>

          <Text style={styles.security}>
            🔒 {t('secure')}
          </Text>

        </View>

      </ScrollView>

      {/* ================= FOOTER ================= */}

      <View style={styles.footer}>

        <Text style={styles.footerCopyright}>
          © 2026 ArogyaConnect. All rights reserved.
        </Text>

        <View style={styles.footerLinks}>

          <Pressable
            onPress={() =>
              setInfoModal('privacy')
            }
          >
            <Text style={styles.footerLink}>
              Privacy Policy
            </Text>
          </Pressable>

          <Text style={styles.footerDivider}>
            |
          </Text>

          <Pressable
            onPress={() =>
              setInfoModal('terms')
            }
          >
            <Text style={styles.footerLink}>
              Terms of Use
            </Text>
          </Pressable>

          <Text style={styles.footerDivider}>
            |
          </Text>

          <Pressable
            onPress={() =>
              setInfoModal('support')
            }
          >
            <Text style={styles.footerLink}>
              Help & Support
            </Text>
          </Pressable>

        </View>

      </View>

      {/* ================= MODALS ================= */}

      <Modal
        visible={infoModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setInfoModal(null)
        }
      >

        <View style={styles.modalOverlay}>

          <View style={styles.modal}>

            {infoModal === 'privacy' && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    Privacy Policy
                  </Text>

                  <Pressable
                    onPress={() =>
                      setInfoModal(null)
                    }
                    style={styles.closeButton}
                  >
                    <Text style={styles.closeText}>
                      ×
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.modalLine} />

                <Text style={styles.modalText}>
                  ArogyaConnect is designed to protect
                  the privacy and confidentiality of
                  patient information. Health information
                  is accessed only for providing and
                  coordinating healthcare services.
                  Data is handled securely and access is
                  restricted according to the user role.
                </Text>

                <Pressable
                  onPress={() =>
                    setInfoModal(null)
                  }
                  style={styles.closeModalButton}
                >
                  <Text style={styles.closeModalText}>
                    Close
                  </Text>
                </Pressable>
              </>
            )}

            {infoModal === 'terms' && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    Terms of Use
                  </Text>

                  <Pressable
                    onPress={() =>
                      setInfoModal(null)
                    }
                    style={styles.closeButton}
                  >
                    <Text style={styles.closeText}>
                      ×
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.modalLine} />

                <Text style={styles.modalText}>
                  ArogyaConnect is a digital public
                  healthcare platform intended to support
                  patients, ASHA/ANM workers and doctors.
                  The platform assists healthcare
                  workflows and does not replace
                  professional medical judgement.
                </Text>

                <Pressable
                  onPress={() =>
                    setInfoModal(null)
                  }
                  style={styles.closeModalButton}
                >
                  <Text style={styles.closeModalText}>
                    Close
                  </Text>
                </Pressable>
              </>
            )}

            {infoModal === 'support' && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    Help & Support
                  </Text>

                  <Pressable
                    onPress={() =>
                      setInfoModal(null)
                    }
                    style={styles.closeButton}
                  >
                    <Text style={styles.closeText}>
                      ×
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.modalLine} />

                <Text style={styles.modalText}>
                  For assistance with ArogyaConnect,
                  please contact your designated
                  healthcare facility or system
                  administrator. ASHA/ANM workers can
                  approach their assigned PHC or
                  supervising health authority for
                  technical support.
                </Text>

                <Pressable
                  onPress={() =>
                    setInfoModal(null)
                  }
                  style={styles.closeModalButton}
                >
                  <Text style={styles.closeModalText}>
                    Close
                  </Text>
                </Pressable>
              </>
            )}

          </View>

        </View>

      </Modal>

    </View>
  );
}

/* ============================================================
   STYLES
   ============================================================ */

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#f5f8fb',
  },

  /* HEADER */

  header: {
    width: '100%',
    minHeight: 76,
    backgroundColor: '#ffffff',
    borderTopWidth: 4,
    borderTopColor: '#123d68',
    borderBottomWidth: 1,
    borderBottomColor: '#d9e2ea',
    paddingHorizontal: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerBrandArea: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  headerLogo: {
    width: 47,
    height: 47,
    marginRight: 12,
  },

  headerBrand: {
    fontSize: 18,
    fontWeight: '700',
    color: '#12375c',
  },

  headerSubtext: {
    fontSize: 11,
    color: '#718195',
    marginTop: 2,
  },

  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  languageLabel: {
    fontSize: 12,
    color: '#687b8e',
    marginRight: 8,
  },

  headerLanguageButton: {
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 3,
    marginLeft: 2,
  },

  headerLanguageActive: {
    backgroundColor: '#123d68',
  },

  headerLanguageText: {
    fontSize: 11,
    color: '#435a70',
  },

  headerLanguageActiveText: {
    color: '#ffffff',
    fontWeight: '700',
  },

  /* SCROLL */

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 25,
  },

  main: {
    width: '92%',
    maxWidth: 1250,
    alignItems: 'center',
  },

  /* STATUS */

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d8e2ea',
    borderRadius: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginBottom: 18,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 7,
  },

  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#40566d',
  },

  /* LOGO */

  mainLogoContainer: {
    width: 78,
    height: 78,
    backgroundColor: '#ffffff',
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#dce5ec',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  mainLogo: {
    width: 63,
    height: 63,
  },

  /* TITLE */

  appName: {
    fontSize: 40,
    fontWeight: '700',
    color: '#12375c',
  },

  greenUnderline: {
    width: 60,
    height: 3,
    backgroundColor: '#16806b',
    marginTop: 7,
    marginBottom: 7,
  },

  tagline: {
    fontSize: 17,
    fontWeight: '500',
    color: '#16806b',
  },

  description: {
    fontSize: 13,
    color: '#667b8f',
    textAlign: 'center',
    maxWidth: 650,
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 24,
  },

  question: {
    fontSize: 22,
    fontWeight: '700',
    color: '#173957',
    marginBottom: 16,
  },

  /* CARDS */

  cardsRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 16,
  },

  card: {
    flex: 1,
    minHeight: 200,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d7e1e9',
    borderRadius: 7,
    padding: 20,
    position: 'relative',
  },

  patientCard: {
    borderBottomWidth: 4,
    borderBottomColor: '#1261a0',
  },

  ashaCard: {
    borderBottomWidth: 4,
    borderBottomColor: '#198754',
  },

  doctorCard: {
    borderBottomWidth: 4,
    borderBottomColor: '#7655a8',
  },

  cardPressed: {
    opacity: 0.75,
  },

  imageCirclePatient: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#e8f2fb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  imageCircleAsha: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#e6f5ed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  imageCircleDoctor: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#f0eafa',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  personImage: {
    width: 64,
    height: 64,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#173957',
    marginBottom: 7,
  },

  cardDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: '#687d91',
    paddingRight: 25,
  },

  cardArrow: {
    position: 'absolute',
    right: 20,
    bottom: 16,
    fontSize: 27,
    color: '#123d68',
  },

  /* BENEFITS */

  benefitsBar: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dce4eb',
    borderRadius: 7,
    marginTop: 18,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },

  benefit: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  benefitIcon: {
    fontSize: 21,
    marginRight: 9,
  },

  benefitTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#243d59',
  },

  benefitText: {
    fontSize: 9,
    color: '#788999',
    marginTop: 2,
  },

  benefitDivider: {
    width: 1,
    height: 38,
    backgroundColor: '#dce4eb',
  },

  /* LANGUAGE */

  bottomLanguage: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
  },

  bottomLanguageLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334b63',
    marginRight: 5,
  },

  bottomLanguageText: {
    fontSize: 12,
    color: '#64778a',
    paddingHorizontal: 5,
  },

  activeLanguage: {
    color: '#1267a5',
    fontWeight: '700',
  },

  divider: {
    color: '#c5ced7',
  },

  security: {
    fontSize: 11,
    color: '#64778a',
    marginTop: 8,
    marginBottom: 10,
  },

  /* FOOTER */

  footer: {
    width: '100%',
    minHeight: 58,
    backgroundColor: '#12375c',
    paddingHorizontal: 40,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  footerCopyright: {
    fontSize: 10,
    color: '#e6eef5',
  },

  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  footerLink: {
    color: '#ffffff',
    fontSize: 11,
    textDecorationLine: 'underline',
  },

  footerDivider: {
    color: '#91a7bb',
    marginHorizontal: 9,
  },

  /* MODAL */

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(8, 29, 50, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 25,
  },

  modal: {
    width: '100%',
    maxWidth: 600,
    backgroundColor: '#ffffff',
    borderTopWidth: 4,
    borderTopColor: '#123d68',
    borderRadius: 6,
    padding: 24,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#15375b',
  },

  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#edf2f6',
    justifyContent: 'center',
    alignItems: 'center',
  },

  closeText: {
    fontSize: 24,
    color: '#36516c',
  },

  modalLine: {
    height: 1,
    backgroundColor: '#dce4eb',
    marginVertical: 16,
  },

  modalText: {
    fontSize: 14,
    lineHeight: 23,
    color: '#4c6074',
  },

  closeModalButton: {
    alignSelf: 'flex-end',
    marginTop: 22,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#123d68',
    borderRadius: 4,
  },

  closeModalText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },

});