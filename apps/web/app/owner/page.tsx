'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getRole, getToken } from '../../lib/api';

interface Order {
  id: string;
  number: string;
  status: string;
  total: string;
}
interface Invoice {
  id: string;
  number: string;
  cgst: string;
  sgst: string;
  igst: string;
  total: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

// PDF endpoints are JWT-protected, so fetch as a blob (a plain <a> can't send
// the auth header) and trigger a download.
async function downloadPdf(path: string, filename: string) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_URL}/api${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) return;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
interface Summary {
  revenuePaid: string;
  paidOrders: number;
  inventoryValue: string;
  lowStockCount: number;
  gstCollected: string;
  topProducts: { title: string; unitsSold: number }[];
}

export default function OwnerPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Summary | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  function loadOrders() {
    api.get<Order[]>('/orders').then(setOrders).catch(() => {});
    api.get<Summary>('/analytics/summary').then(setStats).catch(() => {});
  }

  useEffect(() => {
    const role = getRole();
    if (!getToken() || (role !== 'OWNER' && role !== 'EMPLOYEE')) {
      router.push('/login');
      return;
    }
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function advance(id: string, status: string) {
    try {
      await api.patch(`/orders/${id}/status`, { status });
      setMsg(`Order → ${status}`);
      loadOrders();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  async function makeInvoice(id: string) {
    try {
      const inv = await api.post<Invoice>('/invoices', { orderId: id, type: 'GST' });
      setMsg(
        `Invoice ${inv.number}: CGST ₹${inv.cgst} + SGST ₹${inv.sgst} + IGST ₹${inv.igst} = ₹${inv.total}`,
      );
      // Download the generated GST invoice + warranty card PDFs.
      await downloadPdf(`/invoices/${inv.id}/pdf`, `${inv.number}.pdf`);
      await downloadPdf(
        `/invoices/${inv.id}/warranty.pdf`,
        `${inv.number}-warranty.pdf`,
      );
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <main>
      <h1>Owner dashboard</h1>
      <div className="row" style={{ marginBottom: 8 }}>
        <a className="btn" href="/owner/stockists">
          Stockists & challans
        </a>
        <a className="btn secondary" href="/owner/credit">
          Customer credit
        </a>
      </div>
      {msg && <p className="muted">{msg}</p>}

      {stats && (
        <div className="grid" style={{ marginBottom: 24 }}>
          <div className="card">
            <div className="muted">Paid revenue</div>
            <div className="price" style={{ fontSize: 22 }}>
              ₹{stats.revenuePaid}
            </div>
            <div className="muted">{stats.paidOrders} paid orders</div>
          </div>
          <div className="card">
            <div className="muted">Inventory value</div>
            <div className="price" style={{ fontSize: 22 }}>
              ₹{stats.inventoryValue}
            </div>
            <div className="muted">{stats.lowStockCount} low-stock items</div>
          </div>
          <div className="card">
            <div className="muted">GST collected</div>
            <div className="price" style={{ fontSize: 22 }}>
              ₹{stats.gstCollected}
            </div>
          </div>
          <div className="card">
            <div className="muted">Top sellers</div>
            {stats.topProducts.length === 0 ? (
              <div className="muted">—</div>
            ) : (
              stats.topProducts.map((t) => (
                <div key={t.title} style={{ fontSize: 13, marginTop: 4 }}>
                  {t.title} · <span className="muted">{t.unitsSold} sold</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <h2>Orders</h2>
      <table>
        <thead>
          <tr>
            <th>Order</th>
            <th>Status</th>
            <th>Total</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td>{o.number}</td>
              <td>
                <span className="badge">{o.status}</span>
              </td>
              <td>₹{o.total}</td>
              <td className="row">
                {o.status === 'REQUESTED' && (
                  <button className="success" onClick={() => advance(o.id, 'APPROVED')}>
                    Approve
                  </button>
                )}
                {o.status === 'APPROVED' && (
                  <button onClick={() => advance(o.id, 'OUT_FOR_DELIVERY')}>
                    Dispatch
                  </button>
                )}
                <button className="secondary" onClick={() => makeInvoice(o.id)}>
                  GST invoice
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {orders.length === 0 && <p className="muted">No orders.</p>}

      <ProductCreator onCreated={() => setMsg('Product listed ✓')} />
    </main>
  );
}

interface DraftResp {
  draft: {
    title?: string;
    description?: string;
    specs?: Record<string, unknown>;
    suggestedPriceMinInr?: number;
  } | null;
}
function ProductCreator({ onCreated }: { onCreated: () => void }) {
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  // Shop/Category IDs are pasted by the owner (no public lookup endpoint yet).
  const [shopId, setShopId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function aiDraft() {
    setErr(null);
    setBusy(true);
    try {
      const r = await api.post<DraftResp>('/ai/draft-listing', { brand, model });
      if (r.draft) {
        setTitle(r.draft.title ?? `${brand} ${model}`);
        setDescription(r.draft.description ?? '');
        if (r.draft.suggestedPriceMinInr)
          setPrice(String(r.draft.suggestedPriceMinInr));
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function create() {
    setErr(null);
    try {
      await api.post('/products', {
        shopId,
        categoryId,
        brand,
        model,
        title,
        description,
        price: Number(price),
      });
      onCreated();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <div className="card" style={{ marginTop: 28 }}>
      <h2 style={{ marginTop: 0 }}>List a product</h2>
      <div className="row">
        <div style={{ flex: 1 }}>
          <label>Brand</label>
          <input value={brand} onChange={(e) => setBrand(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label>Model</label>
          <input value={model} onChange={(e) => setModel(e.target.value)} />
        </div>
      </div>
      <button
        className="secondary"
        style={{ marginTop: 10 }}
        onClick={aiDraft}
        disabled={busy || !brand || !model}
      >
        {busy ? 'Researching…' : '✨ AI auto-fill from brand + model'}
      </button>

      <label>Title</label>
      <input value={title} onChange={(e) => setTitle(e.target.value)} />
      <label>Description</label>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className="row">
        <div style={{ flex: 1 }}>
          <label>Price (₹)</label>
          <input value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
      </div>
      <label>Shop ID</label>
      <input value={shopId} onChange={(e) => setShopId(e.target.value)} />
      <label>Category ID</label>
      <input value={categoryId} onChange={(e) => setCategoryId(e.target.value)} />
      {err && (
        <p className="error" style={{ marginTop: 8 }}>
          {err}
        </p>
      )}
      <button style={{ marginTop: 14 }} onClick={create}>
        Publish listing
      </button>
    </div>
  );
}
