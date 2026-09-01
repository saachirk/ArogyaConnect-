import { apiGet, apiPut } from './client';

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export const notificationsApi = {
  list: () => apiGet<Notification[]>('/notifications'),

  unreadCount: () => apiGet<{ count: number }>('/notifications/unread-count'),

  markRead: (id: number) => apiPut<Notification>(`/notifications/${id}/read`, {}),
};
