import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../../api/dashboard';
import type { DoctorDashboard as DashData } from '../../api/dashboard';
import AppShell from '../../components/Layout/AppShell';
import StatCard from '../../components/ui/StatCard';
import Spinner from '../../components/ui/Spinner';
import { useAuth } from '../../context/AuthContext';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.doctor()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell title="Doctor Dashboard">
      <div className="page-header">
        <div className="page-header-text">
          <h2>Welcome, Dr. {user?.name?.split(' ')[0]} 👨‍⚕️</h2>
          <p>
            {user?.specialization ?? 'General Medicine'} · Facility #{user?.facility_id}
            {user?.is_available ? (
              <span className="badge badge-green" style={{ marginLeft: 8 }}>Available</span>
            ) : (
              <span className="badge badge-red" style={{ marginLeft: 8 }}>Unavailable</span>
            )}
          </p>
        </div>
        <button id="doctor-queue-btn" className="btn btn-primary" onClick={() => navigate('/queue')}>
          📋 View My Queue
        </button>
      </div>

      {loading ? (
        <Spinner center />
      ) : data ? (
        <>
          <div className="stat-grid">
            <StatCard
              icon="⏳"
              value={data.current_queue}
              label="In Queue"
              accent="#3b82f6"
              iconBg="rgba(59,130,246,0.15)"
              onClick={() => navigate('/queue')}
            />
            <StatCard
              icon="🔄"
              value={data.in_progress}
              label="In Progress"
              accent="var(--brand-teal)"
              iconBg="rgba(13,148,136,0.15)"
              onClick={() => navigate('/queue')}
            />
            <StatCard
              icon="↗️"
              value={data.incoming_referrals}
              label="Incoming Referrals"
              accent="#f97316"
              iconBg="rgba(249,115,22,0.15)"
              onClick={() => navigate('/referrals')}
            />
            <StatCard
              icon="📋"
              value={data.followups}
              label="Pending Follow-ups"
              accent="#a855f7"
              iconBg="rgba(168,85,247,0.15)"
            />
          </div>

          <h3 style={{ marginBottom: 12 }}>Quick Actions</h3>
          <div className="quick-actions">
            <div className="quick-action-card" id="qa-queue" onClick={() => navigate('/queue')}>
              <div className="quick-action-icon">📋</div>
              <div className="quick-action-label">Consultation Queue</div>
            </div>
            <div className="quick-action-card" id="qa-referrals" onClick={() => navigate('/referrals')}>
              <div className="quick-action-icon">↗️</div>
              <div className="quick-action-label">Referrals</div>
            </div>
            <div className="quick-action-card" id="qa-patients" onClick={() => navigate('/patients')}>
              <div className="quick-action-icon">👥</div>
              <div className="quick-action-label">Patients</div>
            </div>
          </div>
        </>
      ) : (
        <div className="alert alert-error">Failed to load dashboard</div>
      )}
    </AppShell>
  );
}
