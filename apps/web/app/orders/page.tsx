'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getToken } from '../../lib/api';
import { toast } from '../../lib/toast';

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
  const [returnFor, setReturnFor] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function submitReturn() {
    if (!returnFor || !reason.trim()) return;
    setSubmitting(true);
    try {
      await api.post('/returns', { orderId: returnFor, reason });
      toast('Return requested ✓');
      setReturnFor(null);
      setReason('');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setSubmitting(false);
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
                <tr
                  key={o.id}
                  className="clickable-row"
                  onClick={() => router.push(`/orders/${o.id}`)}
                >
                  <td>
                    <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                      {o.number}
                    </span>
                  </td>
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
                  <td onClick={(e) => e.stopPropagation()}>
                    {['APPROVED', 'DELIVERED'].includes(o.status) && (
                      <button
                        className="secondary"
                        onClick={() => setReturnFor(o.id)}
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

      {returnFor && (
        <div
          className="modal-overlay"
          onClick={() => !submitting && setReturnFor(null)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Request a return</h3>
            <p className="muted" style={{ marginTop: 0 }}>
              Tell us why you&apos;d like to return this order.
            </p>
            <label>Reason</label>
            <textarea
              rows={3}
              value={reason}
              autoFocus
              placeholder="e.g. Received a damaged unit"
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="modal-actions">
              <button
                className="secondary"
                onClick={() => setReturnFor(null)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={submitReturn}
                disabled={submitting || !reason.trim()}
              >
                {submitting ? '…' : 'Submit return'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
