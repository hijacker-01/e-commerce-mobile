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
  inventory?: { quantity: number } | null;
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
      {offers.length > 0 && (
        <div
          className="card"
          style={{ borderColor: 'var(--accent)', marginBottom: 16 }}
        >
          🎉 <strong>Live offers:</strong>{' '}
          {offers.map((o) => o.title).join(' · ')}
        </div>
      )}
      {lobby.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <h2>✨ Owner&apos;s picks</h2>
          <div className="grid">
            {lobby.map((l) => (
              <Link key={l.id} href={`/product/${l.product.id}`} className="card">
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
      <h1>Shop electronics</h1>
      <div className="row" style={{ margin: '12px 0 20px' }}>
        <input
          placeholder="Search devices…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <input
          placeholder="Brand"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          style={{ maxWidth: 160 }}
        />
        <button onClick={load}>Filter</button>
      </div>
      {note && <p className="muted">{note}</p>}
      {error && <p className="error">{error}</p>}
      <div className="grid">
        {products.map((p) => (
          <div key={p.id} className="card">
            <Link href={`/product/${p.id}`}>
              <strong>{p.title}</strong>
              <div className="muted">
                {p.brand} {p.model}
              </div>
            </Link>
            <div className="price">₹{p.price}</div>
            <div className="muted" style={{ marginTop: 4 }}>
              {p.inventory && p.inventory.quantity > 0
                ? `${p.inventory.quantity} in stock`
                : 'Out of stock'}
            </div>
            <button
              style={{ marginTop: 10, width: '100%' }}
              onClick={() => addToCart(p.id)}
            >
              Add to cart
            </button>
          </div>
        ))}
        {!error && products.length === 0 && <p className="muted">No products.</p>}
      </div>
    </main>
  );
}
