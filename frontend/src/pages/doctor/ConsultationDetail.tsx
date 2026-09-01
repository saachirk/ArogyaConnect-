import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { consultationsApi } from '../../api/consultations';
import AppShell from '../../components/Layout/AppShell';
import Spinner from '../../components/ui/Spinner';

export default function ConsultationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [rx, setRx] = useState({
    medicine_name: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      await consultationsApi.addPrescription({
        consultation_id: Number(id),
        ...rx,
      });
      setSuccess(true);
      setTimeout(() => navigate('/queue'), 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save prescription');
      setLoading(false);
    }
  };

  const set = (k: string, v: string) => setRx(r => ({ ...r, [k]: v }));

  return (
    <AppShell title="Write Prescription">
      <div className="page-header">
        <div className="page-header-text">
          <h2>Prescription for Token #{id}</h2>
          <p>Add medication to the patient's longitudinal record</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>← Back</button>
      </div>

      <div className="card" style={{ maxWidth: 680 }}>
        {success ? (
          <div className="alert alert-success" style={{ margin: 0, justifyContent: 'center' }}>
            ✅ Prescription saved successfully. Returning to queue...
          </div>
        ) : (
          <form id="rx-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="rx-med">Medicine Name *</label>
              <input id="rx-med" className="form-input" required
                placeholder="e.g. Paracetamol" value={rx.medicine_name}
                onChange={e => set('medicine_name', e.target.value)} />
            </div>
            
            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label" htmlFor="rx-dose">Dosage *</label>
                <input id="rx-dose" className="form-input" required
                  placeholder="e.g. 500mg" value={rx.dosage}
                  onChange={e => set('dosage', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="rx-freq">Frequency *</label>
                <input id="rx-freq" className="form-input" required
                  placeholder="e.g. 1-0-1" value={rx.frequency}
                  onChange={e => set('frequency', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="rx-dur">Duration *</label>
                <input id="rx-dur" className="form-input" required
                  placeholder="e.g. 5 days" value={rx.duration}
                  onChange={e => set('duration', e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="rx-inst">Special Instructions</label>
              <textarea id="rx-inst" className="form-textarea"
                placeholder="e.g. Take after meals" value={rx.instructions}
                onChange={e => set('instructions', e.target.value)} />
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <button id="rx-submit" type="submit" className="btn btn-primary btn-lg" disabled={loading}>
              {loading ? <Spinner size="sm" /> : '💊 Save Prescription'}
            </button>
          </form>
        )}
      </div>
    </AppShell>
  );
}
