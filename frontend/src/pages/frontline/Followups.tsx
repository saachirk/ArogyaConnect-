import { useEffect, useState } from 'react';
import { followupsApi } from '../../api/followups';
import type { Followup } from '../../api/followups';
import AppShell from '../../components/Layout/AppShell';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';

type Bucket = 'today' | 'overdue' | 'upcoming' | 'all';

export default function Followups() {
  const [bucket, setBucket] = useState<Bucket>('today');
  const [followups, setFollowups] = useState<Followup[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const load = (b: Bucket) => {
    setLoading(true);
    followupsApi.list(b)
      .then(setFollowups)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(bucket); }, [bucket]);

  const markComplete = async (id: number) => {
    setUpdatingId(id);
    await followupsApi.update(id, { status: 'COMPLETED' }).catch(() => {});
    setFollowups(fs => fs.map(f => f.id === id ? { ...f, status: 'COMPLETED' } : f));
    setUpdatingId(null);
  };

  return (
    <AppShell title="Follow-ups">
      <div className="page-header">
        <div className="page-header-text">
          <h2>Follow-up Tasks</h2>
          <p>Track pending, overdue and upcoming patient follow-ups</p>
        </div>
      </div>

      <div className="tabs">
        {(['today', 'overdue', 'upcoming', 'all'] as Bucket[]).map(b => (
          <button key={b} id={`followup-tab-${b}`}
            className={`tab-btn${bucket === b ? ' active' : ''}`}
            onClick={() => setBucket(b)}>
            {b === 'today' ? '📅 Today' : b === 'overdue' ? '⚠️ Overdue' : b === 'upcoming' ? '📆 Upcoming' : '📋 All'}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner center />
      ) : followups.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3>No follow-ups in this bucket</h3>
          <p>All caught up!</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Patient</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Notes</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {followups.map(f => (
                <tr key={f.id} id={`followup-row-${f.id}`}>
                  <td style={{ fontWeight: 600, color: 'var(--text-heading)' }}>
                    {f.patient_name ?? `Patient #${f.patient_id}`}
                  </td>
                  <td>
                    <span style={{ color: f.status === 'OVERDUE' ? 'var(--triage-red)' : 'var(--text-primary)' }}>
                      {new Date(f.due_date).toLocaleDateString()}
                    </span>
                  </td>
                  <td><Badge type="followup" value={f.status} /></td>
                  <td className="td-muted" style={{ maxWidth: 260 }}>{f.notes || '—'}</td>
                  <td>
                    {f.status !== 'COMPLETED' && (
                      <button
                        id={`followup-complete-${f.id}`}
                        className="btn btn-sm btn-secondary"
                        disabled={updatingId === f.id}
                        onClick={() => markComplete(f.id)}
                      >
                        {updatingId === f.id ? <Spinner size="sm" /> : '✓ Complete'}
                      </button>
                    )}
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
