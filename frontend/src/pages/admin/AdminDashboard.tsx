import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../../api/dashboard';
import type { AdminDashboard as DashData } from '../../api/dashboard';
import AppShell from '../../components/Layout/AppShell';
import StatCard from '../../components/ui/StatCard';
import Spinner from '../../components/ui/Spinner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.admin()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const COLORS = ['#0d9488', '#3b82f6', '#f97316', '#a855f7', '#ef4444', '#10b981'];

  return (
    <AppShell title="Admin Dashboard">
      <div className="page-header">
        <div className="page-header-text">
          <h2>Network Overview</h2>
          <p>System-wide metrics and analytics</p>
        </div>
        <button id="admin-attention-btn" className="btn btn-primary" onClick={() => navigate('/attention')}>
          ⚠️ View Attention Items
        </button>
      </div>

      {loading ? (
        <Spinner center />
      ) : data ? (
        <>
          <div className="stat-grid">
            <StatCard icon="👥" value={data.total_patients} label="Total Patients" />
            <StatCard icon="🩺" value={data.todays_consultations} label="Consultations Today" accent="#3b82f6" iconBg="rgba(59,130,246,0.15)" />
            <StatCard icon="↗️" value={data.active_referrals} label="Active Referrals" accent="#f97316" iconBg="rgba(249,115,22,0.15)" />
            <StatCard icon="⏳" value={`${data.average_waiting_time}m`} label="Avg Wait Time" accent="#ef4444" iconBg="rgba(239,68,68,0.15)" />
          </div>

          {/* Charts Row 1 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20, marginBottom: 20 }}>
            {/* Consultations by Day */}
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: 16 }}>Consultations (Last 7 Days)</h3>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.consultations_by_day}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickFormatter={v => v.slice(5)} />
                    <YAxis stroke="var(--text-muted)" fontSize={12} />
                    <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
                    <Line type="monotone" dataKey="count" stroke="var(--brand-teal)" strokeWidth={3} dot={{ r: 4, fill: 'var(--brand-teal)' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Referrals by Status */}
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: 16 }}>Referrals by Status</h3>
              <div className="chart-wrapper" style={{ display: 'flex' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.referrals_by_status} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="count" nameKey="status">
                      {data.referrals_by_status.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Custom Legend */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8, paddingRight: 20 }}>
                  {data.referrals_by_status.map((e, i) => (
                    <div key={e.status} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS[i % COLORS.length] }} />
                      {e.status} ({e.count})
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20 }}>
            {/* Patient Load by Facility */}
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: 16 }}>Load by Facility</h3>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.patient_load_by_facility} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                    <XAxis type="number" stroke="var(--text-muted)" fontSize={12} />
                    <YAxis dataKey="facility" type="category" stroke="var(--text-muted)" fontSize={12} width={100} />
                    <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Specialist Utilization */}
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: 16 }}>Specialist Utilization</h3>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.specialist_utilization}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="doctor" stroke="var(--text-muted)" fontSize={12} />
                    <YAxis stroke="var(--text-muted)" fontSize={12} />
                    <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
                    <Bar dataKey="count" fill="var(--brand-teal-light)" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="alert alert-error">Failed to load admin dashboard</div>
      )}
    </AppShell>
  );
}
