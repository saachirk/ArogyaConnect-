import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { authApi } from '../api/auth';
import type { User } from '../api/auth';

interface AuthState {
  user: User | null;
  token: string | null;
  role: string | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem('ac_token'),
    role: localStorage.getItem('ac_role'),
    isLoading: true,
  });

  // On mount, validate stored token
  useEffect(() => {
    const token = localStorage.getItem('ac_token');
    if (!token) {
      setState(s => ({ ...s, isLoading: false }));
      return;
    }
    authApi.me()
      .then(user => {
        setState({ user, token, role: user.role, isLoading: false });
      })
      .catch(() => {
        localStorage.removeItem('ac_token');
        localStorage.removeItem('ac_role');
        setState({ user: null, token: null, role: null, isLoading: false });
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    localStorage.setItem('ac_token', data.access_token);
    localStorage.setItem('ac_role', data.role);
    setState({ user: data.user, token: data.access_token, role: data.role, isLoading: false });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('ac_token');
    localStorage.removeItem('ac_role');
    setState({ user: null, token: null, role: null, isLoading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
