import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { patientsApi } from '../../api/patients';
import type { Patient } from '../../api/patients';
import AppShell from '../../components/Layout/AppShell';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';

export default function Patients() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    patientsApi.list()
      .then(setPatients)
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = async (val: string) => {
    setQ(val);
    if (!val.trim()) {
      setSearching(false);
      patientsApi.list().then(setPatients);
      return;
    }
    setSearching(true);
    const res = await patientsApi.search(val).catch(() => []);
    setPatients(res);
    setSearching(false);
  };

  return (
    <AppShell title="Patients">
      <div className="page-header">
        <div className="page-header-text">
          <h2>Patient Records</h2>
          <p>Longitudinal records — portable across facilities</p>
        </div>
        <button id="patients-register-btn" className="btn btn-primary" onClick={() => navigate('/register')}>
          ➕ Register Patient
        </button>
      </div>

      {/* Search */}
      <div className="search-wrapper" style={{ maxWidth: 400, marginBottom: 20 }}>
        <span className="search-icon">🔍</span>
        <input
          id="patients-search-input"
          type="text"
          className="search-input"
          placeholder="Search by name, phone, Health ID, village…"
          value={q}
          onChange={e => handleSearch(e.target.value)}
        />
      </div>

      {loading || searching ? (
        <Spinner center />
      ) : patients.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <h3>No patients found</h3>
          <p>Try a different search or register a new patient</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Health ID</th>
                <th>Name</th>
                <th>Age / Gender</th>
                <th>Phone</th>
                <th>Village</th>
                <th>District</th>
                <th>Status</th>
                <th>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {patients.map(p => (
                <tr
                  key={p.id}
                  id={`patient-row-${p.id}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/patients/${p.id}`)}
                >
                  <td>
                    <code style={{ fontSize: '0.78rem', color: 'var(--brand-teal-light)' }}>
                      {p.health_id}
                    </code>
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{p.name}</td>
                  <td>
                    {p.age} <Badge type="gender" value={p.gender} />
                  </td>
                  <td className="td-muted">{p.phone}</td>
                  <td>{p.village}</td>
                  <td className="td-muted">{p.district}</td>
                  <td>
                    <Badge type="migrant" value={String(p.migrant_status)} />
                  </td>
                  <td className="td-muted">
                    {new Date(p.updated_at).toLocaleDateString()}
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
