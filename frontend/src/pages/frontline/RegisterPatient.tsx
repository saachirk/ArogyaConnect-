import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { patientsApi } from '../../api/patients';
import type { Patient, PatientCreate } from '../../api/patients';
import AppShell from '../../components/Layout/AppShell';
import Spinner from '../../components/ui/Spinner';

type Step = 'form' | 'duplicate' | 'done';

const LANGUAGES = ['en', 'kn', 'hi', 'ta', 'te', 'ml'];
const DISTRICTS = [
  'Bengaluru Urban', 'Mysuru', 'Belagavi', 'Kalaburagi', 'Tumakuru',
  'Shivamogga', 'Vijayapura', 'Dakshina Kannada', 'Udupi', 'Dharwad',
];

export default function RegisterPatient() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('form');
  const [form, setForm] = useState<PatientCreate>({
    name: '', age: 0, gender: 'M', phone: '', village: '',
    district: DISTRICTS[0], state: 'Karnataka',
    preferred_language: 'en', migrant_status: false,
  });
  const [duplicates, setDuplicates] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<Patient | null>(null);

  const set = (k: keyof PatientCreate, v: unknown) =>
    setForm(f => ({ ...f, [k]: v }));

  const checkDuplicates = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await patientsApi.checkDuplicate({ name: form.name, phone: form.phone });
      if (res.possible_duplicates.length > 0) {
        setDuplicates(res.possible_duplicates);
        setStep('duplicate');
      } else {
        await doCreate();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Check failed');
    } finally {
      setLoading(false);
    }
  };

  const doCreate = async () => {
    setLoading(true);
    setError('');
    try {
      const p = await patientsApi.create(form);
      setCreated(p);
      setStep('done');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Registration failed');
      setStep('form');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    checkDuplicates();
  };

  return (
    <AppShell title="Register Patient">
      <div className="page-header">
        <div className="page-header-text">
          <h2>Register New Patient</h2>
          <p>Creates a portable longitudinal health record</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>← Back</button>
      </div>

      {step === 'form' && (
        <div className="card" style={{ maxWidth: 680 }}>
          <form id="register-patient-form" onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="reg-name">Full Name *</label>
                <input id="reg-name" className="form-input" required
                  placeholder="Patient full name" value={form.name}
                  onChange={e => set('name', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-phone">Phone *</label>
                <input id="reg-phone" className="form-input" required
                  placeholder="10-digit mobile" value={form.phone}
                  onChange={e => set('phone', e.target.value)} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="reg-age">Age *</label>
                <input id="reg-age" className="form-input" type="number" required min={0} max={120}
                  value={form.age || ''} onChange={e => set('age', Number(e.target.value))} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-gender">Gender *</label>
                <select id="reg-gender" className="form-select" value={form.gender}
                  onChange={e => set('gender', e.target.value)}>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="O">Other</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="reg-village">Village *</label>
                <input id="reg-village" className="form-input" required
                  placeholder="Village name" value={form.village}
                  onChange={e => set('village', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-district">District *</label>
                <select id="reg-district" className="form-select" value={form.district}
                  onChange={e => set('district', e.target.value)}>
                  {DISTRICTS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="reg-language">Preferred Language</label>
                <select id="reg-language" className="form-select" value={form.preferred_language}
                  onChange={e => set('preferred_language', e.target.value)}>
                  {LANGUAGES.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', paddingBottom: 4 }}>
                  <input id="reg-migrant" type="checkbox" style={{ width: 16, height: 16 }}
                    checked={form.migrant_status}
                    onChange={e => set('migrant_status', e.target.checked)} />
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Migrant Patient</span>
                </label>
              </div>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button id="reg-submit-btn" type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <><Spinner size="sm" /> Checking…</> : 'Register Patient →'}
              </button>
            </div>
          </form>
        </div>
      )}

      {step === 'duplicate' && (
        <div className="card" style={{ maxWidth: 680 }}>
          <div className="alert alert-warning" style={{ marginBottom: 16 }}>
            ⚠️ Possible duplicate records found for <strong>{form.name}</strong> / <strong>{form.phone}</strong>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {duplicates.map(d => (
              <div
                key={d.id}
                id={`dup-${d.id}`}
                style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(15,23,42,0.6)', border: '1px solid var(--border)', cursor: 'pointer' }}
                onClick={() => navigate(`/patients/${d.id}`)}
              >
                <div style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{d.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {d.health_id} · {d.age}y · {d.village}, {d.district} · {d.phone}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button id="dup-proceed-btn" className="btn btn-primary" disabled={loading}
              onClick={doCreate}>
              {loading ? <><Spinner size="sm" /> Creating…</> : 'Proceed — Create New Record'}
            </button>
            <button className="btn btn-secondary" onClick={() => setStep('form')}>← Edit Form</button>
          </div>
        </div>
      )}

      {step === 'done' && created && (
        <div className="card" style={{ maxWidth: 480, textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>✅</div>
          <h3 style={{ color: 'var(--text-heading)', marginBottom: 4 }}>Patient Registered!</h3>
          <p style={{ marginBottom: 4 }}>{created.name}</p>
          <code style={{ color: 'var(--brand-teal-light)', fontSize: '1rem' }}>{created.health_id}</code>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20 }}>
            <button id="reg-triage-btn" className="btn btn-primary"
              onClick={() => navigate(`/triage?patient_id=${created.id}`)}>
              🩺 Submit Triage
            </button>
            <button className="btn btn-secondary"
              onClick={() => navigate(`/patients/${created.id}`)}>
              View Record
            </button>
            <button className="btn btn-secondary"
              onClick={() => { setStep('form'); setForm({ name: '', age: 0, gender: 'M', phone: '', village: '', district: DISTRICTS[0], state: 'Karnataka', preferred_language: 'en', migrant_status: false }); }}>
              Register Another
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
