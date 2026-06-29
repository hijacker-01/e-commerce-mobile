'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, getRole, getToken } from '../../../lib/api';
import { toast } from '../../../lib/toast';

interface Product {
  id: string;
  title: string;
  price: string;
  isNew?: boolean;
}
interface SpecialOffer {
  id: string;
  productId: string;
  title: string;
  specialPrice: string;
  originalPrice: string;
  lowestPrice: string;
}
interface SaleOffer {
  id: string;
  title: string;
  bannerUrl?: string | null;
  startsAt: string;
  endsAt: string;
}

/** Default a datetime-local value to "now" / "now + 7 days". */
function localInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export default function OwnerSpecialPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [offers, setOffers] = useState<SpecialOffer[]>([]);
  const [sales, setSales] = useState<SaleOffer[]>([]);
  const [pick, setPick] = useState('');
  const [price, setPrice] = useState('');

  // Sale + alert form
  const [saleTitle, setSaleTitle] = useState('');
  const [saleBanner, setSaleBanner] = useState('');
  const [saleStart, setSaleStart] = useState(localInput(new Date()));
  const [saleEnd, setSaleEnd] = useState(
    localInput(new Date(Date.now() + 7 * 864e5)),
  );

  const [newQuery, setNewQuery] = useState('');
  const router = useRouter();

  function load() {
    api.get<Product[]>('/products').then(setProducts).catch(() => {});
    api.get<SpecialOffer[]>('/special').then(setOffers).catch(() => {});
    api.get<SaleOffer[]>('/offers/all').then(setSales).catch(() => {});
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

  const onSpecial = new Set(offers.map((o) => o.productId));
  const chosen = products.find((p) => p.id === pick);
  const now = Date.now();

  // ---- Special price (special discount) ----
  async function add() {
    if (!pick || !price) return;
    try {
      await api.post('/special', { productId: pick, specialPrice: Number(price) });
      toast('Added to the Special Store ✓');
      setPick('');
      setPrice('');
      load();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  async function remove(productId: string) {
    try {
      await api.del(`/special/${productId}`);
      toast('Removed — price restored', 'info');
      load();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  // ---- Sale + sale alert ----
  async function addSale() {
    if (!saleTitle.trim()) return toast('Give the sale a headline', 'error');
    if (new Date(saleEnd) <= new Date(saleStart))
      return toast('End must be after the start', 'error');
    try {
      await api.post('/offers', {
        title: saleTitle.trim(),
        bannerUrl: saleBanner.trim() || undefined,
        startsAt: new Date(saleStart).toISOString(),
        endsAt: new Date(saleEnd).toISOString(),
      });
      toast('Sale created — alert is live for customers ✓');
      setSaleTitle('');
      setSaleBanner('');
      load();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  async function removeSale(id: string) {
    try {
      await api.del(`/offers/${id}`);
      toast('Sale removed', 'info');
      load();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  // ---- New arrival flag ----
  async function toggleNew(p: Product) {
    try {
      await api.patch(`/products/${p.id}/flags`, { isNew: !p.isNew });
      setProducts((list) =>
        list.map((x) => (x.id === p.id ? { ...x, isNew: !p.isNew } : x)),
      );
      toast(!p.isNew ? 'Marked as New ✓' : 'New badge removed', 'info');
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  function saleState(s: SaleOffer) {
    const a = new Date(s.startsAt).getTime();
    const b = new Date(s.endsAt).getTime();
    if (now < a) return { label: 'Scheduled', cls: 'badge' };
    if (now > b) return { label: 'Ended', cls: 'mrp' };
    return { label: 'Live', cls: 'stock-in' };
  }

  const newCount = products.filter((p) => p.isNew).length;
  const filteredProducts = newQuery
    ? products.filter((p) =>
        p.title.toLowerCase().includes(newQuery.toLowerCase()),
      )
    : products;

  return (
    <main>
      <Link href="/owner" className="muted">
        ← Back to dashboard
      </Link>
      <div className="eyebrow" style={{ marginTop: 8 }}>
        Merchandising control panel
      </div>
      <h1>Special Store &amp; Sales</h1>
      <p className="muted">
        Run the storefront from one place — set <strong>special discounts</strong>,
        launch a <strong>sale with a customer alert</strong>, and flag{' '}
        <strong>new arrivals</strong>.
      </p>

      {/* ============ SALE + SALE ALERT ============ */}
      <section style={{ marginTop: 24 }}>
        <h2>🔔 Sales &amp; alerts</h2>
        <p className="muted">
          Create a sale window. While it’s live, every customer sees a sale-alert
          banner across the store linking them in.
        </p>
        <div className="card" style={{ marginTop: 8 }}>
          <strong>New sale</strong>
          <div style={{ marginTop: 10 }}>
            <label>Headline (shown in the alert)</label>
            <input
              value={saleTitle}
              onChange={(e) => setSaleTitle(e.target.value)}
              placeholder="e.g. Monsoon Sale — up to 40% off Galaxy phones"
            />
          </div>
          <div style={{ marginTop: 10 }}>
            <label>Banner image URL (optional)</label>
            <input
              value={saleBanner}
              onChange={(e) => setSaleBanner(e.target.value)}
              placeholder="https://…"
            />
          </div>
          <div className="row" style={{ marginTop: 10, gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label>Starts</label>
              <input
                type="datetime-local"
                value={saleStart}
                onChange={(e) => setSaleStart(e.target.value)}
              />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label>Ends</label>
              <input
                type="datetime-local"
                value={saleEnd}
                onChange={(e) => setSaleEnd(e.target.value)}
              />
            </div>
          </div>
          <button style={{ marginTop: 14 }} onClick={addSale}>
            Launch sale &amp; alert
          </button>
        </div>

        <h3 style={{ marginTop: 20 }}>Sales ({sales.length})</h3>
        {sales.length === 0 ? (
          <p className="muted">No sales yet.</p>
        ) : (
          <div className="card" style={{ padding: 8 }}>
            <table>
              <thead>
                <tr>
                  <th>Headline</th>
                  <th>Status</th>
                  <th>Window</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => {
                  const st = saleState(s);
                  return (
                    <tr key={s.id}>
                      <td>{s.title}</td>
                      <td>
                        <span className={st.cls}>{st.label}</span>
                      </td>
                      <td className="muted" style={{ fontSize: 13 }}>
                        {new Date(s.startsAt).toLocaleDateString('en-IN')} →{' '}
                        {new Date(s.endsAt).toLocaleDateString('en-IN')}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="secondary"
                          onClick={() => removeSale(s.id)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ============ SPECIAL DISCOUNT / SPECIAL OFFER ============ */}
      <section style={{ marginTop: 36 }}>
        <h2>🏷️ Special discounts &amp; offers</h2>
        <p className="muted">
          Shift a product here at a special price — it becomes the item’s effective
          price everywhere, and the public{' '}
          <Link href="/special">Special Store</Link> shows it with its yearly
          lowest price.
        </p>

        <div className="card" style={{ marginTop: 8 }}>
          <strong>Add a deal</strong>
          <div
            className="row"
            style={{ marginTop: 10, flexWrap: 'wrap', gap: 12 }}
          >
            <div style={{ flex: 2, minWidth: 220 }}>
              <label>Product</label>
              <select value={pick} onChange={(e) => setPick(e.target.value)}>
                <option value="">Select a product…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} {onSpecial.has(p.id) ? '(already on special)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label>Special price (₹)</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
              {chosen && (
                <p className="field-hint">
                  Current price ₹{Number(chosen.price).toLocaleString('en-IN')}
                </p>
              )}
            </div>
          </div>
          <button
            style={{ marginTop: 14 }}
            onClick={add}
            disabled={!pick || !price}
          >
            {onSpecial.has(pick) ? 'Update special price' : 'Add to Special Store'}
          </button>
        </div>

        <h3 style={{ marginTop: 20 }}>On special ({offers.length})</h3>
        {offers.length === 0 ? (
          <p className="muted">No products in the Special Store yet.</p>
        ) : (
          <div className="card" style={{ padding: 8 }}>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Special</th>
                  <th>Original</th>
                  <th>Yearly lowest</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {offers.map((o) => (
                  <tr key={o.id}>
                    <td>{o.title}</td>
                    <td>
                      <strong>
                        ₹{Number(o.specialPrice).toLocaleString('en-IN')}
                      </strong>
                    </td>
                    <td className="mrp">
                      ₹{Number(o.originalPrice).toLocaleString('en-IN')}
                    </td>
                    <td className="stock-in">
                      ₹{Number(o.lowestPrice).toLocaleString('en-IN')}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="secondary"
                        onClick={() => remove(o.productId)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ============ NEW ARRIVALS ============ */}
      <section style={{ marginTop: 36 }}>
        <h2>✨ New arrivals ({newCount})</h2>
        <p className="muted">
          Flag freshly-stocked items as <strong>New</strong> — they get a “New”
          badge on every product card across the store.
        </p>
        <input
          style={{ marginTop: 8, maxWidth: 360 }}
          value={newQuery}
          onChange={(e) => setNewQuery(e.target.value)}
          placeholder="Search products…"
        />
        <div className="card" style={{ marginTop: 10, padding: 8 }}>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Price</th>
                <th style={{ textAlign: 'right' }}>New badge</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.title}{' '}
                    {p.isNew && <span className="badge">New</span>}
                  </td>
                  <td className="muted">
                    ₹{Number(p.price).toLocaleString('en-IN')}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className={p.isNew ? 'secondary' : ''}
                      onClick={() => toggleNew(p)}
                    >
                      {p.isNew ? 'Remove' : 'Mark New'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
