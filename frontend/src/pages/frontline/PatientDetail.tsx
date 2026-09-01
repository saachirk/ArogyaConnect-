import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { patientsApi } from '../../api/patients';
import type { Patient } from '../../api/patients';
import AppShell from '../../components/Layout/AppShell';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';

interface HistoryData {
  patient: Patient;
  clinical_records: {
    id: number; chief_complaint: string; triage_level: string;
    temperature: number | null; systolic_bp: number | null; diastolic_bp: number | null;
    pulse: number | null; spo2: number | null; symptoms: string;
    existing_conditions: string; current_medications: string;
    red_flag_symptoms: string; notes: string; created_at: string;
  }[];
  consultations: { id: number; token_number: string; status: string; priority: string; doctor_id: number | null; created_at: string; completed_at: string | null }[];
  referrals: { id: number; status: string; reason: string; priority: string; created_at: string }[];
  followups: { id: number; status: string; due_date: string; notes: string }[];
  prescriptions: { id: number; medicine_name: string; dosage: string; frequency: string; duration: string; instructions: string }[];
  migrant_status: boolean;
}

type Tab = 'clinical' | 'consultations' | 'referrals' | 'followups' | 'prescriptions';

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [history, setHistory] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('clinical');

  useEffect(() => {
    if (!id) return;
    patientsApi.history(Number(id))
      .then(d => setHistory(d as unknown as HistoryData))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <AppShell title="Patient Detail"><Spinner center /></AppShell>;
  if (!history) return <AppShell title="Patient Detail"><div className="alert alert-error">Patient not found</div></AppShell>;

  const p = history.patient;

  return (
    <AppShell title={`Patient — ${p.name}`}>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>← Back</button>
          <div className="page-header-text">
            <h2>{p.name}</h2>
            <p style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <code style={{ fontSize: '0.8rem', color: 'var(--brand-teal-light)' }}>{p.health_id}</code>
              <Badge type="gender" value={p.gender} />
              <Badge type="migrant" value={String(p.migrant_status)} />
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button id="patient-triage-btn" className="btn btn-primary" onClick={() => navigate(`/triage?patient_id=${p.id}`)}>
            🩺 New Triage
          </button>
        </div>
      </div>

      {/* Patient info card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
          {[
            { label: 'Age', value: `${p.age} years` },
            { label: 'Phone', value: p.phone },
            { label: 'Village', value: p.village },
            { label: 'District', value: p.district },
            { label: 'State', value: p.state },
            { label: 'Language', value: p.preferred_language },
            { label: 'Registered', value: new Date(p.created_at).toLocaleDateString() },
          ].map(item => (
            <div key={item.label}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>{item.label}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500 }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {(['clinical', 'consultations', 'referrals', 'followups', 'prescriptions'] as Tab[]).map(t => (
          <button
            key={t}
            id={`tab-${t}`}
            className={`tab-btn${tab === t ? ' active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
            <span style={{ marginLeft: 4, fontSize: '0.75rem', opacity: 0.7 }}>
              ({t === 'clinical' ? history.clinical_records.length :
                t === 'consultations' ? history.consultations.length :
                t === 'referrals' ? history.referrals.length :
                t === 'followups' ? history.followups.length :
                history.prescriptions.length})
            </span>
          </button>
        ))}
      </div>

      {/* Clinical records */}
      {tab === 'clinical' && (
        history.clinical_records.length === 0 ? <EmptyTab icon="🩺" label="No clinical records yet" /> :
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {history.clinical_records.map(r => (
            <div key={r.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' }}>
                <div>
                  <strong style={{ color: 'var(--text-heading)' }}>{r.chief_complaint}</strong>
                  <span style={{ marginLeft: 8 }}><Badge type="triage" value={r.triage_level} /></span>
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{new Date(r.created_at).toLocaleString()}</span>
              </div>
              <div className="vitals-grid" style={{ marginBottom: 12 }}>
                {r.temperature && <VitalBox label="Temp" value={`${r.temperature}°C`} />}
                {r.systolic_bp && <VitalBox label="BP" value={`${r.systolic_bp}/${r.diastolic_bp}`} />}
                {r.pulse && <VitalBox label="Pulse" value={`${r.pulse} bpm`} />}
                {r.spo2 && <VitalBox label="SpO₂" value={`${r.spo2}%`} />}
              </div>
              {r.symptoms && <InfoRow label="Symptoms" value={r.symptoms} />}
              {r.existing_conditions && <InfoRow label="Conditions" value={r.existing_conditions} />}
              {r.current_medications && <InfoRow label="Medications" value={r.current_medications} />}
              {r.red_flag_symptoms && <InfoRow label="⚠️ Red Flags" value={r.red_flag_symptoms} />}
              {r.notes && <InfoRow label="Notes" value={r.notes} />}
            </div>
          ))}
        </div>
      )}

      {/* Consultations */}
      {tab === 'consultations' && (
        history.consultations.length === 0 ? <EmptyTab icon="📋" label="No consultations yet" /> :
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Token</th><th>Priority</th><th>Status</th><th>Created</th><th>Completed</th></tr></thead>
            <tbody>
              {history.consultations.map(c => (
                <tr key={c.id} id={`consult-row-${c.id}`}>
                  <td><code style={{ color: 'var(--brand-teal-light)' }}>{c.token_number}</code></td>
                  <td><Badge type="priority" value={c.priority} /></td>
                  <td><Badge type="status" value={c.status} /></td>
                  <td className="td-muted">{new Date(c.created_at).toLocaleDateString()}</td>
                  <td className="td-muted">{c.completed_at ? new Date(c.completed_at).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Referrals */}
      {tab === 'referrals' && (
        history.referrals.length === 0 ? <EmptyTab icon="↗️" label="No referrals" /> :
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Reason</th><th>Priority</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {history.referrals.map(r => (
                <tr key={r.id} id={`ref-row-${r.id}`}>
                  <td style={{ maxWidth: 260 }}>{r.reason}</td>
                  <td><Badge type="priority" value={r.priority} /></td>
                  <td><Badge type="referral" value={r.status} /></td>
                  <td className="td-muted">{new Date(r.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Follow-ups */}
      {tab === 'followups' && (
        history.followups.length === 0 ? <EmptyTab icon="📆" label="No follow-ups" /> :
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Due Date</th><th>Status</th><th>Notes</th></tr></thead>
            <tbody>
              {history.followups.map(f => (
                <tr key={f.id} id={`followup-row-${f.id}`}>
                  <td>{new Date(f.due_date).toLocaleDateString()}</td>
                  <td><Badge type="followup" value={f.status} /></td>
                  <td className="td-muted">{f.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Prescriptions */}
      {tab === 'prescriptions' && (
        history.prescriptions.length === 0 ? <EmptyTab icon="💊" label="No prescriptions" /> :
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {history.prescriptions.map(rx => (
            <div key={rx.id} className="card" id={`rx-${rx.id}`}>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-heading)', marginBottom: 6 }}>
                💊 {rx.medicine_name}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                <InfoRow label="Dosage" value={rx.dosage} />
                <InfoRow label="Frequency" value={rx.frequency} />
                <InfoRow label="Duration" value={rx.duration} />
              </div>
              {rx.instructions && <InfoRow label="Instructions" value={rx.instructions} />}
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function VitalBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="vital-card">
      <div className="vital-value">{value.split(' ')[0]}</div>
      <span className="vital-unit">{value.split(' ').slice(1).join(' ')}</span>
      <div className="vital-label">{label}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}: </span>
      <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{value}</span>
    </div>
  );
}

function EmptyTab({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <h3>{label}</h3>
    </div>
  );
}
