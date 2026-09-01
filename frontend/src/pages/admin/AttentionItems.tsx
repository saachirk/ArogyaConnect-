import { useEffect, useState } from 'react';
import { dashboardApi } from '../../api/dashboard';
import type { AttentionItem } from '../../api/dashboard';
import AppShell from '../../components/Layout/AppShell';
import Spinner from '../../components/ui/Spinner';

export default function AttentionItems() {
  const [items, setItems] = useState<AttentionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    dashboardApi.attention()
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter ? items.filter(i => i.district?.toLowerCase().includes(filter.toLowerCase())) : items;

  const getIcon = (kind: string) => {
    switch (kind) {
      case 'STALE_REFERRAL': return '⚠️';
      case 'OVERDUE_FOLLOWUP': return '⏰';
      case 'CONNECTIVITY': return '📡';
      case 'LARGE_QUEUE': return '👥';
      default: return '❕';
    }
  };

  return (
    <AppShell title="Attention Items">
      <div className="page-header">
        <div className="page-header-text">
          <h2>System Alerts & Attention Items</h2>
          <p>Prioritized issues requiring administrative review</p>
        </div>
      </div>

      <div className="search-wrapper" style={{ maxWidth: 300, marginBottom: 20 }}>
        <span className="search-icon">🔍</span>
        <input className="search-input" placeholder="Filter by district..." value={filter} onChange={e => setFilter(e.target.value)} />
      </div>

      {loading ? (
        <Spinner center />
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">✅</div>
          <h3>All clear</h3>
          <p>No active attention items.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {filtered.map((item, idx) => (
            <div key={`${item.entity_type}-${item.entity_id}-${idx}`} className="card" style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{ fontSize: '2rem', padding: '12px', background: 'rgba(15,23,42,0.6)', borderRadius: 12 }}>
                {getIcon(item.kind)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <h3 style={{ margin: 0, color: item.severity === 'HIGH' ? '#ef4444' : 'var(--text-heading)', fontSize: '1.1rem' }}>
                    {item.title}
                  </h3>
                  <span className={`badge ${item.severity === 'HIGH' ? 'badge-red' : 'badge-orange'}`}>
                    {item.severity}
                  </span>
                </div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>{item.detail}</p>
                <div style={{ display: 'flex', gap: 12, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {item.district && <span>📍 {item.district}</span>}
                  {item.facility_id && <span>🏥 Facility #{item.facility_id}</span>}
                  <span style={{ textTransform: 'uppercase' }}>🔖 {item.entity_type} {item.entity_id}</span>
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" style={{ alignSelf: 'center' }}>Review →</button>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
