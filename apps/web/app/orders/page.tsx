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

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [points, setPoints] = useState<number | null>(null);
  const router = useRouter();

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
          <span className="badge">★ {points} loyalty points</span>
        )}
      </div>
      {orders.length === 0 ? (
        <p className="muted">No orders yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Status</th>
              <th>Payment</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>{o.number}</td>
                <td>
                  <span className="badge">{o.status}</span>
                </td>
                <td>{o.paymentStatus}</td>
                <td>₹{o.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
