'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getToken } from '../../lib/api';

interface Order {
  id: string;
  number: string;
  status: string;
  total: string;
  paymentStatus: string;
  createdAt: string;
}

function statusColor(status: string): string {
  const s = status.toUpperCase();
  if (['DELIVERED', 'APPROVED', 'COMPLETED'].includes(s)) return '#15803d';
  if (['CANCELLED', 'REJECTED', 'RETURNED'].includes(s)) return '#dc2626';
  if (['PENDING', 'AWAITING'].includes(s)) return '#b45309';
  return '#1428a0';
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [points, setPoints] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const router = useRouter();

  async function requestReturn(orderId: string) {
    const reason = window.prompt('Reason for return?');
    if (!reason) return;
    try {
      await api.post('/returns', { orderId, reason });
      setNote('Return requested ✓');
    } catch (e) {
      setNote((e as Error).message);
    }
  }

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    api.get<Order[]>('/orders').then(setOrders).catch(() => {});
    api
      .get<{ points: number }>('/loyalty/me')
      .then((r) => setPoints(r.points))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main>
      <div className="row">
        <h1 style={{ flex: 1 }}>My orders</h1>
        {points !== null && (
          <span
            className="chip"
            style={{
              background: 'linear-gradient(135deg,#fff7e6,#ffeccc)',
              borderColor: '#f3d28a',
              color: '#92600a',
              fontWeight: 700,
            }}
          >
            ★ {points} loyalty points
          </span>
        )}
      </div>
      {note && <p className="muted">{note}</p>}
      {orders.length === 0 ? (
        <div className="empty-state">
          <div className="emoji">📦</div>
          <h3 style={{ marginTop: 12 }}>No orders yet</h3>
          <p className="muted">Your placed orders will show up here.</p>
          <button style={{ marginTop: 16 }} onClick={() => router.push('/')}>
            Start shopping
          </button>
        </div>
      ) : (
        <div className="card" style={{ padding: 8, marginTop: 12 }}>
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.number}</td>
                  <td>
                    <span
                      className="badge"
                      style={{ background: statusColor(o.status) }}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td>{o.paymentStatus}</td>
                  <td>₹{o.total}</td>
                  <td>
                    {['APPROVED', 'DELIVERED'].includes(o.status) && (
                      <button
                        className="secondary"
                        onClick={() => requestReturn(o.id)}
                      >
                        Return
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
