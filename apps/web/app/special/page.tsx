'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, getToken } from '../../lib/api';
import { toast } from '../../lib/toast';

interface SpecialOffer {
  id: string;
  productId: string;
  title: string;
  brand: string;
  model: string;
  media?: string[];
  category: string | null;
  specialPrice: string;
  originalPrice: string;
  lowestPrice: string;
  inStock: number;
}

export default function SpecialStorePage() {
  const [offers, setOffers] = useState<SpecialOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    api
      .get<SpecialOffer[]>('/special')
      .then(setOffers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function addToCart(productId: string) {
    if (!getToken()) {
      toast('Please log in to grab this deal.', 'info');
      return router.push('/login');
    }
    try {
      await api.post('/cart/items', { productId, quantity: 1 });
      toast('Added to cart at the special price');
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  return (
    <main>
      <section className="hero" style={{ marginBottom: 28 }}>
        <div className="eyebrow" style={{ color: 'rgba(255,255,255,0.85)' }}>
          ✦ Limited-time
        </div>
        <h1>Special Store</h1>
        <p>
          Hand-picked deals at our lowest prices. Each one shows its{' '}
          <strong>yearly lowest price</strong> so you know it’s a genuine drop —
          grab them while stocks last.
        </p>
      </section>

      {loading ? (
        <div className="grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton skeleton-card" />
          ))}
        </div>
      ) : offers.length === 0 ? (
        <div className="empty-state">
          <div className="emoji">✨</div>
          <h3 style={{ marginTop: 12 }}>No special deals right now</h3>
          <p className="muted">Check back soon — fresh drops land regularly.</p>
        </div>
      ) : (
        <div className="grid">
          {offers.map((o) => {
            const sp = Number(o.specialPrice);
            const orig = Number(o.originalPrice);
            const low = Number(o.lowestPrice);
            const pct = orig > sp ? Math.round(((orig - sp) / orig) * 100) : 0;
            return (
              <div key={o.id} className="card">
                {pct > 0 && <span className="discount-badge">-{pct}%</span>}
                <Link href={`/product/${o.productId}`}>
                  <div className="product-thumb">
                    {o.media?.[0] ? (
                      <Image
                        src={o.media[0]}
                        alt={o.title}
                        fill
                        sizes="240px"
                        style={{ objectFit: 'contain', padding: 12 }}
                      />
                    ) : (
                      '📱'
                    )}
                  </div>
                  <strong>{o.title}</strong>
                  <div className="muted">
                    {o.brand} {o.model}
                  </div>
                </Link>

                <div className="shop-price-box" style={{ marginTop: 12 }}>
                  <div className="shop-price-label">✦ Special price</div>
                  <div className="shop-price-row">
                    <span className="shop-price">
                      ₹{sp.toLocaleString('en-IN')}
                    </span>
                    {pct > 0 && (
                      <span className="mrp">
                        ₹{orig.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                  <div className="yearly-low">
                    📉 Yearly lowest: ₹{low.toLocaleString('en-IN')}
                  </div>
                </div>

                <div
                  className={o.inStock > 0 ? 'stock-in' : 'stock-out'}
                  style={{ marginTop: 6, fontSize: 13 }}
                >
                  {o.inStock > 0 ? `● ${o.inStock} in stock` : '○ Out of stock'}
                </div>
                <button
                  style={{ marginTop: 12, width: '100%' }}
                  onClick={() => addToCart(o.productId)}
                  disabled={o.inStock <= 0}
                >
                  Grab the deal
                </button>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
