'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getToken } from '../../lib/api';

interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string;
  read: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const router = useRouter();

  function load() {
    api.get<Notification[]>('/notifications').then(setItems).catch(() => {});
  }

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function markAll() {
    await api.post('/notifications/read-all');
    load();
  }

  return (
    <main>
      <div className="row">
        <h1 style={{ flex: 1 }}>Notifications</h1>
        <button className="secondary" onClick={markAll}>
          Mark all read
        </button>
      </div>
      {items.length === 0 && <p className="muted">Nothing yet.</p>}
      {items.map((n) => (
        <div
          key={n.id}
          className="card"
          style={{ marginBottom: 10, opacity: n.read ? 0.6 : 1 }}
        >
          <div className="row">
            <span className="badge">{n.type}</span>
            {!n.read && <span style={{ color: 'var(--accent)' }}>●</span>}
          </div>
          <strong>{n.title}</strong>
          {n.body && <p style={{ margin: '4px 0 0' }}>{n.body}</p>}
        </div>
      ))}
    </main>
  );
}
