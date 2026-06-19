'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getToken } from '../../lib/api';

interface CartItem {
  productId: string;
  quantity: number;
}
interface Cart {
  items: CartItem[];
  subtotal: string;
}

export default function CheckoutPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [address, setAddress] = useState('');
  const [slot, setSlot] = useState('');
  const [method, setMethod] = useState('UPI');
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    api.get<Cart>('/cart').then(setCart).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function placeOrder() {
    if (!cart || cart.items.length === 0) return;
    setMsg('Placing order…');
    try {
      await api.post('/orders', {
        items: cart.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
        deliverySlot: slot ? new Date(slot).toISOString() : undefined,
        deliveryAddr: address,
        paymentMethod: method,
      });
      await api.del('/cart');
      setMsg('Order placed! Awaiting shop approval.');
      setTimeout(() => router.push('/orders'), 1200);
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  if (!cart) return <p className="muted">Loading…</p>;

  return (
    <main style={{ maxWidth: 480 }}>
      <h1>Checkout</h1>
      <p className="muted">Subtotal: ₹{cart.subtotal} (GST added at approval)</p>
      <label>Delivery address</label>
      <textarea value={address} onChange={(e) => setAddress(e.target.value)} />
      <label>Preferred delivery slot</label>
      <input
        type="datetime-local"
        value={slot}
        onChange={(e) => setSlot(e.target.value)}
      />
      <label>Payment method</label>
      <select value={method} onChange={(e) => setMethod(e.target.value)}>
        <option value="UPI">UPI</option>
        <option value="ONLINE">Online</option>
        <option value="COD">Cash on delivery</option>
      </select>
      <button
        className="success"
        style={{ marginTop: 16 }}
        onClick={placeOrder}
        disabled={cart.items.length === 0}
      >
        Place order
      </button>
      {msg && (
        <p className="muted" style={{ marginTop: 10 }}>
          {msg}
        </p>
      )}
    </main>
  );
}
