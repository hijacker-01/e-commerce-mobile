'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getToken } from '../../../lib/api';

interface Product {
  id: string;
  brand: string;
  model: string;
  title: string;
  description?: string;
  price: string;
  media?: string[];
  specs: Record<string, unknown>;
  videoLinks: string[];
  inventory?: { quantity: number } | null;
  shop?: {
    name: string;
    address?: string | null;
    hours?: string | null;
    phone?: string | null;
  } | null;
}
interface Review {
  id: string;
  rating: number;
  text?: string;
  verified: boolean;
  user?: { name: string };
}
interface ReviewSummary {
  summary: string;
  pros: string[];
  cons: string[];
  sentiment: string;
}

export default function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    api.get<Product>(`/products/${id}`).then(setProduct).catch(() => {});
    api.get<Review[]>(`/reviews/product/${id}`).then(setReviews).catch(() => {});
  }, [id]);

  async function addToCart() {
    if (!getToken()) return setNote('Please log in first.');
    try {
      await api.post('/cart/items', { productId: id, quantity: 1 });
      setNote('Added to cart ✓');
    } catch (e) {
      setNote((e as Error).message);
    }
  }

  async function saveToWishlist() {
    if (!getToken()) return setNote('Please log in first.');
    try {
      await api.post(`/wishlist/${id}`);
      setNote('Saved to wishlist ♥');
    } catch (e) {
      setNote((e as Error).message);
    }
  }

  async function bargain() {
    if (!getToken()) return setNote('Please log in first.');
    try {
      const t = await api.post<{ id: string }>('/chat/threads', {
        productId: id,
      });
      router.push(`/chat?thread=${t.id}`);
    } catch (e) {
      setNote((e as Error).message);
    }
  }

  async function loadSummary() {
    setNote('Generating AI review summary…');
    try {
      const s = await api.get<ReviewSummary | null>(
        `/reviews/product/${id}/summary`,
      );
      setSummary(s);
      setNote(s ? null : 'No reviews to summarize yet.');
    } catch (e) {
      setNote((e as Error).message);
    }
  }

  if (!product) return <p className="muted">Loading…</p>;

  const inStock = !!product.inventory && product.inventory.quantity > 0;

  return (
    <main>
      <div className="detail-grid">
        {/* Gallery */}
        <div className="gallery">
          {product.media?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.media[0]}
              alt={product.title}
              style={{ maxWidth: '85%', maxHeight: '85%', objectFit: 'contain' }}
            />
          ) : (
            '📱'
          )}
        </div>

        {/* Buy box */}
        <div className="buybox">
          <div className="eyebrow">{product.brand}</div>
          <h1 style={{ marginBottom: 4 }}>{product.title}</h1>
          <div className="muted">{product.model}</div>
          <div className="price" style={{ fontSize: 30, marginTop: 18 }}>
            ₹{Number(product.price).toLocaleString('en-IN')}
          </div>
          <div
            className={inStock ? 'stock-in' : 'stock-out'}
            style={{ marginTop: 6, fontSize: 13 }}
          >
            {inStock
              ? `● In stock · ${product.inventory!.quantity} available`
              : '○ Out of stock'}
          </div>

          {product.description && (
            <p style={{ marginTop: 16, lineHeight: 1.6 }}>
              {product.description}
            </p>
          )}

          <div className="row" style={{ marginTop: 22, flexWrap: 'wrap' }}>
            <button
              onClick={addToCart}
              disabled={!inStock}
              style={{ flex: 1, minWidth: 140 }}
            >
              Add to cart
            </button>
            <button className="secondary" onClick={bargain}>
              💬 Bargain
            </button>
            <button className="secondary" onClick={saveToWishlist}>
              ♥ Save
            </button>
          </div>
          {note && (
            <p className="muted" style={{ marginTop: 10 }}>
              {note}
            </p>
          )}

          <div className="divider" />

          <strong style={{ fontSize: 14 }}>No-cost EMI</strong>
          <div
            className="row"
            style={{ marginTop: 10, flexWrap: 'wrap', gap: 10 }}
          >
            {[3, 6, 9, 12].map((m) => (
              <span key={m} className="emi-pill">
                <span className="muted">{m} months</span>
                <b>
                  ₹
                  {Math.round(Number(product.price) / m).toLocaleString('en-IN')}
                  /mo
                </b>
              </span>
            ))}
          </div>

          {product.shop && (
            <>
              <div className="divider" />
              <strong style={{ fontSize: 14 }}>📍 Shop &amp; pickup</strong>
              <div style={{ marginTop: 6 }}>{product.shop.name}</div>
              {product.shop.address && (
                <div className="muted">{product.shop.address}</div>
              )}
              {product.shop.hours && (
                <div className="muted">Hours: {product.shop.hours}</div>
              )}
              {product.shop.phone && (
                <a href={`tel:${product.shop.phone}`} className="muted">
                  📞 {product.shop.phone}
                </a>
              )}
            </>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 36 }}>
        <strong>Specifications</strong>
        <table style={{ marginTop: 8 }}>
          <tbody>
            {Object.entries(product.specs ?? {}).map(([k, v]) => (
              <tr key={k}>
                <td className="muted">{k}</td>
                <td>{String(v)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={{ marginTop: 36 }}>Reviews</h2>
      <button className="secondary" onClick={loadSummary}>
        ✨ AI summary
      </button>
      {summary && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="badge">{summary.sentiment}</div>
          <p>{summary.summary}</p>
          <div className="row" style={{ alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <strong>Pros</strong>
              <ul>{summary.pros.map((p, i) => <li key={i}>{p}</li>)}</ul>
            </div>
            <div style={{ flex: 1 }}>
              <strong>Cons</strong>
              <ul>{summary.cons.map((c, i) => <li key={i}>{c}</li>)}</ul>
            </div>
          </div>
        </div>
      )}
      <div style={{ marginTop: 12 }}>
        {reviews.map((r) => (
          <div key={r.id} className="card" style={{ marginBottom: 10 }}>
            <div className="row">
              <strong>{'★'.repeat(r.rating)}</strong>
              {r.verified && <span className="badge">verified</span>}
              <span className="muted">{r.user?.name}</span>
            </div>
            {r.text && <p style={{ margin: '6px 0 0' }}>{r.text}</p>}
          </div>
        ))}
        {reviews.length === 0 && <p className="muted">No reviews yet.</p>}
      </div>
    </main>
  );
}
