'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, getRole, getToken } from '../../lib/api';
import { toast } from '../../lib/toast';
import { PHONES } from '../../lib/phones';

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
  const [isOwner, setIsOwner] = useState(false);
  const router = useRouter();

  function loadOrders(owner: boolean) {
    api.get<Order[]>('/orders').then(setOrders).catch(() => {});
    // The revenue / GST summary is owner-only — employees don't see the money.
    if (owner) api.get<Summary>('/analytics/summary').then(setStats).catch(() => {});
  }

  useEffect(() => {
    const role = getRole();
    if (!getToken() || (role !== 'OWNER' && role !== 'EMPLOYEE')) {
      router.push('/login');
      return;
    }
    const owner = role === 'OWNER';
    setIsOwner(owner);
    loadOrders(owner);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function advance(id: string, status: string) {
    try {
      await api.patch(`/orders/${id}/status`, { status });
      toast(`Order → ${status}`);
      loadOrders(isOwner);
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
      <h1>{isOwner ? 'Owner dashboard' : 'Employee console'}</h1>
      {!isOwner && (
        <p className="muted" style={{ marginTop: -6 }}>
          Your tools for day-to-day shop operations — process orders, list
          products, answer customers and handle returns.
        </p>
      )}
      <div className="row" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
        {/* Employee-safe operational tools */}
        <a className="btn" href="#add-product">
          ➕ Add product
        </a>
        <Link className="btn secondary" href="/owner/questions">
          Customer Q&amp;A
        </Link>
        <Link className="btn secondary" href="/owner/returns">
          Returns
        </Link>
        <Link className="btn secondary" href="/chat">
          💬 Bargains
        </Link>

        {/* Owner-only controls (finance, pricing, staff, wholesale, audit) */}
        {isOwner && (
          <>
            <Link className="btn secondary" href="/owner/stockist-orders">
              Stockist orders
            </Link>
            <Link className="btn secondary" href="/owner/stockists">
              Stockists &amp; challans
            </Link>
            <Link className="btn secondary" href="/owner/staff">
              Employees &amp; stockists
            </Link>
            <Link className="btn secondary" href="/owner/credit">
              Customer credit
            </Link>
            <Link className="btn secondary" href="/owner/special">
              ✦ Special Store
            </Link>
            <Link className="btn secondary" href="/owner/storefront">
              Storefront (lobby + services)
            </Link>
            <Link className="btn secondary" href="/owner/archive">
              Archive &amp; backup
            </Link>
            <Link className="btn secondary" href="/owner/audit">
              Audit log
            </Link>
          </>
        )}
      </div>

      {isOwner && stats && (
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

      <ProductCreator onCreated={() => loadOrders(isOwner)} />
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
interface CatalogTemplate {
  brand: string;
  model: string;
  title: string;
  description: string | null;
  price: number;
  mrp: number | null;
  categoryId: string;
  specs: Record<string, unknown>;
}
interface CatalogSuggest {
  brands: string[];
  modelsByBrand: Record<string, string[]>;
  processors: string[];
  ram: string[];
  storage: string[];
  camera: string[];
  templates: CatalogTemplate[];
}

const DEFAULT_RAM = ['4GB', '6GB', '8GB', '12GB', '16GB'];
const DEFAULT_STORAGE = ['64GB', '128GB', '256GB', '512GB', '1TB'];
const DEFAULT_CAMERA = ['12MP', '48MP', '50MP', '64MP', '108MP', '200MP'];
const uniqSort = (arr: string[]) =>
  [...new Set(arr.filter(Boolean))].sort((a, b) => a.localeCompare(b));

function ProductCreator({ onCreated }: { onCreated: () => void }) {
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [mrp, setMrp] = useState('');
  const [stockistPrice, setStockistPrice] = useState('');
  const [description, setDescription] = useState('');
  // Key specs — also self-learning datalists.
  const [processor, setProcessor] = useState('');
  const [ram, setRam] = useState('');
  const [storage, setStorage] = useState('');
  const [camera, setCamera] = useState('');
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
  const [suggest, setSuggest] = useState<CatalogSuggest | null>(null);
  const [autoFilled, setAutoFilled] = useState(false);
  // Extra spec keys (battery, etc.) carried over from a matched template.
  const baseSpecsRef = useRef<Record<string, unknown>>({});
  const autofilledKeyRef = useRef('');

  function loadSuggest() {
    api
      .get<CatalogSuggest>('/products/meta/catalog-suggest')
      .then(setSuggest)
      .catch(() => {});
  }

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
    loadSuggest();
  }, []);

  // Smart auto-fill: once brand + model match a device already in the
  // catalogue, fill in any blank fields from it (never clobbering edits).
  useEffect(() => {
    if (!suggest || !brand.trim() || !model.trim()) return;
    const key = `${brand}|${model}`.trim().toLowerCase();
    if (autofilledKeyRef.current === key) return;
    const t = suggest.templates.find(
      (x) => `${x.brand}|${x.model}`.toLowerCase() === key,
    );
    if (!t) return;
    autofilledKeyRef.current = key;
    baseSpecsRef.current = t.specs ?? {};
    setTitle((v) => v || t.title || '');
    setDescription((v) => v || t.description || '');
    setPrice((v) => v || (t.price ? String(t.price) : ''));
    setMrp((v) => v || (t.mrp ? String(t.mrp) : ''));
    const sp = t.specs ?? {};
    if (sp.processor) setProcessor((v) => v || String(sp.processor));
    if (sp.ram) setRam((v) => v || String(sp.ram));
    if (sp.storage) setStorage((v) => v || String(sp.storage));
    if (sp.camera) setCamera((v) => v || String(sp.camera));
    setAutoFilled(true);
    toast('✨ Auto-filled from your catalog — edit anything');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand, model, suggest]);

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
      // Carry over extra spec keys from any matched template, then apply the
      // four editable spec fields on top.
      const specs: Record<string, unknown> = { ...baseSpecsRef.current };
      const apply = (k: string, val: string) => {
        if (val.trim()) specs[k] = val.trim();
        else delete specs[k];
      };
      apply('processor', processor);
      apply('ram', ram);
      apply('storage', storage);
      apply('camera', camera);

      await api.post('/products', {
        shopId,
        categoryId,
        brand,
        model,
        title,
        description,
        price: Number(price),
        mrp: mrp ? Number(mrp) : undefined,
        stockistPrice: stockistPrice ? Number(stockistPrice) : undefined,
        specs: Object.keys(specs).length ? specs : undefined,
        media: mediaList,
      });
      toast('Product listed ✓');
      // Reset the form for the next entry.
      setBrand('');
      setModel('');
      setTitle('');
      setPrice('');
      setMrp('');
      setStockistPrice('');
      setDescription('');
      setProcessor('');
      setRam('');
      setStorage('');
      setCamera('');
      setMediaList([]);
      setUrlInput('');
      setAutoFilled(false);
      baseSpecsRef.current = {};
      autofilledKeyRef.current = '';
      // Re-pull suggestions so this brand / model / spec is instantly learned.
      loadSuggest();
      onCreated();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  // Merge the shop's own catalogue (self-learning) with the curated phone
  // list so suggestions are useful from day one.
  const brandOptions = uniqSort([
    ...(suggest?.brands ?? []),
    ...PHONES.map((p) => p.brand),
  ]);
  const phoneBrand = PHONES.find(
    (p) => p.brand.toLowerCase() === brand.trim().toLowerCase(),
  );
  const modelOptions = uniqSort([
    ...(brand
      ? suggest?.modelsByBrand[brand] ?? []
      : Object.values(suggest?.modelsByBrand ?? {}).flat()),
    ...(brand
      ? phoneBrand?.models.map((m) => m.name) ?? []
      : PHONES.flatMap((p) => p.models.map((m) => m.name))),
  ]);
  const ramOptions = uniqSort([...(suggest?.ram ?? []), ...DEFAULT_RAM]);
  const storageOptions = uniqSort([...(suggest?.storage ?? []), ...DEFAULT_STORAGE]);
  const cameraOptions = uniqSort([...(suggest?.camera ?? []), ...DEFAULT_CAMERA]);
  const processorOptions = uniqSort(suggest?.processors ?? []);

  const canPublish = !!(shopId && categoryId && brand && model && title && price);

  return (
    <div
      id="add-product"
      className="card"
      style={{ marginTop: 28, scrollMarginTop: 90 }}
    >
      <h2 style={{ marginTop: 0 }}>➕ List a product</h2>
      <p className="field-hint" style={{ marginTop: -6 }}>
        Start typing — brand, model and specs suggest from your catalogue. A
        known device auto-fills its details; anything new you type is saved and
        suggested next time.
      </p>
      <div className="row">
        <div style={{ flex: 1 }}>
          <label>Brand</label>
          <input
            list="pc-brands"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="e.g. Samsung"
          />
          <datalist id="pc-brands">
            {brandOptions.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
        </div>
        <div style={{ flex: 1 }}>
          <label>Model</label>
          <input
            list="pc-models"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="e.g. Galaxy A55 5G"
          />
          <datalist id="pc-models">
            {modelOptions.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
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
      {autoFilled && (
        <p
          className="field-hint"
          style={{ color: 'var(--success, #15803d)', fontWeight: 600 }}
        >
          ✨ Auto-filled from your catalogue — review &amp; edit anything below.
        </p>
      )}

      <label>Title</label>
      <input value={title} onChange={(e) => setTitle(e.target.value)} />
      <label>Description</label>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      {/* Key specs — self-learning datalists */}
      <label>Key specs</label>
      <div className="row" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 140 }}>
          <input
            list="pc-processor"
            value={processor}
            onChange={(e) => setProcessor(e.target.value)}
            placeholder="Processor"
          />
          <datalist id="pc-processor">
            {processorOptions.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </div>
        <div style={{ flex: 1, minWidth: 110 }}>
          <input
            list="pc-ram"
            value={ram}
            onChange={(e) => setRam(e.target.value)}
            placeholder="RAM"
          />
          <datalist id="pc-ram">
            {ramOptions.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </div>
        <div style={{ flex: 1, minWidth: 110 }}>
          <input
            list="pc-storage"
            value={storage}
            onChange={(e) => setStorage(e.target.value)}
            placeholder="Storage"
          />
          <datalist id="pc-storage">
            {storageOptions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        <div style={{ flex: 1, minWidth: 110 }}>
          <input
            list="pc-camera"
            value={camera}
            onChange={(e) => setCamera(e.target.value)}
            placeholder="Camera"
          />
          <datalist id="pc-camera">
            {cameraOptions.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
      </div>
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
        <div style={{ flex: 1 }}>
          <label>Stockist / wholesale price (₹)</label>
          <input
            type="number"
            value={stockistPrice}
            placeholder="defaults to 85% of price"
            onChange={(e) => setStockistPrice(e.target.value)}
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
