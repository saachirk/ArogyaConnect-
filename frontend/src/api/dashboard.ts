import { apiGet } from './client';

export interface FrontlineDashboard {
  todays_patients: number;
  waiting_consultations: number;
  active_referrals: number;
  followups_due: number;
  offline_pending_sync: number;
  network_hint: string;
}

export interface DoctorDashboard {
  current_queue: number;
  incoming_referrals: number;
  followups: number;
  in_progress: number;
}

export interface AdminDashboard {
  total_patients: number;
  todays_consultations: number;
  active_referrals: number;
  completed_referrals: number;
  average_waiting_time: number;
  overdue_followups: number;
  pending_sync_operations: number;
  consultations_by_day: { date: string; count: number }[];
  referrals_by_status: { status: string; count: number }[];
  patient_load_by_facility: { facility: string; count: number }[];
  specialist_utilization: { doctor: string; count: number }[];
  connectivity_interruptions: { status: string; count: number }[];
  waiting_time_series: { date: string; count: number }[];
}

export interface AttentionItem {
  kind: string;
  title: string;
  detail: string;
  entity_type: string;
  entity_id: string;
  district: string | null;
  facility_id: number | null;
  severity: string;
}

export const dashboardApi = {
  frontline: () => apiGet<FrontlineDashboard>('/dashboard/frontline'),
  doctor: () => apiGet<DoctorDashboard>('/dashboard/doctor'),
  admin: () => apiGet<AdminDashboard>('/dashboard/admin'),
  attention: (params?: { district?: string; facility_id?: number }) => {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params ?? {})
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)])
      )
    ).toString();
    return apiGet<AttentionItem[]>(`/dashboard/attention${qs ? '?' + qs : ''}`);
  },
};
