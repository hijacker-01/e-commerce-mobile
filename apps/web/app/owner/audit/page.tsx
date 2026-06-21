'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getRole, getToken } from '../../../lib/api';

interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  entityId?: string;
  createdAt: string;
  user?: { name: string; role: string } | null;
}

export default function AuditPage() {
  const [items, setItems] = useState<AuditEntry[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (!getToken() || getRole() !== 'OWNER') {
      router.push('/login');
      return;
    }
    api.get<AuditEntry[]>('/audit').then(setItems).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main>
      <h1>Audit log</h1>
      <table>
        <thead>
          <tr>
            <th>When</th>
            <th>Who</th>
            <th>Action</th>
            <th>Entity</th>
          </tr>
        </thead>
        <tbody>
          {items.map((a) => (
            <tr key={a.id}>
              <td className="muted">{new Date(a.createdAt).toLocaleString()}</td>
              <td>{a.user?.name ?? '—'}</td>
              <td>
                <span className="badge">{a.action}</span>
              </td>
              <td>
                {a.entity} {a.entityId ? `(${a.entityId.slice(0, 8)})` : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {items.length === 0 && <p className="muted">No audit entries.</p>}
    </main>
  );
}
