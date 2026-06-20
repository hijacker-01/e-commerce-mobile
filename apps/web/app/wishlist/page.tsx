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
      {items.length === 0 && <p className="muted">No saved items.</p>}
      <div className="grid">
        {items.map((w) => (
          <div key={w.id} className="card">
            <Link href={`/product/${w.product.id}`}>
              <strong>{w.product.title}</strong>
              <div className="muted">
                {w.product.brand} {w.product.model}
              </div>
            </Link>
            <div className="price">₹{w.product.price}</div>
            <div className="row" style={{ marginTop: 10 }}>
              <button onClick={() => addToCart(w.product.id)}>Add to cart</button>
              <button className="secondary" onClick={() => remove(w.product.id)}>
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
