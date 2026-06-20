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
        <div className="empty-state">
          <div className="emoji">🛒</div>
          <h3 style={{ marginTop: 12 }}>Your cart is empty</h3>
          <p className="muted">Browse our latest devices and add your favourites.</p>
          <button style={{ marginTop: 16 }} onClick={() => router.push('/')}>
            Start shopping
          </button>
        </div>
      ) : (
        <div className="cart-grid" style={{ marginTop: 8 }}>
          <div className="card" style={{ padding: 8 }}>
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
          </div>

          <div className="summary">
            <h3 style={{ marginTop: 0 }}>Order summary</h3>
            <div className="summary-row">
              <span>Subtotal</span>
              <span>₹{cart.subtotal}</span>
            </div>
            <div className="summary-row">
              <span>Delivery</span>
              <span>Calculated at checkout</span>
            </div>
            <div className="summary-row">
              <span>GST</span>
              <span>Added at approval</span>
            </div>
            <div className="summary-total">
              <span>Total</span>
              <span>₹{cart.subtotal}</span>
            </div>
            <button
              className="success"
              style={{ width: '100%', marginTop: 18 }}
              onClick={() => router.push('/checkout')}
            >
              Checkout →
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
