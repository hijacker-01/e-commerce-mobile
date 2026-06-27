'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getToken } from '../../lib/api';
import { toast } from '../../lib/toast';

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

  // Take a cart product into price negotiation before checkout.
  async function bargain(productId: string) {
    try {
      const t = await api.post<{ id: string }>('/chat/threads', { productId });
      toast('Opening bargain…', 'info');
      router.push(`/chat?thread=${t.id}`);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  async function setQty(productId: string, quantity: number) {
    if (quantity < 0) return;
    // Optimistic update for instant feedback.
    setCart((prev) => {
      if (!prev) return prev;
      const items = prev.items
        .map((i) =>
          i.productId === productId
            ? {
                ...i,
                quantity,
                lineTotal: (Number(i.unitPrice) * quantity).toFixed(2),
              }
            : i,
        )
        .filter((i) => i.quantity > 0);
      const subtotal = items
        .reduce((s, i) => s + Number(i.lineTotal), 0)
        .toFixed(2);
      return { items, subtotal };
    });
    try {
      await api.patch(`/cart/items/${productId}`, { quantity });
      if (quantity === 0) toast('Item removed', 'info');
      load(); // reconcile with server (taxes, stock caps, etc.)
    } catch (e) {
      toast((e as Error).message, 'error');
      load(); // revert to server truth
    }
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
                      <div className="stepper">
                        <button
                          className="secondary"
                          aria-label="Decrease quantity"
                          onClick={() => setQty(i.productId, i.quantity - 1)}
                        >
                          −
                        </button>
                        <span className="stepper-val">{i.quantity}</span>
                        <button
                          className="secondary"
                          aria-label="Increase quantity"
                          onClick={() => setQty(i.productId, i.quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td>₹{i.lineTotal}</td>
                    <td>
                      <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          className="secondary"
                          title="Negotiate a price before checkout"
                          onClick={() => bargain(i.productId)}
                        >
                          💬 Bargain
                        </button>
                        <button
                          className="secondary"
                          onClick={() => setQty(i.productId, 0)}
                        >
                          Remove
                        </button>
                      </div>
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
            <p className="muted" style={{ fontSize: 12, marginTop: 14 }}>
              💬 Want a better price? Tap <strong>Bargain</strong> on any item to
              negotiate before checkout.
            </p>
            <button
              className="success"
              style={{ width: '100%', marginTop: 10 }}
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
