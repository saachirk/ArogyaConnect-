import { apiGet, apiPost, apiPut } from './client';

export interface Followup {
  id: number;
  patient_id: number;
  referral_id: number | null;
  assigned_worker_id: number | null;
  due_date: string;
  status: string;
  notes: string;
  completed_at: string | null;
  created_at: string;
  patient_name: string | null;
}

export const followupsApi = {
  list: (bucket?: 'today' | 'overdue' | 'upcoming' | 'all') => {
    const qs = bucket ? `?bucket=${bucket}` : '';
    return apiGet<Followup[]>(`/followups${qs}`);
  },

  create: (data: {
    patient_id: number;
    referral_id?: number;
    assigned_worker_id?: number;
    due_date: string;
    notes?: string;
  }) => apiPost<Followup>('/followups', data),

  update: (id: number, data: { status?: string; notes?: string; due_date?: string; assigned_worker_id?: number }) =>
    apiPut<Followup>(`/followups/${id}`, data),
};
