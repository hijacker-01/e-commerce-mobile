'use client';

import { useEffect, useState, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '../../lib/api';
import { toggleCompare } from '../../lib/compare';

interface Product {
  id: string;
  brand: string;
  model: string;
  title: string;
  price: string;
  mrp?: string | null;
  media?: string[];
  specs?: Record<string, unknown>;
}

function CompareInner() {
  const params = useSearchParams();
  const ids = (params.get('ids') ?? '').split(',').filter(Boolean);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all(
      ids.map((id) => api.get<Product>(`/products/${id}`).catch(() => null)),
    )
      .then((res) => setProducts(res.filter(Boolean) as Product[]))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.get('ids')]);

  if (loading) return <p className="muted">Loading…</p>;
  if (products.length === 0)
    return (
      <div className="empty-state">
        <div className="emoji">⚖️</div>
        <h3 style={{ marginTop: 12 }}>Nothing to compare</h3>
        <p className="muted">Pick products from the shop to compare them.</p>
        <Link href="/" className="btn" style={{ marginTop: 16 }}>
          Browse products
        </Link>
      </div>
    );

  // Union of all spec keys across the selected products.
  const specKeys = Array.from(
    new Set(products.flatMap((p) => Object.keys(p.specs ?? {}))),
  );

  function remove(id: string) {
    toggleCompare(id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <main>
      <h1>Compare</h1>
      <div className="compare-table-wrap">
        <table className="compare-table">
          <thead>
            <tr>
              <th />
              {products.map((p) => (
                <th key={p.id}>
                  <div className="compare-head">
                    <div className="compare-thumb">
                      {p.media?.[0] ? (
                        <Image
                          src={p.media[0]}
                          alt={p.title}
                          fill
                          sizes="120px"
                          style={{ objectFit: 'contain', padding: 8 }}
                        />
                      ) : (
                        '📱'
                      )}
                    </div>
                    <Link href={`/product/${p.id}`}>
                      <strong>{p.title}</strong>
                    </Link>
                    <button
                      className="secondary"
                      style={{ marginTop: 6, padding: '4px 12px', fontSize: 12 }}
                      onClick={() => remove(p.id)}
                    >
                      Remove
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="muted">Brand</td>
              {products.map((p) => (
                <td key={p.id}>{p.brand}</td>
              ))}
            </tr>
            <tr>
              <td className="muted">Price</td>
              {products.map((p) => (
                <td key={p.id}>
                  <strong>₹{Number(p.price).toLocaleString('en-IN')}</strong>
                </td>
              ))}
            </tr>
            {specKeys.map((k) => (
              <tr key={k}>
                <td className="muted">{k}</td>
                {products.map((p) => (
                  <td key={p.id}>
                    {p.specs?.[k] != null ? String(p.specs[k]) : '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <CompareInner />
    </Suspense>
  );
}
