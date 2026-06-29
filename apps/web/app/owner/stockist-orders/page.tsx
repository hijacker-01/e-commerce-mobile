'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, getRole, getToken } from '../../../lib/api';
import { toast } from '../../../lib/toast';

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
  stockist?: { name: string } | null;
}

function statusColor(s: string) {
  if (s === 'APPROVED') return '#15803d';
  if (s === 'REJECTED') return '#dc2626';
  return '#b45309';
}

export default function OwnerStockistOrdersPage() {
  const [orders, setOrders] = useState<StockistOrder[]>([]);
  const [form, setForm] = useState<
    Record<string, { discountPct: string; freeUnits: string; note: string }>
  >({});
  const router = useRouter();

  function load() {
    api.get<StockistOrder[]>('/stockist-orders').then(setOrders).catch(() => {});
  }

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    if (getRole() !== 'OWNER') {
      router.push('/owner');
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setF(
    id: string,
    patch: Partial<{ discountPct: string; freeUnits: string; note: string }>,
  ) {
    const empty = { discountPct: '', freeUnits: '', note: '' };
    setForm((f) => ({ ...f, [id]: { ...empty, ...f[id], ...patch } }));
  }

  async function decide(id: string, decision: 'approve' | 'reject') {
    const f = form[id] ?? { discountPct: '', freeUnits: '', note: '' };
    try {
      await api.post(`/stockist-orders/${id}/decide`, {
        decision,
        discountPct: decision === 'approve' ? Number(f.discountPct || 0) : undefined,
        freeUnits: decision === 'approve' ? Number(f.freeUnits || 0) : undefined,
        note: f.note || undefined,
      });
      toast(
        decision === 'approve'
          ? 'Scheme applied & challan issued ✓'
          : 'Order rejected',
        decision === 'approve' ? 'success' : 'info',
      );
      load();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  const pending = orders.filter((o) => o.status === 'REQUESTED');

  return (
    <main>
      <Link href="/owner" className="muted">
        ← Back to dashboard
      </Link>
      <div className="eyebrow" style={{ marginTop: 8 }}>
        Wholesale
      </div>
      <h1>
        Stockist orders
        {pending.length > 0 && (
          <span className="nav-count" style={{ marginLeft: 8 }}>
            {pending.length}
          </span>
        )}
      </h1>
      <p className="muted">
        Review wholesale requests, apply a scheme (volume discount and/or free
        units), and issue the challan.
      </p>

      {orders.length === 0 ? (
        <div className="empty-state">
          <div className="emoji">🧾</div>
          <h3 style={{ marginTop: 12 }}>No stockist orders yet</h3>
        </div>
      ) : (
        orders.map((o) => {
          const f = form[o.id] ?? { discountPct: '', freeUnits: '', note: '' };
          return (
            <div key={o.id} className="card" style={{ marginBottom: 14 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <strong>{o.stockist?.name ?? 'Stockist'}</strong>
                  <span className="muted" style={{ fontSize: 12, marginLeft: 8 }}>
                    {new Date(o.createdAt).toLocaleString()}
                  </span>
                </div>
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
                      <td>
                        ₹{(Number(it.unitPrice) * it.qty).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="summary-row">
                <span>Order value</span>
                <span>₹{Number(o.subtotal).toLocaleString('en-IN')}</span>
              </div>
              {o.note && (
                <p className="muted" style={{ fontSize: 13 }}>
                  📝 {o.note}
                </p>
              )}

              {o.status === 'REQUESTED' ? (
                <div
                  className="filter-panel"
                  style={{ marginTop: 12, marginBottom: 0 }}
                >
                  <strong style={{ fontSize: 13 }}>Apply scheme</strong>
                  <div className="filter-grid" style={{ marginTop: 10 }}>
                    <div>
                      <label>Volume discount %</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={f.discountPct}
                        placeholder="e.g. 10"
                        onChange={(e) =>
                          setF(o.id, { discountPct: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label>Free units</label>
                      <input
                        type="number"
                        min={0}
                        value={f.freeUnits}
                        placeholder="e.g. 5"
                        onChange={(e) =>
                          setF(o.id, { freeUnits: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label>Scheme note</label>
                      <input
                        value={f.note}
                        placeholder="e.g. Festive bulk"
                        onChange={(e) => setF(o.id, { note: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="row" style={{ marginTop: 12 }}>
                    <button className="success" onClick={() => decide(o.id, 'approve')}>
                      Approve &amp; issue challan
                    </button>
                    <button
                      className="secondary"
                      onClick={() => decide(o.id, 'reject')}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ) : o.status === 'APPROVED' ? (
                <div className="muted" style={{ fontSize: 13, marginTop: 8 }}>
                  ✅ {Number(o.schemeDiscountPct)}% off
                  {o.schemeFreeUnits > 0 && ` · ${o.schemeFreeUnits} free`} ·
                  final ₹{Number(o.total).toLocaleString('en-IN')} · challan
                  issued
                </div>
              ) : (
                <div className="muted" style={{ fontSize: 13, marginTop: 8 }}>
                  Rejected{o.schemeNote ? ` — ${o.schemeNote}` : ''}
                </div>
              )}
            </div>
          );
        })
      )}
    </main>
  );
}
