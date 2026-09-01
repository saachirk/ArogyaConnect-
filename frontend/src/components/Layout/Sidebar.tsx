import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const FRONTLINE_NAV = [
  { to: '/dashboard', icon: '🏠', label: 'Dashboard' },
  { to: '/patients', icon: '👥', label: 'Patients' },
  { to: '/register', icon: '➕', label: 'Register Patient' },
  { to: '/triage', icon: '🩺', label: 'Triage' },
  { to: '/referrals', icon: '↗️', label: 'Referrals' },
  { to: '/followups', icon: '📋', label: 'Follow-ups' },
];

const DOCTOR_NAV = [
  { to: '/dashboard', icon: '🏠', label: 'Dashboard' },
  { to: '/queue', icon: '📋', label: 'My Queue' },
  { to: '/referrals', icon: '↗️', label: 'Referrals' },
  { to: '/patients', icon: '👥', label: 'Patients' },
];

const ADMIN_NAV = [
  { to: '/dashboard', icon: '🏠', label: 'Dashboard' },
  { to: '/patients', icon: '👥', label: 'Patients' },
  { to: '/referrals', icon: '↗️', label: 'Referrals' },
  { to: '/followups', icon: '📋', label: 'Follow-ups' },
  { to: '/facilities', icon: '🏥', label: 'Facilities' },
  { to: '/attention', icon: '⚠️', label: 'Attention Items' },
];

export default function Sidebar() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const navItems =
    role === 'FRONTLINE_WORKER' ? FRONTLINE_NAV :
    role === 'DOCTOR' ? DOCTOR_NAV :
    ADMIN_NAV;

  const roleLabel =
    role === 'FRONTLINE_WORKER' ? 'Frontline Worker' :
    role === 'DOCTOR' ? 'Doctor' :
    'Admin';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🏥</div>
        <div className="sidebar-logo-text">
          ArogyaConnect
          <span>SIH 2026 Prototype</span>
        </div>
      </div>

      {/* Nav */}
      <div className="sidebar-section">
        <div className="sidebar-section-label">{roleLabel}</div>
        <ul className="sidebar-nav">
          {navItems.map(item => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                className={({ isActive }) =>
                  `sidebar-nav-item${isActive ? ' active' : ''}`
                }
              >
                <span>{item.icon}</span>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user" onClick={handleLogout} id="sidebar-logout-btn" title="Click to log out">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.name ?? 'User'}</div>
            <div className="sidebar-user-role">Logout ↩</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
