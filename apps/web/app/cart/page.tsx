'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getToken } from '../../lib/api';

interface CartItem {
  productId: string;
  title: string;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
}
interface Cart {
  items: CartItem[];
  subtotal: string;
}

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function load() {
    try {
      setCart(await api.get<Cart>('/cart'));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function setQty(productId: string, quantity: number) {
    await api.patch(`/cart/items/${productId}`, { quantity });
    load();
  }

  if (error) return <p className="error">{error}</p>;
  if (!cart) return <p className="muted">Loading…</p>;

  return (
    <main>
      <h1>Your cart</h1>
      {cart.items.length === 0 ? (
        <p className="muted">Cart is empty.</p>
      ) : (
        <>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Price</th>
                <th>Qty</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cart.items.map((i) => (
                <tr key={i.productId}>
                  <td>{i.title}</td>
                  <td>₹{i.unitPrice}</td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      value={i.quantity}
                      style={{ width: 70 }}
                      onChange={(e) =>
                        setQty(i.productId, Number(e.target.value))
                      }
                    />
                  </td>
                  <td>₹{i.lineTotal}</td>
                  <td>
                    <button
                      className="secondary"
                      onClick={() => setQty(i.productId, 0)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3 style={{ marginTop: 16 }}>Subtotal: ₹{cart.subtotal}</h3>
          <button className="success" onClick={() => router.push('/checkout')}>
            Checkout →
          </button>
        </>
      )}
    </main>
  );
}
