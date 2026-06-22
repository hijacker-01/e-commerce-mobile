'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getRole, getToken } from '../../lib/api';

interface ChallanItem {
  productId: string;
  name: string;
  qty: number;
  rate: number;
}
interface Challan {
  id: string;
  number: string;
  status: string;
  totalAmount: string;
  items: ChallanItem[];
  createdAt: string;
  stockist?: { name: string } | null;
}

function statusColor(status: string): string {
  const s = status.toUpperCase();
  if (s === 'RECEIVED') return '#15803d';
  if (s === 'CANCELLED') return '#dc2626';
  if (s === 'ISSUED') return '#b45309';
  return '#1428a0';
}

export default function StockistPage() {
  const [challans, setChallans] = useState<Challan[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!getToken() || getRole() !== 'STOCKIST') {
      router.push('/login');
      return;
    }
    api
      .get<Challan[]>('/stockists/me/challans')
      .then(setChallans)
      .catch(() => {})
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main>
      <div className="eyebrow">Stockist portal</div>
      <h1>Supply challans</h1>
      <p className="muted">
        Inbound supply orders the store has issued to you. Once the shop marks a
        challan <strong>received</strong>, stock moves into their inventory.
      </p>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : challans.length === 0 ? (
        <div className="empty-state">
          <div className="emoji">📦</div>
          <h3 style={{ marginTop: 12 }}>No challans yet</h3>
          <p className="muted">Supply challans issued to you will appear here.</p>
        </div>
      ) : (
        challans.map((c) => (
          <div key={c.id} className="card" style={{ marginBottom: 12 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <strong>{c.number}</strong>
              <span
                className="badge"
                style={{ background: statusColor(c.status) }}
              >
                {c.status}
              </span>
            </div>
            <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
              {new Date(c.createdAt).toLocaleDateString()} · Total ₹
              {Number(c.totalAmount).toLocaleString('en-IN')}
            </div>
            {c.items?.length > 0 && (
              <table style={{ marginTop: 10 }}>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {c.items.map((it, i) => (
                    <tr key={i}>
                      <td>{it.name}</td>
                      <td>{it.qty}</td>
                      <td>₹{Number(it.rate).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))
      )}
    </main>
  );
}
