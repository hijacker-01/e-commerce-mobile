'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, getRole, getToken } from '../../../lib/api';
import { toast } from '../../../lib/toast';

interface CatalogItem {
  id: string;
  brand: string;
  model: string;
  title: string;
  category: string | null;
  retail: string;
  stockistPrice: string;
  inStock: number;
}

function StockistNav() {
  return (
    <div className="row" style={{ gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
      <Link className="btn" href="/stockist/order">
        🛒 Order stock
      </Link>
      <Link className="btn secondary" href="/stockist/orders">
        My orders
      </Link>
      <Link className="btn secondary" href="/stockist">
        My challans
      </Link>
    </div>
  );
}

export default function StockistOrderPage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!getToken() || getRole() !== 'STOCKIST') {
      router.push('/login');
      return;
    }
    api
      .get<CatalogItem[]>('/stockist-orders/catalog')
      .then(setItems)
      .catch(() => {});
  }, [router]);

  const lines = items.filter((i) => (qty[i.id] ?? 0) > 0);
  const total = lines.reduce(
    (s, i) => s + Number(i.stockistPrice) * (qty[i.id] ?? 0),
    0,
  );
  const units = lines.reduce((s, i) => s + (qty[i.id] ?? 0), 0);

  function setQ(id: string, v: number) {
    setQty((q) => ({ ...q, [id]: Math.max(0, v) }));
  }

  async function place() {
    if (lines.length === 0) return;
    setSaving(true);
    try {
      await api.post('/stockist-orders', {
        items: lines.map((i) => ({ productId: i.id, qty: qty[i.id] })),
        note: note.trim() || undefined,
      });
      toast('Order request sent — owner will apply a scheme & issue a challan.');
      setQty({});
      setNote('');
      router.push('/stockist/orders');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main>
      <div className="eyebrow">Wholesale</div>
      <h1>Order stock</h1>
      <p className="muted">
        Wholesale prices for stockists. Enter the quantities you want — the owner
        reviews, applies your scheme (volume discount / free units), and issues a
        challan.
      </p>
      <StockistNav />

      <div className="card" style={{ padding: 8 }}>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Stockist price</th>
              <th>In stock</th>
              <th>Qty</th>
              <th>Line total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => {
              const q = qty[i.id] ?? 0;
              return (
                <tr key={i.id}>
                  <td>
                    <strong>{i.title}</strong>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {i.brand} · {i.category}
                    </div>
                  </td>
                  <td>
                    <strong>
                      ₹{Number(i.stockistPrice).toLocaleString('en-IN')}
                    </strong>
                    <div className="mrp" style={{ fontSize: 11 }}>
                      retail ₹{Number(i.retail).toLocaleString('en-IN')}
                    </div>
                  </td>
                  <td className="muted">{i.inStock}</td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      value={q || ''}
                      placeholder="0"
                      style={{ width: 80 }}
                      onChange={(e) => setQ(i.id, Number(e.target.value))}
                    />
                  </td>
                  <td>
                    {q > 0
                      ? `₹${(Number(i.stockistPrice) * q).toLocaleString('en-IN')}`
                      : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="summary" style={{ marginTop: 16, maxWidth: 420 }}>
        <div className="summary-row">
          <span>Items</span>
          <span>
            {lines.length} products · {units} units
          </span>
        </div>
        <div className="summary-total">
          <span>Order value</span>
          <span>₹{total.toLocaleString('en-IN')}</span>
        </div>
        <label style={{ marginTop: 10 }}>Note for the owner (optional)</label>
        <textarea
          rows={2}
          value={note}
          placeholder="e.g. Need it before the festive season"
          onChange={(e) => setNote(e.target.value)}
        />
        <button
          style={{ width: '100%', marginTop: 12 }}
          onClick={place}
          disabled={lines.length === 0 || saving}
        >
          {saving ? 'Sending…' : 'Send order request'}
        </button>
      </div>
    </main>
  );
}
