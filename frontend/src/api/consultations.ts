import { apiGet, apiPost, apiPut } from './client';

export interface Consultation {
  id: number;
  patient_id: number;
  doctor_id: number | null;
  frontline_worker_id: number;
  facility_id: number;
  token_number: string;
  priority: string;
  status: string;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  estimated_wait_minutes: number;
  specialist_type: string;
  clinical_record_id: number | null;
  created_at: string;
  patient_name: string | null;
  doctor_name: string | null;
}

export interface Prescription {
  id: number;
  consultation_id: number;
  doctor_id: number;
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  created_at: string;
  disclaimer: string;
}

export const consultationsApi = {
  create: (data: {
    patient_id: number;
    facility_id?: number;
    doctor_id?: number;
    priority?: string;
    specialist_type?: string;
    clinical_record_id?: number;
  }) => apiPost<Consultation>('/consultations', data),

  getQueue: (params?: { doctor_id?: number; facility_id?: number; status?: string }) => {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params ?? {})
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)])
      )
    ).toString();
    return apiGet<Consultation[]>(`/queue${qs ? '?' + qs : ''}`);
  },

  updateStatus: (id: number, status: string) =>
    apiPut<Consultation>(`/consultations/${id}/status`, { status }),

  assign: (id: number, doctor_id: number) =>
    apiPut<Consultation>(`/consultations/${id}/assign`, { doctor_id }),

  addPrescription: (data: {
    consultation_id: number;
    medicine_name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
  }) => apiPost<Prescription>('/prescriptions', data),

  optimizeQueue: (specialist_type?: string, facility_id?: number) =>
    apiPost('/queue/optimize', { specialist_type, facility_id }),
};
