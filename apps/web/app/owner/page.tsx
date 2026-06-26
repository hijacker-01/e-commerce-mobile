'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, getRole, getToken } from '../../lib/api';
import { toast } from '../../lib/toast';

function statusColor(status: string): string {
  const s = status.toUpperCase();
  if (['DELIVERED', 'APPROVED', 'COMPLETED', 'PAID'].includes(s)) return '#15803d';
  if (['CANCELLED', 'REJECTED', 'RETURNED'].includes(s)) return '#dc2626';
  if (['REQUESTED', 'PENDING', 'AWAITING'].includes(s)) return '#b45309';
  return '#1428a0';
}

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
      toast(`Order → ${status}`);
      loadOrders();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  async function makeInvoice(id: string) {
    try {
      const inv = await api.post<Invoice>('/invoices', { orderId: id, type: 'GST' });
      toast(`Invoice ${inv.number} · ₹${inv.total} — downloading PDFs…`);
      // Download the generated GST invoice + warranty card PDFs.
      await downloadPdf(`/invoices/${inv.id}/pdf`, `${inv.number}.pdf`);
      await downloadPdf(
        `/invoices/${inv.id}/warranty.pdf`,
        `${inv.number}-warranty.pdf`,
      );
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  return (
    <main>
      <h1>Owner dashboard</h1>
      <div className="row" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
        <Link className="btn" href="/owner/stockists">
          Stockists &amp; challans
        </Link>
        <Link className="btn secondary" href="/owner/credit">
          Customer credit
        </Link>
        <Link className="btn secondary" href="/owner/storefront">
          Storefront (lobby + services)
        </Link>
        <Link className="btn secondary" href="/owner/returns">
          Returns
        </Link>
        <Link className="btn secondary" href="/owner/questions">
          Customer Q&amp;A
        </Link>
        <Link className="btn secondary" href="/owner/audit">
          Audit log
        </Link>
      </div>

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
            <div
              className="muted"
              style={
                stats.lowStockCount > 0
                  ? { color: 'var(--danger)', fontWeight: 600 }
                  : undefined
              }
            >
              {stats.lowStockCount > 0 ? '⚠ ' : ''}
              {stats.lowStockCount} low-stock items
            </div>
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
                <span className="badge" style={{ background: statusColor(o.status) }}>
                  {o.status}
                </span>
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

      <ProductCreator onCreated={() => loadOrders()} />
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
interface Lookup {
  id: string;
  name: string;
}
function ProductCreator({ onCreated }: { onCreated: () => void }) {
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [mrp, setMrp] = useState('');
  const [description, setDescription] = useState('');
  const [mediaList, setMediaList] = useState<string[]>([]);
  const [imgTab, setImgTab] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [shops, setShops] = useState<Lookup[]>([]);
  const [categories, setCategories] = useState<Lookup[]>([]);
  const [shopId, setShopId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load lookups so the owner picks from dropdowns (no pasting raw IDs).
  useEffect(() => {
    api.get<Lookup[]>('/products/meta/shops').then((s) => {
      setShops(s);
      if (s[0]) setShopId(s[0].id);
    }).catch(() => {});
    api.get<Lookup[]>('/products/meta/categories').then((c) => {
      setCategories(c);
      if (c[0]) setCategoryId(c[0].id);
    }).catch(() => {});
  }, []);

  async function aiDraft() {
    setBusy(true);
    try {
      const r = await api.post<DraftResp>('/ai/draft-listing', { brand, model });
      if (r.draft) {
        setTitle(r.draft.title ?? `${brand} ${model}`);
        setDescription(r.draft.description ?? '');
        if (r.draft.suggestedPriceMinInr)
          setPrice(String(r.draft.suggestedPriceMinInr));
        toast('AI draft ready — review & publish');
      }
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  function addUrl() {
    const u = urlInput.trim();
    if (!u) return;
    setMediaList((m) => [...m, u]);
    setUrlInput('');
  }

  function removeImg(i: number) {
    setMediaList((m) => m.filter((_, idx) => idx !== i));
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/uploads`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? 'Upload failed');
      setMediaList((m) => [...m, data.url]);
      toast('Image uploaded ✓');
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setUploading(false);
    }
  }

  async function create() {
    setSaving(true);
    try {
      await api.post('/products', {
        shopId,
        categoryId,
        brand,
        model,
        title,
        description,
        price: Number(price),
        mrp: mrp ? Number(mrp) : undefined,
        media: mediaList,
      });
      toast('Product listed ✓');
      // Reset the form for the next entry.
      setBrand('');
      setModel('');
      setTitle('');
      setPrice('');
      setMrp('');
      setDescription('');
      setMediaList([]);
      setUrlInput('');
      onCreated();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  const canPublish = !!(shopId && categoryId && brand && model && title && price);

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
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label>MRP (₹) — optional</label>
          <input
            type="number"
            value={mrp}
            onChange={(e) => setMrp(e.target.value)}
          />
        </div>
      </div>
      <div className="row">
        <div style={{ flex: 1 }}>
          <label>Category</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label>Shop</label>
          <select value={shopId} onChange={(e) => setShopId(e.target.value)}>
            {shops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <label>Images</label>
      <div className="img-picker">
        <div className="img-tabs">
          <button
            type="button"
            className={`img-tab ${imgTab === 'upload' ? 'active' : ''}`}
            onClick={() => setImgTab('upload')}
          >
            📁 Browse
          </button>
          <button
            type="button"
            className={`img-tab ${imgTab === 'url' ? 'active' : ''}`}
            onClick={() => setImgTab('url')}
          >
            🔗 From URL
          </button>
        </div>

        {imgTab === 'upload' ? (
          <label className="upload-drop">
            <input
              type="file"
              accept="image/*"
              onChange={onPickFile}
              style={{ display: 'none' }}
            />
            {uploading ? 'Uploading…' : '＋ Choose an image from your device'}
          </label>
        ) : (
          <div className="row">
            <input
              placeholder="https://…/photo.jpg"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addUrl();
                }
              }}
            />
            <button type="button" className="secondary" onClick={addUrl}>
              Add
            </button>
          </div>
        )}

        {mediaList.length > 0 && (
          <div className="img-strip">
            {mediaList.map((src, i) => (
              <div key={i} className="img-chip">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`image ${i + 1}`} />
                <button
                  type="button"
                  className="img-x"
                  aria-label="Remove image"
                  onClick={() => removeImg(i)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        style={{ marginTop: 14 }}
        onClick={create}
        disabled={!canPublish || saving}
      >
        {saving ? 'Publishing…' : 'Publish listing'}
      </button>
    </div>
  );
}
