'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, getToken } from '../../../lib/api';
import { toast } from '../../../lib/toast';

interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: string;
  product?: { id: string; title: string; media?: string[] } | null;
}
interface Order {
  id: string;
  number: string;
  status: string;
  subtotal: string;
  gstAmount: string;
  total: string;
  paymentStatus: string;
  paymentMethod?: string | null;
  deliveryAddr?: string | null;
  deliverySlot?: string | null;
  createdAt: string;
  items: OrderItem[];
  invoice?: { id: string; number: string } | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

// Status journey for the visual timeline (cancelled/returned handled separately).
const FLOW = ['REQUESTED', 'APPROVED', 'OUT_FOR_DELIVERY', 'DELIVERED'];
const LABELS: Record<string, string> = {
  REQUESTED: 'Placed',
  APPROVED: 'Approved',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
};

async function downloadPdf(path: string, filename: string) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_URL}/api${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    toast('Could not download invoice.', 'error');
    return;
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function OrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    api
      .get<Order>(`/orders/${id}`)
      .then(setOrder)
      .catch((e) => setError((e as Error).message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (error) return <p className="error">{error}</p>;
  if (!order) return <p className="muted">Loading…</p>;

  const cancelled = ['CANCELLED', 'REJECTED', 'RETURNED'].includes(order.status);
  const currentStep = FLOW.indexOf(order.status);

  return (
    <main>
      <Link href="/orders" className="muted">
        ← Back to orders
      </Link>
      <div className="section-head" style={{ marginTop: 8 }}>
        <h1 style={{ margin: 0 }}>Order {order.number}</h1>
        <span className="muted">
          {new Date(order.createdAt).toLocaleString()}
        </span>
      </div>

      {/* Status timeline */}
      {cancelled ? (
        <span className="badge" style={{ background: 'var(--danger)' }}>
          {order.status}
        </span>
      ) : (
        <div className="timeline">
          {FLOW.map((s, i) => (
            <div
              key={s}
              className={`tl-step ${i <= currentStep ? 'done' : ''} ${
                i === currentStep ? 'current' : ''
              }`}
            >
              <span className="tl-dot">{i <= currentStep ? '✓' : i + 1}</span>
              <span className="tl-label">{LABELS[s]}</span>
            </div>
          ))}
        </div>
      )}

      <div className="cart-grid" style={{ marginTop: 24 }}>
        {/* Items */}
        <div className="card" style={{ padding: 8 }}>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Price</th>
                <th>Qty</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((it) => (
                <tr key={it.productId}>
                  <td>
                    <div className="row" style={{ gap: 12 }}>
                      <div className="line-thumb">
                        {it.product?.media?.[0] ? (
                          <Image
                            src={it.product.media[0]}
                            alt={it.product.title}
                            fill
                            sizes="48px"
                            style={{ objectFit: 'contain', padding: 4 }}
                          />
                        ) : (
                          '📱'
                        )}
                      </div>
                      {it.product ? (
                        <Link href={`/product/${it.product.id}`}>
                          {it.product.title}
                        </Link>
                      ) : (
                        it.productId
                      )}
                    </div>
                  </td>
                  <td>₹{Number(it.unitPrice).toLocaleString('en-IN')}</td>
                  <td>{it.quantity}</td>
                  <td>
                    ₹
                    {(Number(it.unitPrice) * it.quantity).toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary + delivery */}
        <div className="summary">
          <h3 style={{ marginTop: 0 }}>Payment</h3>
          <div className="summary-row">
            <span>Subtotal</span>
            <span>₹{Number(order.subtotal).toLocaleString('en-IN')}</span>
          </div>
          <div className="summary-row">
            <span>GST</span>
            <span>₹{Number(order.gstAmount).toLocaleString('en-IN')}</span>
          </div>
          <div className="summary-total">
            <span>Total</span>
            <span>₹{Number(order.total).toLocaleString('en-IN')}</span>
          </div>
          <div className="summary-row" style={{ marginTop: 8 }}>
            <span>Status</span>
            <span>{order.paymentStatus}</span>
          </div>
          {order.paymentMethod && (
            <div className="summary-row">
              <span>Method</span>
              <span>{order.paymentMethod}</span>
            </div>
          )}

          <div className="divider" />
          <h3 style={{ marginTop: 0 }}>Delivery</h3>
          <p className="muted" style={{ margin: 0 }}>
            {order.deliveryAddr || 'No address provided'}
          </p>
          {order.deliverySlot && (
            <p className="muted" style={{ marginTop: 4 }}>
              Slot: {new Date(order.deliverySlot).toLocaleString()}
            </p>
          )}

          {order.invoice && (
            <button
              className="secondary"
              style={{ width: '100%', marginTop: 16 }}
              onClick={() =>
                downloadPdf(
                  `/invoices/${order.invoice!.id}/pdf`,
                  `${order.invoice!.number}.pdf`,
                )
              }
            >
              ⬇ Download invoice
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
