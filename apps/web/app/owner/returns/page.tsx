'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getRole, getToken } from '../../../lib/api';
import { toast } from '../../../lib/toast';

interface ReturnReq {
  id: string;
  reason: string;
  status: string;
  order?: { number: string } | null;
}

function statusColor(status: string): string {
  const s = status.toUpperCase();
  if (['COMPLETED', 'APPROVED'].includes(s)) return '#15803d';
  if (s === 'REJECTED') return '#dc2626';
  if (s === 'REQUESTED') return '#b45309';
  return '#1428a0';
}

export default function OwnerReturnsPage() {
  const [items, setItems] = useState<ReturnReq[]>([]);
  const router = useRouter();

  function load() {
    api.get<ReturnReq[]>('/returns').then(setItems).catch(() => {});
  }

  useEffect(() => {
    const role = getRole();
    if (!getToken() || (role !== 'OWNER' && role !== 'EMPLOYEE')) {
      router.push('/login');
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function decide(id: string, decision: 'approve' | 'reject' | 'complete') {
    try {
      await api.patch(`/returns/${id}`, { decision });
      toast(`Return ${decision}d`);
      load();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  return (
    <main>
      <h1>Return requests</h1>
      {items.length === 0 && <p className="muted">No return requests.</p>}
      <table>
        <thead>
          <tr>
            <th>Order</th>
            <th>Reason</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((r) => (
            <tr key={r.id}>
              <td>{r.order?.number}</td>
              <td>{r.reason}</td>
              <td>
                <span className="badge" style={{ background: statusColor(r.status) }}>
                  {r.status}
                </span>
              </td>
              <td className="row">
                {r.status === 'REQUESTED' && (
                  <>
                    <button className="success" onClick={() => decide(r.id, 'approve')}>
                      Approve
                    </button>
                    <button className="secondary" onClick={() => decide(r.id, 'reject')}>
                      Reject
                    </button>
                  </>
                )}
                {r.status === 'APPROVED' && (
                  <button onClick={() => decide(r.id, 'complete')}>Complete</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
