import { apiGet } from './client';

export interface Facility {
  id: number;
  name: string;
  type: string;
  village: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  connectivity_status: string;
  created_at: string;
  queue_length: number;
  specialist_count: number;
  distance_km: number | null;
}

export interface FacilityDetail {
  facility: Facility;
  resources: { id: number; resource_name: string; category: string; availability_status: string; quantity: number }[];
  specialists: { id: number; name: string; specialization: string; is_available: boolean }[];
  connectivity: string;
}

export const facilitiesApi = {
  list: (lat?: number, lon?: number) => {
    const qs = lat !== undefined && lon !== undefined ? `?lat=${lat}&lon=${lon}` : '';
    return apiGet<Facility[]>(`/facilities${qs}`);
  },

  get: (id: number) => apiGet<FacilityDetail>(`/facilities/${id}`),
};
