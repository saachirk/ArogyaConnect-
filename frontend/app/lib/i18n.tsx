import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Language = 'en' | 'hi' | 'mr' | 'kn';
type TranslationKey = keyof typeof translations.en;

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
};

const translations = {
  en: {
    language: 'Language', english: 'English', hindi: 'हिंदी (Hindi)', marathi: 'मराठी (Marathi)', kannada: 'ಕನ್ನಡ (Kannada)',
    online: 'Online Sync Active', offline: 'Offline Mode (Local Storage)', whoAreYou: 'Who are you?', patient: 'Patient', worker: 'ASHA / ANM Worker', doctor: 'Doctor', secure: 'Secure & Private', privacy: 'Privacy Policy · Terms',
    home: 'Home', logout: 'Log Out', loading: 'Loading...', missingDetails: 'Missing Details', requiredFields: 'Please fill in all required fields.', failedSubmit: 'Failed to submit. Please try again.', success: 'Success', error: 'Error',
    patientDetails: 'Patient Details', patientName: 'Patient Name', phone: 'Phone Number', age: 'Age', gender: 'Gender', symptoms: 'Symptoms', duration: 'Symptom Duration', submit: 'Submit',
    patientDetailsSuccess: 'Patient details submitted successfully.', triageSuccess: 'Triage assessment submitted successfully.', prescriptionSuccess: 'Prescription submitted successfully.', completeSuccess: 'Case marked as completed successfully.',
    doctorPortal: 'Doctor Portal', login: 'Log In', register: 'Register', doctorLogin: 'Log In to Portal', doctorRegistration: 'Submit Registration for Verification',
    triageOperations: 'Doctor Triage & Operations', queueReview: 'Queue & Review', followups: 'High-Risk Follow-ups', history: 'Referrals & Past Cases', patientsWaiting: 'Patients Waiting', reviewConsult: 'Review History & Consult',
    prescription: 'Structured Prescription Form', drug: 'Drug Name', dosage: 'Dosage', frequency: 'Duration / Frequency', instructions: 'Special Instructions', issuePrescription: 'Issue Structured Prescription', submittedPrescription: 'Submitted Prescription', prescriptionCompleted: 'Prescription Completed', complete: 'Complete', completed: 'Completed', active: 'Active',
    caseStatus: 'Status', viewDetails: 'View Case Details', patientPortal: 'Patient Health Portal', welcome: 'Welcome', recentPrescriptions: 'Recent Prescriptions', medicine: 'Medicine', noPrescriptions: 'No prescriptions yet',
    ashaTitle: 'ASHA Field Command Center', operationalSummary: "Today's Operational Task Summary", liveCases: 'Total Live Cases', pendingReview: 'Pending Review', followupsDue: 'Follow-ups Due',
    addCase: 'Add New Patient Case', addCaseButton: 'Add Case to Triage Queue', triageQueue: 'Triage Queue', verifyTriage: 'Verify & Analyze in Triage', submitDoctor: 'Submit Verified Case Status to Doctor Queue', liveVitals: 'Live Vitals Record (From DB)',
  },
  hi: {
    language: 'भाषा', english: 'English', hindi: 'हिंदी (Hindi)', marathi: 'मराठी (Marathi)', kannada: 'ಕನ್ನಡ (Kannada)',
    online: 'ऑनलाइन सिंक सक्रिय', offline: 'ऑफ़लाइन मोड (स्थानीय संग्रहण)', whoAreYou: 'आप कौन हैं?', patient: 'मरीज', worker: 'आशा / एएनएम कार्यकर्ता', doctor: 'डॉक्टर', secure: 'सुरक्षित और निजी', privacy: 'गोपनीयता नीति · शर्तें',
    home: 'होम', logout: 'लॉग आउट', loading: 'लोड हो रहा है...', missingDetails: 'जानकारी अधूरी है', requiredFields: 'कृपया सभी आवश्यक जानकारी भरें।', failedSubmit: 'सबमिट नहीं हो सका। कृपया फिर प्रयास करें।', success: 'सफलता', error: 'त्रुटि',
    patientDetails: 'मरीज की जानकारी', patientName: 'मरीज का नाम', phone: 'फोन नंबर', age: 'उम्र', gender: 'लिंग', symptoms: 'लक्षण', duration: 'लक्षणों की अवधि', submit: 'सबमिट करें',
    patientDetailsSuccess: 'मरीज की जानकारी सफलतापूर्वक जमा की गई।', triageSuccess: 'ट्रायेज मूल्यांकन सफलतापूर्वक जमा किया गया।', prescriptionSuccess: 'प्रिस्क्रिप्शन सफलतापूर्वक जमा किया गया।', completeSuccess: 'केस सफलतापूर्वक पूरा किया गया।',
    doctorPortal: 'डॉक्टर पोर्टल', login: 'लॉग इन', register: 'पंजीकरण', doctorLogin: 'पोर्टल में लॉग इन करें', doctorRegistration: 'सत्यापन के लिए पंजीकरण जमा करें',
    triageOperations: 'डॉक्टर ट्रायेज और संचालन', queueReview: 'कतार और समीक्षा', followups: 'उच्च जोखिम फॉलो-अप', history: 'रेफरल और पुराने केस', patientsWaiting: 'प्रतीक्षा कर रहे मरीज', reviewConsult: 'इतिहास और परामर्श देखें',
    prescription: 'प्रिस्क्रिप्शन फॉर्म', drug: 'दवा का नाम', dosage: 'खुराक', frequency: 'अवधि / आवृत्ति', instructions: 'विशेष निर्देश', issuePrescription: 'प्रिस्क्रिप्शन जारी करें', submittedPrescription: 'जमा किया गया प्रिस्क्रिप्शन', prescriptionCompleted: 'प्रिस्क्रिप्शन पूरा हुआ', complete: 'केस पूरा करें', completed: 'पूरा हुआ', active: 'सक्रिय',
    caseStatus: 'स्थिति', viewDetails: 'केस की जानकारी देखें', patientPortal: 'मरीज स्वास्थ्य पोर्टल', welcome: 'स्वागत है', recentPrescriptions: 'हाल के प्रिस्क्रिप्शन', medicine: 'दवा', noPrescriptions: 'अभी कोई प्रिस्क्रिप्शन नहीं',
    ashaTitle: 'आशा फील्ड कमांड सेंटर', operationalSummary: 'आज के कार्यों का सारांश', liveCases: 'कुल लाइव केस', pendingReview: 'समीक्षा लंबित', followupsDue: 'फॉलो-अप बाकी',
    addCase: 'नया मरीज केस जोड़ें', addCaseButton: 'ट्रायेज कतार में केस जोड़ें', triageQueue: 'ट्रायेज कतार', verifyTriage: 'ट्रायेज में सत्यापित और विश्लेषण करें', submitDoctor: 'डॉक्टर की कतार में सत्यापित केस भेजें', liveVitals: 'लाइव वाइटल रिकॉर्ड (डेटाबेस से)',
  },
  mr: {
    language: 'भाषा', english: 'English', hindi: 'हिंदी (Hindi)', marathi: 'मराठी (Marathi)', kannada: 'ಕನ್ನಡ (Kannada)',
    online: 'ऑनलाइन सिंक सक्रिय', offline: 'ऑफलाइन मोड (स्थानिक संचय)', whoAreYou: 'आपण कोण आहात?', patient: 'रुग्ण', worker: 'आशा / एएनएम कार्यकर्ता', doctor: 'डॉक्टर', secure: 'सुरक्षित आणि गोपनीय', privacy: 'गोपनीयता धोरण · अटी',
    home: 'मुख्यपृष्ठ', logout: 'लॉग आउट', loading: 'लोड होत आहे...', missingDetails: 'माहिती अपूर्ण आहे', requiredFields: 'कृपया सर्व आवश्यक माहिती भरा.', failedSubmit: 'सबमिट करता आले नाही. कृपया पुन्हा प्रयत्न करा.', success: 'यशस्वी', error: 'त्रुटी',
    patientDetails: 'रुग्णाची माहिती', patientName: 'रुग्णाचे नाव', phone: 'फोन नंबर', age: 'वय', gender: 'लिंग', symptoms: 'लक्षणे', duration: 'लक्षणांचा कालावधी', submit: 'सबमिट करा',
    patientDetailsSuccess: 'रुग्णाची माहिती यशस्वीरित्या सबमिट केली.', triageSuccess: 'ट्रायेज मूल्यांकन यशस्वीरित्या सबमिट केले.', prescriptionSuccess: 'प्रिस्क्रिप्शन यशस्वीरित्या सबमिट केले गेले.', completeSuccess: 'केस यशस्वीरित्या पूर्ण केला.',
    doctorPortal: 'डॉक्टर पोर्टल', login: 'लॉग इन', register: 'नोंदणी', doctorLogin: 'पोर्टलमध्ये लॉग इन करा', doctorRegistration: 'पडताळणीसाठी नोंदणी सबमिट करा',
    triageOperations: 'डॉक्टर ट्रायेज आणि संचालन', queueReview: 'रांग आणि पुनरावलोकन', followups: 'उच्च-जोखीम फॉलो-अप', history: 'रेफरल आणि मागील केसेस', patientsWaiting: 'प्रतीक्षेत असलेले रुग्ण', reviewConsult: 'इतिहास आणि सल्ला पहा',
    prescription: 'प्रिस्क्रिप्शन फॉर्म', drug: 'औषधाचे नाव', dosage: 'मात्रा', frequency: 'कालावधी / वारंवारता', instructions: 'विशेष सूचना', issuePrescription: 'प्रिस्क्रिप्शन जारी करा', submittedPrescription: 'सबमिट केलेले प्रिस्क्रिप्शन', prescriptionCompleted: 'प्रिस्क्रिप्शन पूर्ण', complete: 'केस पूर्ण करा', completed: 'पूर्ण', active: 'सक्रिय',
    caseStatus: 'स्थिती', viewDetails: 'केसची माहिती पहा', patientPortal: 'रुग्ण आरोग्य पोर्टल', welcome: 'स्वागत', recentPrescriptions: 'अलीकडील प्रिस्क्रिप्शन', medicine: 'औषध', noPrescriptions: 'अद्याप प्रिस्क्रिप्शन नाही',
    ashaTitle: 'आशा फील्ड कमांड सेंटर', operationalSummary: 'आजच्या कामांचा आढावा', liveCases: 'एकूण लाइव्ह केसेस', pendingReview: 'पुनरावलोकन प्रलंबित', followupsDue: 'फॉलो-अप बाकी',
    addCase: 'नवीन रुग्ण केस जोडा', addCaseButton: 'ट्रायेज रांगेत केस जोडा', triageQueue: 'ट्रायेज रांग', verifyTriage: 'ट्रायेजमध्ये पडताळणी व विश्लेषण करा', submitDoctor: 'डॉक्टरांच्या रांगेत पडताळलेला केस पाठवा', liveVitals: 'लाइव्ह व्हायटल रेकॉर्ड (डेटाबेसमधून)',
  },
  kn: {
    language: 'ಭಾಷೆ', english: 'English', hindi: 'हिंदी (Hindi)', marathi: 'मराठी (Marathi)', kannada: 'ಕನ್ನಡ (Kannada)',
    online: 'ಆನ್‌ಲೈನ್ ಸಿಂಕ್ ಸಕ್ರಿಯ', offline: 'ಆಫ್‌ಲೈನ್ ಮೋಡ್ (ಸ್ಥಳೀಯ ಸಂಗ್ರಹಣೆ)', whoAreYou: 'ನೀವು ಯಾರು?', patient: 'ರೋಗಿ', worker: 'ಆಶಾ / ಎಎನ್‌ಎಂ ಕಾರ್ಯಕರ್ತೆ', doctor: 'ವೈದ್ಯರು', secure: 'ಸುರಕ್ಷಿತ ಮತ್ತು ಖಾಸಗಿ', privacy: 'ಗೌಪ್ಯತಾ ನೀತಿ · ನಿಯಮಗಳು',
    home: 'ಮುಖಪುಟ', logout: 'ಲಾಗ್ ಔಟ್', loading: 'ಲೋಡ್ ಆಗುತ್ತಿದೆ...', missingDetails: 'ಮಾಹಿತಿ ಅಪೂರ್ಣವಾಗಿದೆ', requiredFields: 'ದಯವಿಟ್ಟು ಎಲ್ಲಾ ಅಗತ್ಯ ಮಾಹಿತಿಯನ್ನು ನಮೂದಿಸಿ.', failedSubmit: 'ಸಲ್ಲಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.', success: 'ಯಶಸ್ಸು', error: 'ದೋಷ',
    patientDetails: 'ರೋಗಿಯ ವಿವರಗಳು', patientName: 'ರೋಗಿಯ ಹೆಸರು', phone: 'ದೂರವಾಣಿ ಸಂಖ್ಯೆ', age: 'ವಯಸ್ಸು', gender: 'ಲಿಂಗ', symptoms: 'ಲಕ್ಷಣಗಳು', duration: 'ಲಕ್ಷಣಗಳ ಅವಧಿ', submit: 'ಸಲ್ಲಿಸಿ',
    patientDetailsSuccess: 'ರೋಗಿಯ ವಿವರಗಳನ್ನು ಯಶಸ್ವಿಯಾಗಿ ಸಲ್ಲಿಸಲಾಗಿದೆ.', triageSuccess: 'ಟ್ರಯಾಜ್ ಮೌಲ್ಯಮಾಪನವನ್ನು ಯಶಸ್ವಿಯಾಗಿ ಸಲ್ಲಿಸಲಾಗಿದೆ.', prescriptionSuccess: 'ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ಅನ್ನು ಯಶಸ್ವಿಯಾಗಿ ಸಲ್ಲಿಸಲಾಗಿದೆ.', completeSuccess: 'ಕೇಸ್ ಅನ್ನು ಯಶಸ್ವಿಯಾಗಿ ಪೂರ್ಣಗೊಳಿಸಲಾಗಿದೆ.',
    doctorPortal: 'ವೈದ್ಯರ ಪೋರ್ಟಲ್', login: 'ಲಾಗ್ ಇನ್', register: 'ನೋಂದಣಿ', doctorLogin: 'ಪೋರ್ಟಲ್‌ಗೆ ಲಾಗ್ ಇನ್ ಮಾಡಿ', doctorRegistration: 'ಪರಿಶೀಲನೆಗಾಗಿ ನೋಂದಣಿ ಸಲ್ಲಿಸಿ',
    triageOperations: 'ವೈದ್ಯರ ಟ್ರಯಾಜ್ ಮತ್ತು ಕಾರ್ಯಾಚರಣೆ', queueReview: 'ಸರತಿ ಮತ್ತು ಪರಿಶೀಲನೆ', followups: 'ಹೆಚ್ಚಿನ ಅಪಾಯದ ಫಾಲೋ-ಅಪ್', history: 'ರೆಫರಲ್‌ಗಳು ಮತ್ತು ಹಿಂದಿನ ಕೇಸ್‌ಗಳು', patientsWaiting: 'ಕಾಯುತ್ತಿರುವ ರೋಗಿಗಳು', reviewConsult: 'ಇತಿಹಾಸ ಮತ್ತು ಸಮಾಲೋಚನೆ ಪರಿಶೀಲಿಸಿ',
    prescription: 'ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ಫಾರ್ಮ್', drug: 'ಔಷಧದ ಹೆಸರು', dosage: 'ಪ್ರಮಾಣ', frequency: 'ಅವಧಿ / ಆವರ್ತನೆ', instructions: 'ವಿಶೇಷ ಸೂಚನೆಗಳು', issuePrescription: 'ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ನೀಡಿ', submittedPrescription: 'ಸಲ್ಲಿಸಿದ ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್', prescriptionCompleted: 'ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ಪೂರ್ಣಗೊಂಡಿದೆ', complete: 'ಕೇಸ್ ಪೂರ್ಣಗೊಳಿಸಿ', completed: 'ಪೂರ್ಣಗೊಂಡಿದೆ', active: 'ಸಕ್ರಿಯ',
    caseStatus: 'ಸ್ಥಿತಿ', viewDetails: 'ಕೇಸ್ ವಿವರಗಳನ್ನು ವೀಕ್ಷಿಸಿ', patientPortal: 'ರೋಗಿ ಆರೋಗ್ಯ ಪೋರ್ಟಲ್', welcome: 'ಸ್ವಾಗತ', recentPrescriptions: 'ಇತ್ತೀಚಿನ ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್‌ಗಳು', medicine: 'ಔಷಧಿ', noPrescriptions: 'ಇನ್ನೂ ಯಾವುದೇ ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ಇಲ್ಲ',
    ashaTitle: 'ಆಶಾ ಫೀಲ್ಡ್ ಕಮಾಂಡ್ ಸೆಂಟರ್', operationalSummary: 'ಇಂದಿನ ಕಾರ್ಯಗಳ ಸಾರಾಂಶ', liveCases: 'ಒಟ್ಟು ಲೈವ್ ಕೇಸ್‌ಗಳು', pendingReview: 'ಪರಿಶೀಲನೆ ಬಾಕಿ', followupsDue: 'ಫಾಲೋ-ಅಪ್‌ಗಳು ಬಾಕಿ',
    addCase: 'ಹೊಸ ರೋಗಿ ಕೇಸ್ ಸೇರಿಸಿ', addCaseButton: 'ಟ್ರಯಾಜ್ ಸರತಿಗೆ ಕೇಸ್ ಸೇರಿಸಿ', triageQueue: 'ಟ್ರಯಾಜ್ ಸರತಿ', verifyTriage: 'ಟ್ರಯಾಜ್‌ನಲ್ಲಿ ಪರಿಶೀಲಿಸಿ ಮತ್ತು ವಿಶ್ಲೇಷಿಸಿ', submitDoctor: 'ಪರಿಶೀಲಿಸಿದ ಕೇಸ್ ಅನ್ನು ವೈದ್ಯರ ಸರತಿಗೆ ಕಳುಹಿಸಿ', liveVitals: 'ಲೈವ್ ವೈಟಲ್ ದಾಖಲೆ (ಡೇಟಾಬೇಸ್‌ನಿಂದ)',
  },
} as const;

const LanguageContext = createContext<LanguageContextValue | null>(null);
const STORAGE_KEY = 'arogya-connect-language';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'en' || stored === 'hi' || stored === 'mr' || stored === 'kn') setLanguageState(stored);
    });
  }, []);

  const setLanguage = (nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    void AsyncStorage.setItem(STORAGE_KEY, nextLanguage);
  };

  const t = (key: TranslationKey) => translations[language][key] || translations.en[key];
  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider');
  return context;
}

export function LanguageSelector() {
  const { language, setLanguage, t } = useLanguage();
  const options: { id: Language; key: TranslationKey }[] = [
    { id: 'en', key: 'english' },
    { id: 'hi', key: 'hindi' },
    { id: 'mr', key: 'marathi' },
    { id: 'kn', key: 'kannada' },
  ];

  return (
    <View style={selectorStyles.container} accessibilityLabel={t('language')}>
      <Text style={selectorStyles.label}>{t('language')}:</Text>
      {options.map((option) => (
        <Pressable
          key={option.id}
          onPress={() => setLanguage(option.id)}
          style={[selectorStyles.option, language === option.id && selectorStyles.activeOption]}
        >
          <Text style={[selectorStyles.text, language === option.id && selectorStyles.activeText]}>
            {t(option.key)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const selectorStyles = StyleSheet.create({
  container: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4, marginTop: 8 },
  label: { fontSize: 11, color: '#475569', fontWeight: '700', marginRight: 2 },
  option: { paddingHorizontal: 6, paddingVertical: 4, borderRadius: 5 },
  activeOption: { backgroundColor: '#e0f2fe' },
  text: { fontSize: 11, color: '#64748b' },
  activeText: { color: '#0369a1', fontWeight: '700' },
});

export type { Language, TranslationKey };
