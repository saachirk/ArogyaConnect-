import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { consultationsApi } from '../../api/consultations';
import type { Consultation } from '../../api/consultations';
import AppShell from '../../components/Layout/AppShell';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import { useAuth } from '../../context/AuthContext';

export default function Queue() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [queue, setQueue] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    consultationsApi.getQueue({ doctor_id: user?.id })
      .then(setQueue)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [user?.id]);

  const setStatus = async (id: number, status: string) => {
    setUpdatingId(id);
    try {
      await consultationsApi.updateStatus(id, status);
      setQueue(q => q.map(c => c.id === id ? { ...c, status } : c).filter(c => status !== 'COMPLETED' || c.id !== id)); // optimistically remove completed from queue view
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <AppShell title="My Queue">
      <div className="page-header">
        <div className="page-header-text">
          <h2>Consultation Queue</h2>
          <p>Patients waiting for you at Facility #{user?.facility_id}</p>
        </div>
        <button className="btn btn-secondary" onClick={load}>🔄 Refresh</button>
      </div>

      {loading ? (
        <Spinner center />
      ) : queue.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3>Queue is empty</h3>
          <p>You have no waiting patients at the moment.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Token</th>
                <th>Patient Name</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Est. Wait</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {queue.map(c => (
                <tr key={c.id} id={`queue-row-${c.id}`}>
                  <td><code style={{ color: 'var(--brand-teal-light)' }}>{c.token_number}</code></td>
                  <td style={{ fontWeight: 600, color: 'var(--text-heading)' }}>
                    {c.patient_name ?? `Patient #${c.patient_id}`}
                  </td>
                  <td><Badge type="priority" value={c.priority} /></td>
                  <td><Badge type="status" value={c.status} /></td>
                  <td className="td-muted">
                    {c.estimated_wait_minutes} min
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => navigate(`/patients/${c.patient_id}`)}
                      >
                        📄 Record
                      </button>
                      
                      {c.status === 'WAITING' && (
                        <button
                          id={`start-${c.id}`}
                          className="btn btn-sm btn-primary"
                          disabled={updatingId === c.id}
                          onClick={() => setStatus(c.id, 'IN_PROGRESS')}
                        >
                          {updatingId === c.id ? <Spinner size="sm" /> : 'Start'}
                        </button>
                      )}
                      
                      {c.status === 'IN_PROGRESS' && (
                        <>
                           <button
                            id={`complete-${c.id}`}
                            className="btn btn-sm"
                            style={{ background: 'var(--status-completed)', color: '#fff', border: 'none' }}
                            disabled={updatingId === c.id}
                            onClick={() => setStatus(c.id, 'COMPLETED')}
                          >
                            {updatingId === c.id ? <Spinner size="sm" /> : '✓ Finish'}
                          </button>
                          <button
                            id={`rx-${c.id}`}
                            className="btn btn-sm btn-secondary"
                            onClick={() => navigate(`/consultations/${c.id}`)}
                          >
                            💊 Rx
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
