'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getRole, getToken } from '../../../lib/api';
import { toast } from '../../../lib/toast';

interface StockRow {
  id: string;
  title: string;
  brand: string;
  model: string;
  category: string | null;
  price: string;
  quantity: number;
  reorderLevel: number;
}

export default function InventoryPage() {
  const [rows, setRows] = useState<StockRow[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const router = useRouter();

  function load() {
    api.get<StockRow[]>('/products/meta/stock').then(setRows).catch(() => {});
  }

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    const role = getRole();
    if (role !== 'OWNER' && role !== 'EMPLOYEE') {
      router.push('/');
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) =>
      `${r.title} ${r.brand} ${r.model} ${r.category ?? ''}`
        .toLowerCase()
        .includes(term),
    );
  }, [rows, q]);

  const lowCount = rows.filter((r) => r.quantity <= r.reorderLevel).length;

  async function save(id: string) {
    const raw = edits[id];
    const quantity = Number(raw);
    if (raw === undefined || Number.isNaN(quantity) || quantity < 0) {
      toast('Enter a valid quantity.', 'error');
      return;
    }
    setSaving(id);
    try {
      await api.patch(`/products/${id}/stock`, { quantity });
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, quantity } : r)),
      );
      setEdits((e) => {
        const next = { ...e };
        delete next[id];
        return next;
      });
      toast('Stock updated ✓');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setSaving(null);
    }
  }

  function step(id: string, current: number, delta: number) {
    const base = edits[id] !== undefined ? Number(edits[id]) : current;
    const next = Math.max(0, (Number.isNaN(base) ? current : base) + delta);
    setEdits((e) => ({ ...e, [id]: String(next) }));
  }

  return (
    <main>
      <h1>📦 Stock</h1>
      <p className="muted" style={{ marginTop: -6 }}>
        Live inventory — set exactly how many of each device you have. Only you
        and your staff see these numbers; customers just see “In stock”.
      </p>

      <div
        className="row"
        style={{ margin: '14px 0', flexWrap: 'wrap', gap: 10 }}
      >
        <input
          placeholder="Search device, brand, model…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        <span className="muted" style={{ alignSelf: 'center' }}>
          {rows.length} products
          {lowCount > 0 && (
            <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
              {' '}· {lowCount} low
            </span>
          )}
        </span>
      </div>

      <div className="card stock-lines">
        {filtered.map((r) => {
          const edited = edits[r.id] !== undefined;
          const low = r.quantity <= r.reorderLevel;
          return (
            <div className="stock-line" key={r.id}>
              <div className="stock-line-info">
                <div className="stock-line-title">{r.title}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {r.brand} · {r.category ?? '—'} · ₹
                  {Number(r.price).toLocaleString('en-IN')}
                </div>
              </div>
              <div className="stock-line-now">
                <span className={low ? 'stock-out' : 'stock-in'}>
                  {r.quantity} in stock
                </span>
              </div>
              <div className="stock-line-edit">
                <div className="stepper">
                  <button
                    className="secondary"
                    aria-label="Decrease"
                    onClick={() => step(r.id, r.quantity, -1)}
                  >
                    −
                  </button>
                  <input
                    className="stock-qty"
                    type="number"
                    min={0}
                    value={edited ? edits[r.id] : String(r.quantity)}
                    onChange={(e) =>
                      setEdits((s) => ({ ...s, [r.id]: e.target.value }))
                    }
                  />
                  <button
                    className="secondary"
                    aria-label="Increase"
                    onClick={() => step(r.id, r.quantity, 1)}
                  >
                    +
                  </button>
                </div>
                <button
                  className={edited ? 'success' : 'secondary'}
                  disabled={!edited || saving === r.id}
                  onClick={() => save(r.id)}
                >
                  {saving === r.id ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="muted" style={{ padding: 12 }}>
            No products match “{q}”.
          </p>
        )}
      </div>
    </main>
  );
}
