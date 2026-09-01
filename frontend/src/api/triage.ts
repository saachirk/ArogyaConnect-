import { apiPost } from './client';

export interface ClinicalRecord {
  id: number;
  patient_id: number;
  worker_id: number;
  chief_complaint: string;
  symptoms: string;
  duration: string;
  temperature: number | null;
  systolic_bp: number | null;
  diastolic_bp: number | null;
  pulse: number | null;
  spo2: number | null;
  existing_conditions: string;
  current_medications: string;
  red_flag_symptoms: string;
  triage_level: string;
  notes: string;
  created_at: string;
  disclaimer: string;
}

export interface TriageCreate {
  patient_id: number;
  chief_complaint: string;
  duration?: string;
  symptoms?: string;
  temperature?: number | null;
  systolic_bp?: number | null;
  diastolic_bp?: number | null;
  pulse?: number | null;
  spo2?: number | null;
  existing_conditions?: string;
  current_medications?: string;
  red_flag_symptoms?: string;
  notes?: string;
  enqueue?: boolean;
  specialist_type?: string;
}

export interface TriageResult {
  clinical_record: ClinicalRecord;
  consultation_id: number | null;
  token_number: string | null;
  estimated_wait_minutes: number | null;
  disclaimer: string;
}

export const triageApi = {
  submit: (data: TriageCreate) =>
    apiPost<TriageResult>('/triage', data),
};
