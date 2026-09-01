import { apiGet, apiPost, apiPut } from './client';

export interface Referral {
  id: number;
  patient_id: number;
  from_facility_id: number;
  to_facility_id: number;
  referred_by: number;
  specialist_id: number | null;
  reason: string;
  priority: string;
  status: string;
  created_at: string;
  accepted_at: string | null;
  completed_at: string | null;
  consultation_id: number | null;
  patient_name: string | null;
}

export const referralsApi = {
  create: (data: {
    patient_id: number;
    to_facility_id: number;
    reason: string;
    priority?: string;
    specialist_id?: number;
    consultation_id?: number;
    from_facility_id?: number;
  }) => apiPost<Referral>('/referrals', data),

  list: (status_filter?: string) => {
    const qs = status_filter ? `?status_filter=${status_filter}` : '';
    return apiGet<Referral[]>(`/referrals${qs}`);
  },

  get: (id: number) =>
    apiGet<{ referral: Referral; timeline: { status: string; at: string | null }[]; current: string }>(`/referrals/${id}`),

  updateStatus: (id: number, status: string) =>
    apiPut<Referral>(`/referrals/${id}/status`, { status }),

  reRefer: (
    id: number,
    data: { patient_id: number; to_facility_id: number; reason: string; priority?: string }
  ) => apiPost<Referral>(`/referrals/${id}/re-refer`, data),
};
