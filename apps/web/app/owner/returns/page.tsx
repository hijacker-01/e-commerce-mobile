'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getRole, getToken } from '../../../lib/api';

interface ReturnReq {
  id: string;
  reason: string;
  status: string;
  order?: { number: string } | null;
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
    await api.patch(`/returns/${id}`, { decision });
    load();
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
                <span className="badge">{r.status}</span>
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
