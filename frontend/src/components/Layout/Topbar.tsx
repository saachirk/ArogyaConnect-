import { useEffect, useState } from 'react';
import { notificationsApi } from '../../api/notifications';
import type { Notification } from '../../api/notifications';
import Modal from '../ui/Modal';

interface TopbarProps {
  title: string;
}

export default function Topbar({ title }: TopbarProps) {
  const [unread, setUnread] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>([]);

  useEffect(() => {
    notificationsApi.unreadCount()
      .then(r => setUnread(r.count))
      .catch(() => { });
  }, []);

  const openNotifs = async () => {
    setShowNotifs(true);
    const list = await notificationsApi.list().catch(() => []);
    setNotifs(list);
    setUnread(0);
  };

  const markRead = async (id: number) => {
    await notificationsApi.markRead(id).catch(() => { });
    setNotifs(ns => ns.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  return (
    <>
      <header className="topbar">
        <span className="topbar-title">{title}</span>
        <div className="topbar-actions">

          <button
            id="notifications-btn"
            className="icon-btn"
            aria-label="Notifications"
            onClick={openNotifs}
          >
            🔔
            {unread > 0 && (
              <span className="notification-badge">{unread > 9 ? '9+' : unread}</span>
            )}
          </button>
        </div>
      </header>

      {showNotifs && (
        <Modal title="Notifications" onClose={() => setShowNotifs(false)}>
          {notifs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔔</div>
              <h3>No notifications</h3>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {notifs.map(n => (
                <div
                  key={n.id}
                  id={`notification-${n.id}`}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 8,
                    background: n.is_read ? 'rgba(15,23,42,0.4)' : 'rgba(13,148,136,0.08)',
                    border: `1px solid ${n.is_read ? 'var(--border)' : 'rgba(13,148,136,0.25)'}`,
                    cursor: n.is_read ? 'default' : 'pointer',
                  }}
                  onClick={() => !n.is_read && markRead(n.id)}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-heading)', marginBottom: 2 }}>
                    {n.title}
                    {!n.is_read && <span className="badge badge-teal" style={{ marginLeft: 6, fontSize: '0.65rem' }}>NEW</span>}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{n.message}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
