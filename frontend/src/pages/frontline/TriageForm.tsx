import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { patientsApi } from '../../api/patients';
import type { Patient } from '../../api/patients';
import { triageApi } from '../../api/triage';
import type { TriageCreate, TriageResult } from '../../api/triage';
import AppShell from '../../components/Layout/AppShell';
import Spinner from '../../components/ui/Spinner';

const SPECIALIST_TYPES = [
  'General Medicine', 'Paediatrics', 'Gynaecology',
  'Orthopaedics', 'Dermatology', 'Ophthalmology', 'ENT',
];

export default function TriageForm() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const prefillPatientId = params.get('patient_id');

  const [searchQ, setSearchQ] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const [form, setForm] = useState<Partial<TriageCreate>>({
    chief_complaint: '',
    duration: '',
    symptoms: '',
    existing_conditions: '',
    current_medications: '',
    red_flag_symptoms: '',
    notes: '',
    enqueue: true,
    specialist_type: 'General Medicine',
  });

  const [result, setResult] = useState<TriageResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill patient if ID is in URL
  useEffect(() => {
    if (prefillPatientId) {
      patientsApi.get(Number(prefillPatientId))
        .then(setSelectedPatient)
        .catch(() => {});
    }
  }, [prefillPatientId]);

  const handleSearch = async (val: string) => {
    setSearchQ(val);
    if (!val.trim()) { setPatients([]); return; }
    setSearchLoading(true);
    const res = await patientsApi.search(val).catch(() => []);
    setPatients(res);
    setSearchLoading(false);
  };

  const set = (k: keyof TriageCreate, v: unknown) =>
    setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) { setError('Please select a patient'); return; }
    setSubmitting(true);
    setError('');
    try {
      const res = await triageApi.submit({
        ...(form as TriageCreate),
        patient_id: selectedPatient.id,
      });
      setResult(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    const level = result.clinical_record.triage_level;
    return (
      <AppShell title="Triage Result">
        <div className="card" style={{ maxWidth: 520, textAlign: 'center' }}>
          <div style={{ marginBottom: 16 }}>
            <div className={`triage-level ${level}`} style={{ display: 'inline-flex', margin: '0 auto 12px' }}>
              {level === 'RED' ? '🔴' : level === 'ORANGE' ? '🟠' : '🟢'} Triage Level: {level}
            </div>
            <h3 style={{ color: 'var(--text-heading)' }}>{selectedPatient?.name}</h3>
          </div>

          {result.token_number && (
            <div style={{ background: 'rgba(13,148,136,0.1)', border: '1px solid rgba(13,148,136,0.3)', borderRadius: 10, padding: '16px 20px', marginBottom: 16 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>TOKEN NUMBER</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--brand-teal-light)', fontFamily: 'var(--font-heading)' }}>
                {result.token_number}
              </div>
              {result.estimated_wait_minutes !== null && (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                  Estimated wait: ~{result.estimated_wait_minutes} min
                </div>
              )}
            </div>
          )}

          <div className="alert alert-warning" style={{ textAlign: 'left', fontSize: '0.78rem' }}>
            ⚕️ {result.disclaimer}
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16 }}>
            <button id="triage-done-btn" className="btn btn-primary" onClick={() => navigate('/dashboard')}>
              ✓ Done
            </button>
            <button className="btn btn-secondary" onClick={() => {
              setResult(null);
              setSelectedPatient(null);
              setForm({ chief_complaint: '', duration: '', symptoms: '', existing_conditions: '', current_medications: '', red_flag_symptoms: '', notes: '', enqueue: true, specialist_type: 'General Medicine' });
            }}>
              Submit Another
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Triage Assessment">
      <div className="page-header">
        <div className="page-header-text">
          <h2>Submit Triage Assessment</h2>
          <p>Vitals and chief complaint → triage level + queue token</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>← Back</button>
      </div>

      <div style={{ maxWidth: 680 }}>
        {/* Patient selector */}
        {!selectedPatient ? (
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-title" style={{ marginBottom: 12 }}>Select Patient</div>
            <div className="search-wrapper">
              <span className="search-icon">🔍</span>
              <input id="triage-patient-search" className="search-input"
                placeholder="Search patient by name, phone, or health ID…"
                value={searchQ} onChange={e => handleSearch(e.target.value)} />
            </div>
            {searchLoading && <Spinner />}
            {patients.length > 0 && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {patients.map(p => (
                  <div key={p.id} id={`triage-patient-${p.id}`}
                    style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(15,23,42,0.6)', border: '1px solid var(--border)', cursor: 'pointer', transition: 'border-color var(--transition)' }}
                    onClick={() => { setSelectedPatient(p); setPatients([]); setSearchQ(''); }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--brand-teal)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    <div style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{p.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {p.health_id} · {p.age}y · {p.village}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: 10, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              New patient? <span style={{ color: 'var(--brand-teal-light)', cursor: 'pointer' }} onClick={() => navigate('/register')}>Register first →</span>
            </div>
          </div>
        ) : (
          <div className="alert alert-info" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>📋 Patient: <strong>{selectedPatient.name}</strong> · {selectedPatient.health_id} · {selectedPatient.age}y</span>
            <button className="btn btn-secondary btn-sm" onClick={() => setSelectedPatient(null)}>Change</button>
          </div>
        )}

        {/* Triage form */}
        <form id="triage-form" onSubmit={handleSubmit}>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title" style={{ marginBottom: 16 }}>Chief Complaint & Symptoms</div>
            <div className="form-group">
              <label className="form-label" htmlFor="triage-complaint">Chief Complaint *</label>
              <input id="triage-complaint" className="form-input" required
                placeholder="e.g. Fever with chills" value={form.chief_complaint || ''}
                onChange={e => set('chief_complaint', e.target.value)} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="triage-duration">Duration</label>
                <input id="triage-duration" className="form-input"
                  placeholder="e.g. 3 days" value={form.duration || ''}
                  onChange={e => set('duration', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="triage-specialist">Specialist Type</label>
                <select id="triage-specialist" className="form-select"
                  value={form.specialist_type} onChange={e => set('specialist_type', e.target.value)}>
                  {SPECIALIST_TYPES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="triage-symptoms">Additional Symptoms</label>
              <textarea id="triage-symptoms" className="form-textarea"
                placeholder="Describe symptoms in detail…" value={form.symptoms || ''}
                onChange={e => set('symptoms', e.target.value)} />
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title" style={{ marginBottom: 16 }}>Vitals</div>
            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label" htmlFor="triage-temp">Temperature (°C)</label>
                <input id="triage-temp" className="form-input" type="number" step="0.1"
                  placeholder="37.0"
                  onChange={e => set('temperature', e.target.value ? Number(e.target.value) : null)} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="triage-sbp">Systolic BP</label>
                <input id="triage-sbp" className="form-input" type="number"
                  placeholder="120"
                  onChange={e => set('systolic_bp', e.target.value ? Number(e.target.value) : null)} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="triage-dbp">Diastolic BP</label>
                <input id="triage-dbp" className="form-input" type="number"
                  placeholder="80"
                  onChange={e => set('diastolic_bp', e.target.value ? Number(e.target.value) : null)} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="triage-pulse">Pulse (bpm)</label>
                <input id="triage-pulse" className="form-input" type="number"
                  placeholder="72"
                  onChange={e => set('pulse', e.target.value ? Number(e.target.value) : null)} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="triage-spo2">SpO₂ (%)</label>
                <input id="triage-spo2" className="form-input" type="number" min={0} max={100}
                  placeholder="98"
                  onChange={e => set('spo2', e.target.value ? Number(e.target.value) : null)} />
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title" style={{ marginBottom: 16 }}>Medical History</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="triage-conditions">Existing Conditions</label>
                <textarea id="triage-conditions" className="form-textarea"
                  placeholder="e.g. Diabetes, Hypertension" value={form.existing_conditions || ''}
                  onChange={e => set('existing_conditions', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="triage-medications">Current Medications</label>
                <textarea id="triage-medications" className="form-textarea"
                  placeholder="e.g. Metformin 500mg" value={form.current_medications || ''}
                  onChange={e => set('current_medications', e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="triage-redflags">⚠️ Red Flag Symptoms</label>
              <input id="triage-redflags" className="form-input"
                placeholder="e.g. Chest pain, unconsciousness, severe bleeding"
                value={form.red_flag_symptoms || ''}
                onChange={e => set('red_flag_symptoms', e.target.value)} />
              <div className="form-hint">Mention any life-threatening symptoms for immediate escalation</div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="triage-notes">Notes</label>
              <textarea id="triage-notes" className="form-textarea"
                placeholder="Additional observations…" value={form.notes || ''}
                onChange={e => set('notes', e.target.value)} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input id="triage-enqueue" type="checkbox"
                checked={form.enqueue ?? true}
                onChange={e => set('enqueue', e.target.checked)} />
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Auto-enqueue for consultation after triage
              </span>
            </label>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <button id="triage-submit-btn" type="submit" className="btn btn-primary btn-lg"
            disabled={submitting || !selectedPatient}>
            {submitting ? <><Spinner size="sm" /> Submitting…</> : '🩺 Submit Triage Assessment'}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
