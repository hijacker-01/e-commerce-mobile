'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, getRole, getToken } from '../../../lib/api';

interface OrderItem {
  productId: string;
  name: string;
  qty: number;
  unitPrice: string;
}
interface StockistOrder {
  id: string;
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED';
  items: OrderItem[];
  note?: string | null;
  schemeDiscountPct: string;
  schemeFreeUnits: number;
  schemeNote?: string | null;
  subtotal: string;
  total: string;
  challanId?: string | null;
  createdAt: string;
}

function statusColor(s: string) {
  if (s === 'APPROVED') return '#15803d';
  if (s === 'REJECTED') return '#dc2626';
  return '#b45309';
}

function StockistNav() {
  return (
    <div className="row" style={{ gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
      <Link className="btn secondary" href="/stockist/order">
        🛒 Order stock
      </Link>
      <Link className="btn" href="/stockist/orders">
        My orders
      </Link>
      <Link className="btn secondary" href="/stockist">
        My challans
      </Link>
    </div>
  );
}

export default function StockistOrdersPage() {
  const [orders, setOrders] = useState<StockistOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!getToken() || getRole() !== 'STOCKIST') {
      router.push('/login');
      return;
    }
    api
      .get<StockistOrder[]>('/stockist-orders/mine')
      .then(setOrders)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <main>
      <div className="eyebrow">Wholesale</div>
      <h1>My orders</h1>
      <StockistNav />

      {loading ? (
        <p className="muted">Loading…</p>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <div className="emoji">📦</div>
          <h3 style={{ marginTop: 12 }}>No orders yet</h3>
          <p className="muted">Place a wholesale order to get started.</p>
          <Link href="/stockist/order" className="btn" style={{ marginTop: 16 }}>
            Order stock
          </Link>
        </div>
      ) : (
        orders.map((o) => (
          <div key={o.id} className="card" style={{ marginBottom: 12 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="muted" style={{ fontSize: 12 }}>
                {new Date(o.createdAt).toLocaleString()}
              </span>
              <span
                className="badge"
                style={{ background: statusColor(o.status) }}
              >
                {o.status}
              </span>
            </div>
            <table style={{ marginTop: 8 }}>
              <tbody>
                {o.items.map((it, i) => (
                  <tr key={i}>
                    <td>{it.name}</td>
                    <td className="muted">× {it.qty}</td>
                    <td>₹{Number(it.unitPrice).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="summary-row" style={{ marginTop: 6 }}>
              <span>Order value</span>
              <span>₹{Number(o.subtotal).toLocaleString('en-IN')}</span>
            </div>
            {o.status === 'APPROVED' && (
              <div
                className="offers-box"
                style={{ borderStyle: 'solid', borderColor: 'var(--success)' }}
              >
                ✅ <strong>Scheme applied:</strong>{' '}
                {Number(o.schemeDiscountPct) > 0 &&
                  `${Number(o.schemeDiscountPct)}% off`}
                {Number(o.schemeDiscountPct) > 0 && o.schemeFreeUnits > 0 && ' · '}
                {o.schemeFreeUnits > 0 && `${o.schemeFreeUnits} free unit(s)`}
                {o.schemeNote ? ` — ${o.schemeNote}` : ''}
                <div className="summary-total" style={{ marginTop: 8 }}>
                  <span>Final total</span>
                  <span>₹{Number(o.total).toLocaleString('en-IN')}</span>
                </div>
                {o.challanId && (
                  <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                    📄 Challan issued — see{' '}
                    <Link href="/stockist">My challans</Link>.
                  </div>
                )}
              </div>
            )}
            {o.status === 'REJECTED' && o.schemeNote && (
              <p className="muted" style={{ marginTop: 8 }}>
                Reason: {o.schemeNote}
              </p>
            )}
          </div>
        ))
      )}
    </main>
  );
}
