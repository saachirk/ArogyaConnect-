import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { LanguageSelector, useLanguage } from '../lib/i18n';
import {
    Alert,
    Animated,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from 'react-native';

const NOTICES = [
  { text: '🩺  New High-Risk case assigned — Ramesh Kumar, Village 4. Review immediately.', bg: '#fef2f2', color: '#991b1b' },
  { text: '💊  Prescription guidelines updated for paediatric fever cases. Check protocol.', bg: '#fef3c7', color: '#92400e' },
  { text: '📡  Offline sync enabled — all triage notes will auto-upload on reconnection.', bg: '#eff6ff', color: '#1e40af' },
  { text: '✅  Follow-up confirmed: Lakshmiamma — ASHA visit completed at 10:30 AM.', bg: '#f0fdf4', color: '#166534' },
  { text: '🚑  Referral transport dispatched for Anand Kumar → District Hospital Hub.', bg: '#fdf4ff', color: '#6b21a8' },
];

export default function DoctorDashboardScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  const [isOnline, setIsOnline] = useState(true);
  const [activeTab, setActiveTab] = useState<'queue' | 'history' | 'followups'>('queue');
  const [selectedCase, setSelectedCase] = useState<any | null>(null);
  const [drugName, setDrugName] = useState('');
  const [dosage, setDosage] = useState('');
  const [duration, setDuration] = useState('');
  const [instructions, setInstructions] = useState('');
  const [referralFacility, setReferralFacility] = useState('');
  const [referralReason, setReferralReason] = useState('');
  const [queueCases, setQueueCases] = useState<any[]>([]);
  const [completedCases, setCompletedCases] = useState<any[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [referrals, setReferrals] = useState([
    { id: 'ref-101', patientName: 'Ramesh Kumar', facility: 'District Hospital Hub', reason: 'Unstable SpO2 & chest pain', status: 'Pending Transport' },
  ]);
  const [followUps, setFollowUps] = useState([
    { id: 'fu-1', patientName: 'Lakshmiamma', risk: 'High', ashaCompleted: false, dueDate: 'Today' },
  ]);

  const [noticeIdx, setNoticeIdx] = useState(0);
  const noticeFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const cycle = setInterval(() => {
      Animated.timing(noticeFade, { toValue: 0, duration: 350, useNativeDriver: true }).start(() => {
        setNoticeIdx((prev) => (prev + 1) % NOTICES.length);
        Animated.timing(noticeFade, { toValue: 1, duration: 350, useNativeDriver: true }).start();
      });
    }, 4000);
    return () => clearInterval(cycle);
  }, [noticeFade]);

  const handleStartCall = (mode: 'Video' | 'Audio' | 'Text Fallback') => {
    Alert.alert('Communication Link', `Initiating ${mode} connection with ASHA & Patient...`);
  };

  const handleIssuePrescription = async () => {
    if (!drugName.trim() || !dosage.trim()) { Alert.alert('Error', 'Please fill out at least the drug name and dosage.'); return; }
    if (!selectedCase) { Alert.alert('Error', 'No case selected.'); return; }
    const patientId = selectedCase.patient_id || selectedCase.patientId;
    if (!patientId) { Alert.alert('Save Failed', 'This case is not linked to a patient account.'); return; }
    try {
      const { error: rxError } = await supabase.from('prescriptions').insert({
        triage_case_id: selectedCase.id, patient_id: patientId,
        medicine_name: drugName.trim(), dosage: dosage.trim(),
        frequency: duration.trim(), duration: duration.trim(),
        instructions: instructions.trim() || null, doctor_name: 'Tele-Doctor',
      });
      if (rxError) { Alert.alert('Save Failed', `${rxError.message}\n\nRun the prescriptions SQL in Supabase first.`); return; }
      const { error: updateErr } = await supabase.from('triage_cases').update({
        doctor_notes: instructions.trim() || `Prescribed: ${drugName.trim()} (${dosage.trim()})`,
        doctor_decision: 'Prescription Issued', status: 'Consultation Completed',
      }).eq('id', selectedCase.id);
      if (updateErr) console.error('Triage update error:', updateErr);
      const submittedPrescription = { medicine_name: drugName.trim(), dosage: dosage.trim(), duration: duration.trim(), frequency: duration.trim(), instructions: instructions.trim(), doctor_name: 'Tele-Doctor', created_at: new Date().toISOString() };
      setQueueCases((prev) => prev.map((c) => c.id === selectedCase.id ? { ...c, status: 'Consultation Completed', prescriptions: [...(c.prescriptions || []), submittedPrescription] } : c));
      setSelectedCase((current: any) => current ? { ...current, status: 'Consultation Completed', prescriptions: [...(current.prescriptions || []), submittedPrescription] } : current);
      Alert.alert(t('success'), t('prescriptionSuccess'));
      setDrugName(''); setDosage(''); setDuration(''); setInstructions('');
    } catch (err) { Alert.alert('Error', 'Failed to save prescription.'); }
  };

  const handleCompleteCase = async (caseToComplete = selectedCase) => {
    if (!caseToComplete) return;
    const { error } = await supabase.from('triage_cases').update({ status: 'Completed' }).eq('id', caseToComplete.id);
    if (error) { Alert.alert('Failed to complete', 'Failed to complete the case. Please try again.'); return; }
    const completedCase = { ...caseToComplete, status: 'Completed' };
    setQueueCases((prev) => prev.filter((c) => c.id !== caseToComplete.id));
    setCompletedCases((prev) => [completedCase, ...prev.filter((c) => c.id !== caseToComplete.id)]);
    setSelectedCase((current: any) => current?.id === caseToComplete.id ? completedCase : current);
    Alert.alert(t('success'), t('completeSuccess'));
  };

  useEffect(() => {
    let mounted = true;
    const loadQueue = async () => {
      setLoadingQueue(true);
      const { data, error } = await supabase.from('triage_cases').select('*, patients(*), prescriptions(*)').order('created_at', { ascending: true });
      if (error) { console.error('Error loading triage cases:', error); setLoadingQueue(false); return; }
      if (mounted) {
        const mapped = (data || []).map((d: any) => ({
          id: d.id, patientName: d.patients?.name || 'Unknown', age: d.age, gender: d.gender,
          ashaWorker: d.asha_id, symptoms: d.symptoms,
          vitals: `Temp: ${d.temperature || 'N/A'} | SpO2: ${d.spo2 || 'N/A'}`,
          risk: d.ai_triage_level || 'Unknown', ashaNotes: d.doctor_notes || '',
          history: d.patients?.known_conditions || '', patient_id: d.patient_id,
          status: d.status, prescriptions: d.prescriptions || [],
        }));
        setQueueCases(mapped.filter((c: any) => c.status !== 'Completed'));
        setCompletedCases(mapped.filter((c: any) => c.status === 'Completed'));
      }
      setLoadingQueue(false);
    };
    loadQueue();
    const iv = setInterval(loadQueue, 5000);
    return () => { mounted = false; clearInterval(iv); };
  }, []);

  const handleCreateReferral = () => {
    if (!referralFacility || !referralReason) { Alert.alert('Error', 'Provide both facility and reason for upward referral.'); return; }
    if (!selectedCase) return;
    setReferrals([...referrals, { id: `ref-${Date.now()}`, patientName: selectedCase.patientName, facility: referralFacility, reason: referralReason, status: 'Active Tracker' }]);
    Alert.alert('Referral Logged', 'Patient referred upward. Status is now tracked in the system.');
    setReferralFacility(''); setReferralReason('');
  };

  const riskBadgeStyle = (risk: string) => {
    if (risk === 'High') return { bg: '#fef2f2', border: '#fecaca', text: '#b91c1c' };
    if (risk === 'Moderate') return { bg: '#fefce8', border: '#fde68a', text: '#b45309' };
    return { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534' };
  };

  const currentNotice = NOTICES[noticeIdx];

  return (
    <View style={styles.root}>

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>{t('triageOperations')}</Text>
          <Text style={styles.headerSubtitle}>Unified Rural Health Tele-Link</Text>
          <LanguageSelector />
        </View>
        <View style={styles.headerRight}>
          <Text style={[styles.onlineStatus, { color: isOnline ? '#4ade80' : '#f87171' }]}>{isOnline ? '● Online' : '● Offline'}</Text>
          <Switch value={isOnline} onValueChange={setIsOnline} thumbColor={isOnline ? '#4ade80' : '#94a3b8'} trackColor={{ true: '#166534', false: '#334155' }} />
          <Pressable onPress={() => router.replace('/' as any)} style={styles.logoutBtn}>
            <Text style={styles.logoutBtnText}>{t('logout')}</Text>
          </Pressable>
        </View>
      </View>

      {/* ── LIVE NOTICE BOARD ── */}
      <Animated.View style={[styles.noticeBanner, { backgroundColor: currentNotice.bg, opacity: noticeFade }]}>
        <Text style={styles.noticeLabel}>📋 Live Notice</Text>
        <Text style={[styles.noticeText, { color: currentNotice.color }]} numberOfLines={1}>{currentNotice.text}</Text>
      </Animated.View>

      {/* ── STAT ROW ── */}
      <View style={styles.statRow}>
        <View style={[styles.statTile, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
          <Text style={[styles.statValue, { color: '#b91c1c' }]}>{queueCases.length}</Text>
          <Text style={[styles.statLabel, { color: '#991b1b' }]}>Awaiting Review</Text>
        </View>
        <View style={[styles.statTile, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
          <Text style={[styles.statValue, { color: '#15803d' }]}>{completedCases.length}</Text>
          <Text style={[styles.statLabel, { color: '#166534' }]}>Completed Today</Text>
        </View>
        <View style={[styles.statTile, { backgroundColor: '#fef3c7', borderColor: '#fde68a' }]}>
          <Text style={[styles.statValue, { color: '#b45309' }]}>{followUps.length}</Text>
          <Text style={[styles.statLabel, { color: '#92400e' }]}>Follow-ups Due</Text>
        </View>
      </View>

      {/* ── TAB BAR ── */}
      <View style={styles.tabBar}>
        {([{ key: 'queue', label: t('queueReview') }, { key: 'followups', label: t('followups') }, { key: 'history', label: t('history') }] as { key: 'queue' | 'followups' | 'history'; label: string }[]).map((tab) => (
          <Pressable key={tab.key} style={[styles.tabItem, activeTab === tab.key && styles.tabItemActive]} onPress={() => { setActiveTab(tab.key); setSelectedCase(null); }}>
            <Text style={[styles.tabItemText, activeTab === tab.key && styles.tabItemTextActive]}>{tab.label}</Text>
            {activeTab === tab.key && <View style={styles.tabUnderline} />}
          </Pressable>
        ))}
      </View>

      {/* ── QUEUE TAB — two-column ── */}
      {activeTab === 'queue' && (
        <View style={styles.queueContainer}>
          <ScrollView style={styles.patientListCol} contentContainerStyle={styles.patientListContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.colHeader}>{t('patientsWaiting')} ({queueCases.length})</Text>
            {loadingQueue && queueCases.length === 0 && <View style={styles.emptyState}><Text style={styles.emptyStateText}>Loading queue…</Text></View>}
            {!loadingQueue && queueCases.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>✓</Text>
                <Text style={styles.emptyStateText}>Queue clear</Text>
                <Text style={styles.emptyStateSub}>No cases awaiting review</Text>
              </View>
            )}
            {queueCases.map((item) => {
              const badge = riskBadgeStyle(item.risk);
              const isActive = selectedCase?.id === item.id;
              return (
                <Pressable key={item.id} style={[styles.patientCard, isActive && styles.patientCardActive]} onPress={() => setSelectedCase(item)}>
                  {isActive && <View style={styles.activeStrip} />}
                  <View style={styles.patientCardInner}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.patientName} numberOfLines={1}>{item.patientName}</Text>
                      <View style={[styles.riskBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                        <Text style={[styles.riskBadgeText, { color: badge.text }]}>{item.risk}</Text>
                      </View>
                    </View>
                    <Text style={styles.patientMeta}>{item.age}y · {item.gender}</Text>
                    <Text style={styles.patientSymptoms} numberOfLines={2}>{item.symptoms}</Text>
                    <Text style={styles.patientVitals}>{item.vitals}</Text>
                    {item.ashaNotes ? <Text style={styles.patientNotes} numberOfLines={1}>"{item.ashaNotes}"</Text> : null}
                    <Pressable style={[styles.reviewBtn, isActive && styles.reviewBtnActive]} onPress={() => setSelectedCase(item)}>
                      <Text style={styles.reviewBtnText}>{isActive ? '● Reviewing' : t('reviewConsult')}</Text>
                    </Pressable>
                    {item.status === 'Consultation Completed' && (
                      <Pressable style={styles.completeBtn} onPress={() => handleCompleteCase(item)}>
                        <Text style={styles.completeBtnText}>{t('complete')}</Text>
                      </Pressable>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          <ScrollView style={styles.consultCol} contentContainerStyle={styles.consultContent} showsVerticalScrollIndicator={false}>
            {!selectedCase ? (
              <View style={styles.consultEmpty}>
                <Text style={styles.consultEmptyIcon}>🩺</Text>
                <Text style={styles.consultEmptyTitle}>No case selected</Text>
                <Text style={styles.consultEmptyBody}>Select a patient from the queue on the left to begin a consultation.</Text>
              </View>
            ) : (
              <View>
                <View style={styles.consultPanelHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.consultPatientName}>{selectedCase.patientName}</Text>
                    <Text style={styles.consultPatientMeta}>{selectedCase.age}y · {selectedCase.gender}</Text>
                  </View>
                  <View style={[styles.consultStatusBadge, { backgroundColor: selectedCase.status === 'Completed' ? '#dcfce7' : '#fef3c7' }]}>
                    <Text style={[styles.consultStatusText, { color: selectedCase.status === 'Completed' ? '#15803d' : '#92400e' }]}>
                      {selectedCase.status === 'Consultation Completed' ? t('submittedPrescription') : selectedCase.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoBlock}>
                  <Text style={styles.infoBlockTitle}>Medical History & Vitals</Text>
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>Known Conditions</Text><Text style={styles.infoValue}>{selectedCase.history || '—'}</Text></View>
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>Current Vitals</Text><Text style={styles.vitalsValue}>{selectedCase.vitals}</Text></View>
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>Symptoms</Text><Text style={styles.infoValue}>{selectedCase.symptoms}</Text></View>
                  {selectedCase.ashaNotes ? <View style={styles.infoRow}><Text style={styles.infoLabel}>ASHA Notes</Text><Text style={styles.notesItalic}>"{selectedCase.ashaNotes}"</Text></View> : null}
                </View>

                <Text style={styles.panelSection}>Communication Channel</Text>
                <View style={styles.commRow}>
                  <Pressable style={[styles.commBtn, { backgroundColor: '#0284c7' }]} onPress={() => handleStartCall('Video')}><Text style={styles.commBtnIcon}>📹</Text><Text style={styles.commBtnText}>Video</Text></Pressable>
                  <Pressable style={[styles.commBtn, { backgroundColor: '#0d9488' }]} onPress={() => handleStartCall('Audio')}><Text style={styles.commBtnIcon}>📞</Text><Text style={styles.commBtnText}>Audio</Text></Pressable>
                  <Pressable style={[styles.commBtn, { backgroundColor: '#475569' }]} onPress={() => handleStartCall('Text Fallback')}><Text style={styles.commBtnIcon}>💬</Text><Text style={styles.commBtnText}>Text Chat</Text></Pressable>
                </View>

                <Text style={styles.panelSection}>{t('prescription')}</Text>
                <View style={styles.formBlock}>
                  <Text style={styles.fieldLabel}>{t('drug')}</Text>
                  <TextInput style={styles.fieldInput} placeholder="e.g. Amoxicillin" placeholderTextColor="#94a3b8" value={drugName} onChangeText={setDrugName} />
                  <Text style={styles.fieldLabel}>{t('dosage')}</Text>
                  <TextInput style={styles.fieldInput} placeholder="e.g. 500mg" placeholderTextColor="#94a3b8" value={dosage} onChangeText={setDosage} />
                  <Text style={styles.fieldLabel}>{t('frequency')}</Text>
                  <TextInput style={styles.fieldInput} placeholder="e.g. 5 days, Twice daily" placeholderTextColor="#94a3b8" value={duration} onChangeText={setDuration} />
                  <Text style={styles.fieldLabel}>{t('instructions')}</Text>
                  <TextInput style={[styles.fieldInput, styles.fieldInputMulti]} placeholder="Additional notes" placeholderTextColor="#94a3b8" value={instructions} onChangeText={setInstructions} multiline numberOfLines={2} />
                  <Pressable style={[styles.actionBtn, { backgroundColor: '#16a34a' }, selectedCase.status === 'Completed' && styles.actionBtnDisabled]} onPress={handleIssuePrescription} disabled={selectedCase.status === 'Completed'}>
                    <Text style={styles.actionBtnText}>{selectedCase.status === 'Completed' ? t('prescriptionCompleted') : t('issuePrescription')}</Text>
                  </Pressable>
                </View>

                {selectedCase.prescriptions?.length > 0 && (
                  <View style={styles.rxList}>
                    <Text style={styles.rxListTitle}>{t('submittedPrescription')}</Text>
                    {selectedCase.prescriptions.map((rx: any, idx: number) => (
                      <View key={rx.id || idx} style={styles.rxItem}>
                        <Text style={styles.rxItemDrug}>{rx.medicine_name}</Text>
                        <Text style={styles.rxItemDetail}>{rx.dosage} · {rx.duration || rx.frequency}{rx.instructions ? ` · ${rx.instructions}` : ''}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {selectedCase.status !== 'Completed' && (
                  <Pressable style={[styles.actionBtn, { backgroundColor: '#475569', marginTop: 8 }]} onPress={() => handleCompleteCase()}>
                    <Text style={styles.actionBtnText}>{t('complete')}</Text>
                  </Pressable>
                )}

                <Text style={styles.panelSection}>Upward Referral</Text>
                <View style={styles.formBlock}>
                  <Text style={styles.fieldLabel}>Referral Facility</Text>
                  <TextInput style={styles.fieldInput} placeholder="e.g. Community Health Center" placeholderTextColor="#94a3b8" value={referralFacility} onChangeText={setReferralFacility} />
                  <Text style={styles.fieldLabel}>Reason for Escalation</Text>
                  <TextInput style={[styles.fieldInput, styles.fieldInputMulti]} placeholder="Clinical reason for upward referral" placeholderTextColor="#94a3b8" value={referralReason} onChangeText={setReferralReason} multiline numberOfLines={2} />
                  <Pressable style={[styles.actionBtn, { backgroundColor: '#b91c1c' }]} onPress={handleCreateReferral}>
                    <Text style={styles.actionBtnText}>Submit Tracked Upward Referral</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {/* ── FOLLOW-UPS TAB ── */}
      {activeTab === 'followups' && (
        <ScrollView contentContainerStyle={styles.singleColContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.singleColHeader}>High-Risk Patient Follow-up Tracker</Text>
          {followUps.map((fu) => {
            const badge = riskBadgeStyle(fu.risk);
            return (
              <View key={fu.id} style={styles.historyCard}>
                <View style={styles.rowBetween}>
                  <Text style={styles.historyCardName}>{fu.patientName}</Text>
                  <View style={[styles.riskBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                    <Text style={[styles.riskBadgeText, { color: badge.text }]}>{fu.risk} Risk</Text>
                  </View>
                </View>
                <Text style={styles.historyCardMeta}>Scheduled: {fu.dueDate}</Text>
                <View style={[styles.statusPill, { backgroundColor: fu.ashaCompleted ? '#f0fdf4' : '#fef2f2', borderColor: fu.ashaCompleted ? '#bbf7d0' : '#fecaca' }]}>
                  <Text style={{ color: fu.ashaCompleted ? '#16a34a' : '#dc2626', fontWeight: '700', fontSize: 13 }}>
                    {fu.ashaCompleted ? '✓ ASHA Completed Visit' : '⚠ Pending ASHA Verification'}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* ── HISTORY TAB ── */}
      {activeTab === 'history' && (
        <ScrollView contentContainerStyle={styles.singleColContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.singleColHeader}>Active Tracked Referrals</Text>
          {referrals.map((ref) => (
            <View key={ref.id} style={styles.historyCard}>
              <Text style={styles.historyCardName}>{ref.patientName}</Text>
              <Text style={styles.historyCardMeta}>Target: {ref.facility}</Text>
              <Text style={styles.historyCardMeta}>Reason: {ref.reason}</Text>
              <View style={styles.referralStatusRow}><Text style={styles.referralStatusText}>● {ref.status}</Text></View>
            </View>
          ))}
          <Text style={[styles.singleColHeader, { marginTop: 20 }]}>Reviewable Past Cases Archive</Text>
          {completedCases.map((item) => (
            <View key={item.id} style={styles.historyCard}>
              <View style={styles.rowBetween}>
                <Text style={styles.historyCardName}>{item.patientName}</Text>
                <View style={[styles.riskBadge, { backgroundColor: '#dcfce7', borderColor: '#bbf7d0' }]}>
                  <Text style={[styles.riskBadgeText, { color: '#15803d' }]}>{t('completed')}</Text>
                </View>
              </View>
              <Text style={styles.historyCardMeta}>Symptoms: {item.symptoms}</Text>
              {item.prescriptions?.map((rx: any, idx: number) => (
                <Text key={rx.id || idx} style={styles.notesItalic}>Rx: {rx.medicine_name} ({rx.dosage})</Text>
              ))}
              <Pressable style={styles.secondaryBtn} onPress={() => { setSelectedCase(item); setActiveTab('queue'); }}>
                <Text style={styles.secondaryBtnText}>View Case Details</Text>
              </Pressable>
            </View>
          ))}
          <View style={styles.historyCard}>
            <Text style={styles.historyCardName}>Anand Kumar, 54y</Text>
            <Text style={styles.historyCardMeta}>Completed Consultation Log · Date: Yesterday</Text>
            <Text style={styles.notesItalic}>Diagnosis: Mild Acute Gastroenteritis. Prescribed ORS & Zinc. Follow-up resolved.</Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f7fa' },
  header: { paddingTop: 48, paddingBottom: 14, paddingHorizontal: 20, backgroundColor: '#143b61', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#ffffff', letterSpacing: 0.3 },
  headerSubtitle: { fontSize: 12, color: '#93c5fd', marginTop: 2, marginBottom: 6 },
  headerRight: { alignItems: 'flex-end', gap: 6 },
  onlineStatus: { fontSize: 12, fontWeight: '800' },
  logoutBtn: { marginTop: 4, backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  logoutBtnText: { color: '#fca5a5', fontSize: 12, fontWeight: '700' },
  noticeBanner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)', gap: 8, minHeight: 40 },
  noticeLabel: { fontSize: 11, fontWeight: '800', color: '#64748b', flexShrink: 0 },
  noticeText: { fontSize: 12, fontWeight: '600', flex: 1 },
  statRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, gap: 8, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2ecf3' },
  statTile: { flex: 1, borderRadius: 10, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '900', lineHeight: 26 },
  statLabel: { fontSize: 10, fontWeight: '700', textAlign: 'center', marginTop: 2, lineHeight: 13 },
  tabBar: { flexDirection: 'row', backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#dde8f0' },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 11, position: 'relative' },
  tabItemActive: {},
  tabItemText: { fontSize: 12, fontWeight: '700', color: '#64748b', textAlign: 'center' },
  tabItemTextActive: { color: '#0d9488', fontWeight: '800' },
  tabUnderline: { position: 'absolute', bottom: 0, left: 12, right: 12, height: 3, borderRadius: 2, backgroundColor: '#0d9488' },
  queueContainer: { flex: 1, flexDirection: 'row' },
  patientListCol: { width: '38%', backgroundColor: '#f0f5f9', borderRightWidth: 1, borderRightColor: '#dde8f0' },
  patientListContent: { padding: 10, paddingBottom: 30 },
  colHeader: { fontSize: 12, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10, paddingHorizontal: 4 },
  patientCard: { backgroundColor: '#ffffff', borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#dde8f0', overflow: 'hidden', shadowColor: '#143b61', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1, flexDirection: 'row' },
  patientCardActive: { borderColor: '#0d9488', shadowOpacity: 0.12, shadowRadius: 12, elevation: 3 },
  activeStrip: { width: 4, backgroundColor: '#0d9488', flexShrink: 0 },
  patientCardInner: { flex: 1, padding: 12 },
  patientName: { fontSize: 13, fontWeight: '800', color: '#143b61', flex: 1, marginRight: 6 },
  patientMeta: { fontSize: 11, color: '#64748b', marginTop: 2 },
  patientSymptoms: { fontSize: 11, color: '#334155', marginTop: 5, lineHeight: 15 },
  patientVitals: { fontSize: 11, fontWeight: '700', color: '#0284c7', marginTop: 4 },
  patientNotes: { fontSize: 10, fontStyle: 'italic', color: '#64748b', marginTop: 3 },
  reviewBtn: { marginTop: 8, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 7, paddingVertical: 7, alignItems: 'center' },
  reviewBtnActive: { backgroundColor: '#0d9488', borderColor: '#0d9488' },
  reviewBtnText: { fontSize: 11, fontWeight: '800', color: '#0d9488' },
  completeBtn: { marginTop: 6, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 7, paddingVertical: 6, alignItems: 'center' },
  completeBtnText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  emptyState: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 16 },
  emptyStateIcon: { fontSize: 28, marginBottom: 8 },
  emptyStateText: { fontSize: 14, fontWeight: '700', color: '#334155', textAlign: 'center' },
  emptyStateSub: { fontSize: 12, color: '#64748b', marginTop: 4, textAlign: 'center' },
  riskBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1, flexShrink: 0 },
  riskBadgeText: { fontSize: 10, fontWeight: '800' },
  consultCol: { flex: 1, backgroundColor: '#f8fafc' },
  consultContent: { padding: 16, paddingBottom: 36 },
  consultEmpty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 },
  consultEmptyIcon: { fontSize: 44, marginBottom: 14 },
  consultEmptyTitle: { fontSize: 18, fontWeight: '800', color: '#334155', marginBottom: 8 },
  consultEmptyBody: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 20 },
  consultPanelHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#dde8f0' },
  consultPatientName: { fontSize: 20, fontWeight: '900', color: '#143b61' },
  consultPatientMeta: { fontSize: 13, color: '#64748b', marginTop: 2 },
  consultStatusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginLeft: 10, flexShrink: 0 },
  consultStatusText: { fontSize: 11, fontWeight: '800' },
  infoBlock: { backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#dde8f0', padding: 14, marginBottom: 14 },
  infoBlockTitle: { fontSize: 12, fontWeight: '800', color: '#143b61', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  infoRow: { marginBottom: 8 },
  infoLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 2 },
  infoValue: { fontSize: 13, color: '#1e293b', lineHeight: 18 },
  vitalsValue: { fontSize: 13, fontWeight: '800', color: '#0284c7', lineHeight: 18 },
  notesItalic: { fontSize: 12, fontStyle: 'italic', color: '#475569', lineHeight: 17 },
  panelSection: { fontSize: 13, fontWeight: '800', color: '#143b61', marginTop: 16, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.4 },
  commRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  commBtn: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center', gap: 4 },
  commBtnIcon: { fontSize: 16 },
  commBtnText: { color: '#ffffff', fontSize: 11, fontWeight: '800' },
  formBlock: { backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#dde8f0', padding: 14, marginBottom: 4 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 4, marginTop: 4 },
  fieldInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: '#1e293b', marginBottom: 8 },
  fieldInputMulti: { minHeight: 60, textAlignVertical: 'top' },
  actionBtn: { paddingVertical: 13, borderRadius: 9, alignItems: 'center', marginTop: 4, minHeight: 48 },
  actionBtnDisabled: { opacity: 0.5 },
  actionBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  rxList: { backgroundColor: '#f0fdf4', borderRadius: 10, borderWidth: 1, borderColor: '#bbf7d0', padding: 12, marginTop: 10, marginBottom: 4 },
  rxListTitle: { fontSize: 11, fontWeight: '800', color: '#15803d', marginBottom: 8, textTransform: 'uppercase' },
  rxItem: { marginBottom: 6 },
  rxItemDrug: { fontSize: 13, fontWeight: '700', color: '#166534' },
  rxItemDetail: { fontSize: 11, color: '#166534', opacity: 0.8 },
  singleColContent: { padding: 16, paddingBottom: 36, maxWidth: 800, width: '100%', alignSelf: 'center' },
  singleColHeader: { fontSize: 16, fontWeight: '800', color: '#143b61', marginBottom: 12 },
  historyCard: { backgroundColor: '#ffffff', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#dde8f0', shadowColor: '#143b61', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  historyCardName: { fontSize: 15, fontWeight: '800', color: '#143b61', flex: 1, marginRight: 8 },
  historyCardMeta: { fontSize: 12, color: '#64748b', marginTop: 4, lineHeight: 17 },
  statusPill: { marginTop: 10, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, alignSelf: 'flex-start' },
  referralStatusRow: { marginTop: 8 },
  referralStatusText: { fontSize: 12, fontWeight: '800', color: '#0284c7' },
  secondaryBtn: { marginTop: 10, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', paddingVertical: 9, borderRadius: 8, alignItems: 'center' },
  secondaryBtnText: { fontSize: 12, fontWeight: '700', color: '#334155' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
