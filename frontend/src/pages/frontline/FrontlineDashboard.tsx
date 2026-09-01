import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../../api/dashboard';
import type { FrontlineDashboard as DashData } from '../../api/dashboard';
import AppShell from '../../components/Layout/AppShell';
import StatCard from '../../components/ui/StatCard';
import Spinner from '../../components/ui/Spinner';
import { useAuth } from '../../context/AuthContext';

export default function FrontlineDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.frontline()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell title="Frontline Dashboard">
      <div className="page-header">
        <div className="page-header-text">
          <h2>Welcome back, {user?.name?.split(' ')[0]} 👋</h2>
          <p>Here's what's happening at your facility today</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button id="dash-register-btn" className="btn btn-primary" onClick={() => navigate('/register')}>
            ➕ Register Patient
          </button>
          <button id="dash-triage-btn" className="btn btn-secondary" onClick={() => navigate('/triage')}>
            🩺 Triage
          </button>
        </div>
      </div>

      {loading ? (
        <Spinner center />
      ) : data ? (
        <>
          {data.offline_pending_sync > 0 && (
            <div className="offline-bar">
              📡 <strong>{data.offline_pending_sync} pending sync operations</strong> — data will sync when connectivity is restored.
            </div>
          )}

          <div className="stat-grid">
            <StatCard
              icon="👤"
              value={data.todays_patients}
              label="Patients Today"
              accent="var(--brand-teal)"
              iconBg="rgba(13,148,136,0.15)"
            />
            <StatCard
              icon="⏳"
              value={data.waiting_consultations}
              label="Waiting Consultations"
              accent="#3b82f6"
              iconBg="rgba(59,130,246,0.15)"
            />
            <StatCard
              icon="↗️"
              value={data.active_referrals}
              label="Active Referrals"
              accent="#f97316"
              iconBg="rgba(249,115,22,0.15)"
            />
            <StatCard
              icon="📋"
              value={data.followups_due}
              label="Follow-ups Due"
              accent="#a855f7"
              iconBg="rgba(168,85,247,0.15)"
            />
          </div>

          <h3 style={{ marginBottom: 12, color: 'var(--text-heading)' }}>Quick Actions</h3>
          <div className="quick-actions">
            <div className="quick-action-card" id="qa-register" onClick={() => navigate('/register')}>
              <div className="quick-action-icon">➕</div>
              <div className="quick-action-label">Register Patient</div>
            </div>
            <div className="quick-action-card" id="qa-triage" onClick={() => navigate('/triage')}>
              <div className="quick-action-icon">🩺</div>
              <div className="quick-action-label">Submit Triage</div>
            </div>
            <div className="quick-action-card" id="qa-referral" onClick={() => navigate('/referrals')}>
              <div className="quick-action-icon">↗️</div>
              <div className="quick-action-label">Referrals</div>
            </div>
            <div className="quick-action-card" id="qa-followups" onClick={() => navigate('/followups')}>
              <div className="quick-action-icon">📋</div>
              <div className="quick-action-label">Follow-ups</div>
            </div>
            <div className="quick-action-card" id="qa-patients" onClick={() => navigate('/patients')}>
              <div className="quick-action-icon">👥</div>
              <div className="quick-action-label">Patient List</div>
            </div>
          </div>

          <div className="card" style={{ marginTop: 8 }}>
            <div className="card-header">
              <span className="card-title">Network Status</span>
              <span className={`badge ${data.network_hint === 'ONLINE' ? 'badge-green' : 'badge-orange'}`}>
                {data.network_hint}
              </span>
            </div>
            <p style={{ fontSize: '0.85rem' }}>
              {data.network_hint === 'ONLINE'
                ? 'All data is syncing normally.'
                : `${data.offline_pending_sync} operations pending. Data will sync when connectivity is restored.`}
            </p>
          </div>
        </>
      ) : (
        <div className="alert alert-error">Failed to load dashboard data.</div>
      )}
    </AppShell>
  );
}
