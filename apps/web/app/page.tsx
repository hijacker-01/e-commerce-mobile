'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, getToken } from '../lib/api';

interface Product {
  id: string;
  brand: string;
  model: string;
  title: string;
  price: string;
  media?: string[];
  inventory?: { quantity: number } | null;
}

function Thumb({ src, alt }: { src?: string; alt: string }) {
  return (
    <div className="product-thumb">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      ) : (
        '📱'
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

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [lobby, setLobby] = useState<LobbyItem[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [q, setQ] = useState('');
  const [brand, setBrand] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function load() {
    setError(null);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (brand) params.set('brand', brand);
    try {
      if (q || brand) {
        // Faceted search (Meilisearch, with a DB fallback server-side).
        const res = await api.get<{ hits: Product[] }>(
          `/search?${params.toString()}`,
        );
        setProducts(res.hits);
      } else {
        setProducts(await api.get<Product[]>('/products'));
      }
    } catch {
      setError('Backend not reachable. Start it with `npm run backend`.');
    }
  }

  useEffect(() => {
    load();
    api.get<LobbyItem[]>('/lobby').then(setLobby).catch(() => {});
    api.get<Offer[]>('/offers').then(setOffers).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addToCart(id: string) {
    if (!getToken()) {
      setNote('Please log in to add to cart.');
      return;
    }
    try {
      await api.post('/cart/items', { productId: id, quantity: 1 });
      setNote('Added to cart ✓');
    } catch (e) {
      setNote((e as Error).message);
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
                <div className="price">₹{l.product.price}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="section" id="shop">
        <div className="section-head">
          <h2>Shop electronics</h2>
        </div>
        <div className="row" style={{ margin: '0 0 24px' }}>
          <input
            placeholder="Search devices…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <input
            placeholder="Brand"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            style={{ maxWidth: 180 }}
          />
          <button onClick={load}>Filter</button>
        </div>
        {note && <p className="muted">{note}</p>}
        {error && <p className="error">{error}</p>}
        <div className="grid">
          {products.map((p) => {
            const inStock = !!p.inventory && p.inventory.quantity > 0;
            return (
              <div key={p.id} className="card">
                <Link href={`/product/${p.id}`}>
                  <Thumb src={p.media?.[0]} alt={p.title} />
                  <strong>{p.title}</strong>
                  <div className="muted">
                    {p.brand} {p.model}
                  </div>
                </Link>
                <div className="price">₹{p.price}</div>
                <div
                  className={inStock ? 'stock-in' : 'stock-out'}
                  style={{ marginTop: 4, fontSize: 13 }}
                >
                  {inStock ? `● ${p.inventory!.quantity} in stock` : '○ Out of stock'}
                </div>
                <button
                  style={{ marginTop: 14, width: '100%' }}
                  onClick={() => addToCart(p.id)}
                  disabled={!inStock}
                >
                  Add to cart
                </button>
              </div>
            );
          })}
          {!error && products.length === 0 && (
            <p className="muted">No products.</p>
          )}
        </div>
      </section>
    </main>
  );
}
