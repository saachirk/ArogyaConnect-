import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';
import type { DemoInfo } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';

export default function Login() {
  const { login, role, isLoading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [demoInfo, setDemoInfo] = useState<DemoInfo | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (!isLoading && role) navigate('/dashboard');
  }, [isLoading, role, navigate]);

  useEffect(() => {
    authApi.demoInfo().then(setDemoInfo).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword(demoInfo?.password ?? '');
  };

  if (isLoading) return <Spinner center size="lg" />;

  return (
    <div className="login-page">
      {/* Animated background blobs */}
      <div className="login-bg-blob" />
      <div className="login-bg-blob" />
      <div className="login-bg-blob" />

      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-icon">🏥</div>
          <h1>ArogyaConnect</h1>
          <p>Rural Healthcare Access Platform · SIH 2026</p>
        </div>

        {/* Login form */}
        <form id="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="login-email" className="form-label">Email Address</label>
            <input
              id="login-email"
              type="email"
              className="form-input"
              placeholder="you@arogyaconnect.local"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label htmlFor="login-password" className="form-label">Password</label>
            <input
              id="login-password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: 12 }}>
              ⚠️ {error}
            </div>
          )}

          <button
            id="login-submit-btn"
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%' }}
            disabled={submitting}
          >
            {submitting ? <><Spinner size="sm" /> Signing in…</> : 'Sign In'}
          </button>
        </form>

        {/* Demo credentials */}
        {demoInfo && (
          <div className="login-demo-box">
            <h4>Demo Accounts — click to fill</h4>
            {demoInfo.accounts.map(acc => (
              <div
                key={acc.email}
                id={`demo-${acc.role.toLowerCase()}`}
                className="login-demo-row"
                onClick={() => fillDemo(acc.email)}
              >
                <span>{acc.role.replace('_', ' ')}</span>
                <span>{acc.email}</span>
              </div>
            ))}
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 8 }}>
              {demoInfo.disclaimer}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
