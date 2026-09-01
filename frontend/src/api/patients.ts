import { apiGet, apiPost, apiPut } from './client';

export interface Patient {
  id: number;
  health_id: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  village: string;
  district: string;
  state: string;
  preferred_language: string;
  migrant_status: boolean;
  registered_facility_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface PatientCreate {
  name: string;
  age: number;
  gender: string;
  phone: string;
  village: string;
  district: string;
  state?: string;
  preferred_language?: string;
  migrant_status?: boolean;
  registered_facility_id?: number | null;
}

export interface PatientUpdate {
  name?: string;
  age?: number;
  phone?: string;
  village?: string;
  district?: string;
  preferred_language?: string;
  migrant_status?: boolean;
}

export interface DuplicateCheckOut {
  possible_duplicates: Patient[];
  message: string | null;
}

export const patientsApi = {
  list: (skip = 0, limit = 50) =>
    apiGet<Patient[]>(`/patients?skip=${skip}&limit=${limit}`),

  search: (q: string) =>
    apiGet<Patient[]>(`/patients/search?q=${encodeURIComponent(q)}`),

  checkDuplicate: (params: { name?: string; phone?: string; health_id?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return apiGet<DuplicateCheckOut>(`/patients/check-duplicate?${qs}`);
  },

  get: (id: number) => apiGet<Patient>(`/patients/${id}`),

  create: (data: PatientCreate) => apiPost<Patient>('/patients', data),

  update: (id: number, data: PatientUpdate) => apiPut<Patient>(`/patients/${id}`, data),

  history: (id: number) => apiGet<Record<string, unknown>>(`/patients/${id}/history`),
};
