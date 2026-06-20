'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, getToken } from '../../lib/api';

interface Product {
  id: string;
  brand: string;
  model: string;
  title: string;
  price: string;
  media?: string[];
}
interface WishlistItem {
  id: string;
  product: Product;
}

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const router = useRouter();

  function load() {
    api.get<WishlistItem[]>('/wishlist').then(setItems).catch(() => {});
  }

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function remove(productId: string) {
    setItems(await api.del<WishlistItem[]>(`/wishlist/${productId}`));
  }
  async function addToCart(productId: string) {
    await api.post('/cart/items', { productId, quantity: 1 });
  }

  return (
    <main>
      <h1>My wishlist</h1>
      {items.length === 0 ? (
        <div className="empty-state">
          <div className="emoji">♥</div>
          <h3 style={{ marginTop: 12 }}>No saved items yet</h3>
          <p className="muted">Tap “♥ Save” on any product to keep it here.</p>
          <button style={{ marginTop: 16 }} onClick={() => router.push('/')}>
            Browse products
          </button>
        </div>
      ) : (
        <div className="grid">
          {items.map((w) => (
            <div key={w.id} className="card">
              <Link href={`/product/${w.product.id}`}>
                <div className="product-thumb">
                  {w.product.media?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={w.product.media[0]}
                      alt={w.product.title}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    '📱'
                  )}
                </div>
                <strong>{w.product.title}</strong>
                <div className="muted">
                  {w.product.brand} {w.product.model}
                </div>
              </Link>
              <div className="price">₹{w.product.price}</div>
              <div className="row" style={{ marginTop: 12 }}>
                <button onClick={() => addToCart(w.product.id)} style={{ flex: 1 }}>
                  Add to cart
                </button>
                <button
                  className="secondary"
                  onClick={() => remove(w.product.id)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
