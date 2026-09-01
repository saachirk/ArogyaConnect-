import { useEffect, useState } from 'react';
import { facilitiesApi } from '../../api/facilities';
import type { Facility } from '../../api/facilities';
import AppShell from '../../components/Layout/AppShell';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';

export default function FacilitiesMap() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    facilitiesApi.list()
      .then(setFacilities)
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell title="Facilities Map">
      <div className="page-header">
        <div className="page-header-text">
          <h2>Healthcare Facilities Directory</h2>
          <p>Network connectivity and queue status</p>
        </div>
      </div>

      {loading ? (
        <Spinner center />
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name / Type</th>
                <th>Location</th>
                <th>Network</th>
                <th>Queue</th>
                <th>Specialists</th>
              </tr>
            </thead>
            <tbody>
              {facilities.map(f => (
                <tr key={f.id}>
                  <td className="td-muted">#{f.id}</td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{f.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{f.type}</div>
                  </td>
                  <td>
                    <div>{f.village}</div>
                    <div className="td-muted">{f.district}, {f.state}</div>
                  </td>
                  <td><Badge type="connectivity" value={f.connectivity_status} /></td>
                  <td>
                    <span style={{ fontWeight: 500, color: f.queue_length > 5 ? '#ef4444' : 'var(--text-primary)' }}>
                      {f.queue_length} waiting
                    </span>
                  </td>
                  <td className="td-muted">{f.specialist_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
