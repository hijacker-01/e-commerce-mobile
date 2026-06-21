'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { api, getToken, getRole } from '../lib/api';
import { toast } from '../lib/toast';
import { getCompare, toggleCompare } from '../lib/compare';
import { getRecent, type RecentItem } from '../lib/recentlyViewed';

interface Category {
  id: string;
  name: string;
  slug: string;
}
interface Product {
  id: string;
  brand: string;
  model: string;
  title: string;
  price: string;
  mrp?: string | null;
  media?: string[];
  category?: Category | null;
  inventory?: { quantity: number } | null;
}

function Thumb({ src, alt }: { src?: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="product-thumb">
      {src && !failed ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 640px) 50vw, 240px"
          onError={() => setFailed(true)}
          style={{ objectFit: 'contain', padding: 12 }}
        />
      ) : (
        '📱'
      )}
    </div>
  );
}

function discountPct(price: string, mrp?: string | null): number | null {
  if (!mrp) return null;
  const p = Number(price);
  const m = Number(mrp);
  if (!m || m <= p) return null;
  return Math.round(((m - p) / m) * 100);
}

function PriceTag({ price, mrp }: { price: string; mrp?: string | null }) {
  const pct = discountPct(price, mrp);
  return (
    <div className="price-row">
      <span className="price" style={{ margin: 0 }}>
        ₹{Number(price).toLocaleString('en-IN')}
      </span>
      {pct && (
        <>
          <span className="mrp">₹{Number(mrp).toLocaleString('en-IN')}</span>
          <span className="discount">{pct}% off</span>
        </>
      )}
    </div>
  );
}

interface LobbyItem {
  id: string;
  product: Product;
}
interface Offer {
  id: string;
  title: string;
}
interface Facets {
  brands: string[];
  processors: string[];
  ram: string[];
  storage: string[];
  priceMin: number;
  priceMax: number;
}
interface Filters {
  brand: string;
  processor: string;
  ram: string;
  storage: string;
  price: string; // bucket key like "20000-50000" or "100000-"
}
const EMPTY_FILTERS: Filters = {
  brand: '',
  processor: '',
  ram: '',
  storage: '',
  price: '',
};
const PRICE_BUCKETS: { key: string; label: string }[] = [
  { key: '0-20000', label: 'Under ₹20,000' },
  { key: '20000-50000', label: '₹20,000 – ₹50,000' },
  { key: '50000-100000', label: '₹50,000 – ₹1,00,000' },
  { key: '100000-', label: 'Above ₹1,00,000' },
];

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [lobby, setLobby] = useState<LobbyItem[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cat, setCat] = useState<string>(''); // selected category id
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [visible, setVisible] = useState(8);
  const [compare, setCompare] = useState<string[]>([]);
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const isCustomer = getRole() === 'CUSTOMER';
  const router = useRouter();
  const PAGE = 8;

  // Keep the compare selection in sync with the floating bar / other tabs.
  useEffect(() => {
    const sync = () => setCompare(getCompare());
    sync();
    setRecent(getRecent());
    window.addEventListener('app:compare', sync);
    return () => window.removeEventListener('app:compare', sync);
  }, []);

  function onCompare(id: string) {
    const res = toggleCompare(id);
    if (res === 'full') toast('You can compare up to 4 products.', 'info');
  }

  // Single, composable query: free-text + category + all spec/price facets.
  async function load(
    categoryId = cat,
    f: Filters = filters,
    query = q,
    sortVal = sort,
  ) {
    setError(null);
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (categoryId) params.set('categoryId', categoryId);
    if (f.brand) params.set('brand', f.brand);
    if (f.processor) params.set('processor', f.processor);
    if (f.ram) params.set('ram', f.ram);
    if (f.storage) params.set('storage', f.storage);
    if (sortVal) params.set('sort', sortVal);
    if (f.price) {
      const [min, max] = f.price.split('-');
      if (min) params.set('minPrice', min);
      if (max) params.set('maxPrice', max);
    }
    try {
      setProducts(await api.get<Product[]>(`/products?${params.toString()}`));
      setVisible(PAGE); // reset paging on each new query
    } catch {
      setError('Backend not reachable. Start it with `npm run backend`.');
    } finally {
      setLoading(false);
    }
  }

  function loadFacets(categoryId: string) {
    const qs = categoryId ? `?categoryId=${categoryId}` : '';
    api.get<Facets>(`/products/meta/facets${qs}`).then(setFacets).catch(() => {});
  }

  // Apply a single filter change immediately.
  function setFilter(key: keyof Filters, value: string) {
    const next = { ...filters, [key]: value };
    setFilters(next);
    load(cat, next);
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setQ('');
    load(cat, EMPTY_FILTERS, '');
  }

  const activeFilterCount =
    Object.values(filters).filter(Boolean).length + (q ? 1 : 0);

  useEffect(() => {
    load('');
    loadFacets('');
    api.get<Category[]>('/products/meta/categories').then(setCategories).catch(() => {});
    api.get<LobbyItem[]>('/lobby').then(setLobby).catch(() => {});
    api.get<Offer[]>('/offers').then(setOffers).catch(() => {});
    if (getToken() && isCustomer) {
      api
        .get<{ product: { id: string } }[]>('/wishlist')
        .then((items) => setWishlist(new Set(items.map((w) => w.product.id))))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleWishlist(id: string) {
    if (!getToken()) {
      toast('Please log in to save items.', 'info');
      return router.push('/login');
    }
    const saved = wishlist.has(id);
    // Optimistic update.
    setWishlist((prev) => {
      const next = new Set(prev);
      if (saved) next.delete(id);
      else next.add(id);
      return next;
    });
    try {
      if (saved) await api.del(`/wishlist/${id}`);
      else await api.post(`/wishlist/${id}`);
      toast(saved ? 'Removed from wishlist' : 'Saved to wishlist ♥', 'info');
    } catch (e) {
      // Roll back on failure.
      setWishlist((prev) => {
        const next = new Set(prev);
        if (saved) next.add(id);
        else next.delete(id);
        return next;
      });
      toast((e as Error).message, 'error');
    }
  }

  // Debounced live search as the user types.
  const didMount = useRef(false);
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    const t = setTimeout(() => load(), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function selectCat(id: string) {
    setCat(id);
    // Spec filters are category-specific — reset them and refresh facets.
    setFilters(EMPTY_FILTERS);
    loadFacets(id);
    load(id, EMPTY_FILTERS);
  }

  async function addToCart(id: string) {
    if (!getToken()) {
      toast('Please log in to add items to your cart.', 'info');
      router.push('/login');
      return;
    }
    try {
      await api.post('/cart/items', { productId: id, quantity: 1 });
      toast('Added to cart');
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  return (
    <main>
      {/* Hero */}
      <section className="hero">
        <h1>The next era of smart electronics.</h1>
        <p>
          Discover flagship devices, AI-verified authenticity, and instant
          bargaining — all in one premium marketplace.
        </p>
        <div className="hero-cta">
          <a href="#shop" className="btn btn-light">
            Shop now
          </a>
          <Link href="/services" className="btn btn-ghost-light">
            Explore services
          </Link>
        </div>
        {offers.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <span className="chip" style={{ background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }}>
              🎉 Live offers · {offers.map((o) => o.title).join(' · ')}
            </span>
          </div>
        )}
      </section>

      {lobby.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2>Owner&apos;s picks</h2>
            <span className="muted">Hand-selected this week</span>
          </div>
          <div className="grid">
            {lobby.map((l) => (
              <Link key={l.id} href={`/product/${l.product.id}`} className="card">
                <Thumb src={l.product.media?.[0]} alt={l.product.title} />
                <strong>{l.product.title}</strong>
                <div className="muted">
                  {l.product.brand} {l.product.model}
                </div>
                <PriceTag price={l.product.price} mrp={l.product.mrp} />
              </Link>
            ))}
          </div>
        </section>
      )}

      {recent.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2>Recently viewed</h2>
          </div>
          <div className="hscroll">
            {recent.map((r) => (
              <Link key={r.id} href={`/product/${r.id}`} className="card hscroll-card">
                <Thumb src={r.image} alt={r.title} />
                <strong style={{ fontSize: 14 }}>{r.title}</strong>
                <PriceTag price={r.price} mrp={r.mrp} />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="section" id="shop">
        <div className="section-head">
          <h2>Shop electronics</h2>
        </div>

        {categories.length > 0 && (
          <div className="pill-row">
            <button
              className={`pill ${cat === '' ? 'active' : ''}`}
              onClick={() => selectCat('')}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                className={`pill ${cat === c.id ? 'active' : ''}`}
                onClick={() => selectCat(c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        <div className="row" style={{ margin: '0 0 16px' }}>
          <input
            placeholder="Search devices…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
          />
          <button
            className={`secondary filter-toggle ${showFilters ? 'open' : ''}`}
            onClick={() => setShowFilters((v) => !v)}
          >
            ⚙ Filters
            {activeFilterCount > 0 && (
              <span className="nav-count">{activeFilterCount}</span>
            )}
          </button>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              load(cat, filters, q, e.target.value);
            }}
            style={{ maxWidth: 190 }}
            aria-label="Sort products"
          >
            <option value="">Sort: Featured</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="newest">Newest first</option>
          </select>
        </div>

        {showFilters && facets && (
          <div className="filter-panel">
            <div className="filter-grid">
              {facets.brands.length > 1 && (
                <div>
                  <label>Brand</label>
                  <select
                    value={filters.brand}
                    onChange={(e) => setFilter('brand', e.target.value)}
                  >
                    <option value="">All brands</option>
                    {facets.brands.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {facets.processors.length > 0 && (
                <div>
                  <label>Processor</label>
                  <select
                    value={filters.processor}
                    onChange={(e) => setFilter('processor', e.target.value)}
                  >
                    <option value="">Any processor</option>
                    {facets.processors.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {facets.ram.length > 0 && (
                <div>
                  <label>RAM</label>
                  <select
                    value={filters.ram}
                    onChange={(e) => setFilter('ram', e.target.value)}
                  >
                    <option value="">Any RAM</option>
                    {facets.ram.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {facets.storage.length > 0 && (
                <div>
                  <label>Storage</label>
                  <select
                    value={filters.storage}
                    onChange={(e) => setFilter('storage', e.target.value)}
                  >
                    <option value="">Any storage</option>
                    {facets.storage.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label>Budget</label>
                <select
                  value={filters.price}
                  onChange={(e) => setFilter('price', e.target.value)}
                >
                  <option value="">Any price</option>
                  {PRICE_BUCKETS.map((b) => (
                    <option key={b.key} value={b.key}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {activeFilterCount > 0 && (
              <button
                className="secondary"
                style={{ marginTop: 14 }}
                onClick={clearFilters}
              >
                ✕ Clear all filters
              </button>
            )}
          </div>
        )}
        {error && <p className="error">{error}</p>}

        <div className="grid">
          {loading &&
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton skeleton-card" />
            ))}

          {!loading &&
            products.slice(0, visible).map((p) => {
              const inStock = !!p.inventory && p.inventory.quantity > 0;
              const pct = discountPct(p.price, p.mrp);
              const saved = wishlist.has(p.id);
              return (
                <div key={p.id} className="card">
                  {pct && <span className="discount-badge">-{pct}%</span>}
                  {isCustomer && (
                    <button
                      className={`wish-btn ${saved ? 'saved' : ''}`}
                      aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
                      onClick={() => toggleWishlist(p.id)}
                    >
                      {saved ? '♥' : '♡'}
                    </button>
                  )}
                  <Link href={`/product/${p.id}`}>
                    <Thumb src={p.media?.[0]} alt={p.title} />
                    <strong>{p.title}</strong>
                    <div className="muted">
                      {p.brand} {p.model}
                    </div>
                  </Link>
                  <PriceTag price={p.price} mrp={p.mrp} />
                  <div
                    className={inStock ? 'stock-in' : 'stock-out'}
                    style={{ marginTop: 6, fontSize: 13 }}
                  >
                    {inStock
                      ? `● ${p.inventory!.quantity} in stock`
                      : '○ Out of stock'}
                  </div>
                  <button
                    style={{ marginTop: 14, width: '100%' }}
                    onClick={() => addToCart(p.id)}
                    disabled={!inStock}
                  >
                    Add to cart
                  </button>
                  <button
                    className="secondary"
                    style={{ marginTop: 8, width: '100%' }}
                    onClick={() => onCompare(p.id)}
                  >
                    {compare.includes(p.id) ? '✓ Added to compare' : '⚖ Compare'}
                  </button>
                </div>
              );
            })}

          {!loading && !error && products.length === 0 && (
            <p className="muted">No products match your search.</p>
          )}
        </div>

        {!loading && visible < products.length && (
          <div style={{ textAlign: 'center', marginTop: 28 }}>
            <button
              className="secondary"
              onClick={() => setVisible((v) => v + PAGE)}
            >
              Load more ({products.length - visible} more)
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
