import { apiGet, apiPost } from './client';

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  facility_id: number | null;
  preferred_language: string;
  specialization: string | null;
  worker_type: string | null;
  is_available: boolean;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  role: string;
  user: User;
}

export interface DemoAccount {
  role: string;
  email: string;
}

export interface DemoInfo {
  disclaimer: string;
  accounts: DemoAccount[];
  password: string;
  note: string;
}

export const authApi = {
  login: (email: string, password: string) =>
    apiPost<TokenResponse>('/auth/login', { email, password }),

  me: () => apiGet<User>('/auth/me'),

  demoInfo: () => apiGet<DemoInfo>('/auth/demo-info'),

  setAvailability: (is_available: boolean) =>
    apiPost<User>('/auth/availability', { is_available }),
};
