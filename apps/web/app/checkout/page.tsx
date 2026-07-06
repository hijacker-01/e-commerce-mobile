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
interface ApplicableCoupon {
  id: string;
  code: string;
  type: 'PERCENT' | 'FLAT';
  value: string;
  minOrder: string;
  discount: string;
}

// Store policy — kept in sync with the backend order service.
const CARD_PCT = 5;
const CARD_CAP = 2000;

// No-cost EMI: minimum cart value and the tenures the store offers. Monthly
// instalment = order total ÷ months (0% interest, so no extra is added).
const EMI_MIN = 3000;
const EMI_MIN_MONTHLY = 500; // don't offer a tenure whose instalment is tiny
const EMI_TENURES = [3, 6, 9, 12, 18, 24];

function tomorrowAt(hour: number) {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hour, 0, 0, 0);
  // local datetime-local string
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CheckoutPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [method, setMethod] = useState('UPI');
  const [emiTenure, setEmiTenure] = useState<number | null>(null);
  const [coupon, setCoupon] = useState('');
  const [applicable, setApplicable] = useState<ApplicableCoupon[]>([]);
  const [pickupTime, setPickupTime] = useState(tomorrowAt(11));
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    api.get<Cart>('/cart').then(setCart).catch(() => {});
    api
      .get<ApplicableCoupon[]>('/coupons/applicable')
      .then(setApplicable)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chosen = applicable.find((c) => c.code === coupon);
  const subtotalNum = cart ? Number(cart.subtotal) : 0;
  const couponDiscount = chosen ? Number(chosen.discount) : 0;
  const isCard = method === 'CREDIT_CARD';
  // Credit-card offer applies when no coupon is used (coupon otherwise wins).
  const cardDiscount =
    isCard && !chosen ? Math.min((subtotalNum * CARD_PCT) / 100, CARD_CAP) : 0;
  const shownDiscount = chosen ? couponDiscount : cardDiscount;
  // A "discounted" order (coupon or card offer) needs next-day pickup.
  const isDiscounted = !!chosen || isCard;

  // No-cost EMI schemes available for this order value.
  const isEmi = method === 'EMI';
  const emiBase = subtotalNum - shownDiscount;
  const emiSchemes =
    emiBase >= EMI_MIN
      ? EMI_TENURES.map((months) => ({
          months,
          monthly: Math.round(emiBase / months),
        })).filter((s) => s.monthly >= EMI_MIN_MONTHLY)
      : [];
  const emiChosen = emiSchemes.find((s) => s.months === emiTenure) ?? null;
  // Selecting a scheme is required before an EMI order can be placed.
  const emiBlocked = isEmi && (emiSchemes.length === 0 || !emiChosen);

  async function placeOrder() {
    if (!cart || cart.items.length === 0) return;
    if (emiBlocked) {
      setMsg('Please choose a No-cost EMI plan to continue.');
      return;
    }
    setMsg('Placing order…');
    try {
      // Pickup-only store: ready in ~10 min today, unless discounted (next day).
      const slotIso = isDiscounted
        ? new Date(pickupTime || tomorrowAt(11)).toISOString()
        : new Date(Date.now() + 10 * 60 * 1000).toISOString();
      let note = isDiscounted
        ? 'Store pickup — next day (bank discount processing)'
        : 'Store pickup — ready in ~10 minutes';
      if (isEmi && emiChosen) {
        note += ` · No-cost EMI: ${emiChosen.months} months × ₹${emiChosen.monthly.toLocaleString('en-IN')}`;
      }

      const order = await api.post<{ id: string }>('/orders', {
        items: cart.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
        deliverySlot: slotIso,
        deliveryAddr: note,
        paymentMethod: method,
      });

      let extra = '';
      if (coupon.trim()) {
        try {
          const updated = await api.post<{ discount: string }>(
            '/coupons/apply',
            { orderId: order.id, code: coupon.trim() },
          );
          extra = ` Coupon applied — ₹${Number(updated.discount).toLocaleString('en-IN')} off!`;
        } catch (e) {
          extra = ` (Coupon "${coupon.trim()}" not applied: ${(e as Error).message})`;
        }
      } else if (cardDiscount > 0) {
        extra = ` Credit-card offer applied — ₹${cardDiscount.toLocaleString('en-IN')} off!`;
      }

      await api.del('/cart');
      setMsg(
        `Order placed! ${
          isDiscounted
            ? 'Ready for pickup tomorrow.'
            : 'Ready for pickup in ~10 minutes.'
        }${extra}`,
      );
      setTimeout(() => router.push('/orders'), 1800);
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  if (!cart) return <p className="muted">Loading…</p>;

  return (
    <main>
      <h1>Checkout</h1>
      <div className="cart-grid" style={{ marginTop: 8 }}>
        <div className="card">
          {/* Payment */}
          <label>Payment method</label>
          <select
            value={method}
            onChange={(e) => {
              setMethod(e.target.value);
              setEmiTenure(null);
            }}
          >
            <option value="UPI">UPI</option>
            <option value="CREDIT_CARD">Credit Card (5% off)</option>
            <option value="DEBIT_CARD">Debit Card</option>
            <option value="ONLINE">Online / Netbanking</option>
            <option value="COD">Cash on pickup</option>
            <option value="EMI">No-cost EMI</option>
          </select>

          {isCard && !chosen && (
            <div className="card-offer">
              💳 <strong>Credit Card offer</strong> — {CARD_PCT}% instant off (up
              to ₹{CARD_CAP.toLocaleString('en-IN')}). You save{' '}
              <strong>₹{cardDiscount.toLocaleString('en-IN')}</strong>.
            </div>
          )}
          {isCard && chosen && (
            <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
              A coupon is applied, so the card offer isn’t combined.
            </p>
          )}

          {isEmi && (
            <div className="emi-block">
              {emiSchemes.length === 0 ? (
                <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
                  No-cost EMI needs an order of at least ₹
                  {EMI_MIN.toLocaleString('en-IN')}. Add a bit more to your cart
                  to unlock EMI plans.
                </p>
              ) : (
                <>
                  <div className="emi-head">
                    🧾 <strong>Choose your No-cost EMI plan</strong>
                    <span className="muted"> · 0% interest, no extra cost</span>
                  </div>
                  <div className="emi-schemes">
                    {emiSchemes.map((s) => (
                      <button
                        type="button"
                        key={s.months}
                        className={`emi-card ${
                          emiTenure === s.months ? 'active' : ''
                        }`}
                        onClick={() => setEmiTenure(s.months)}
                      >
                        <span className="emi-months">{s.months} months</span>
                        <span className="emi-monthly">
                          ₹{s.monthly.toLocaleString('en-IN')}
                          <small>/mo</small>
                        </span>
                        <span className="emi-tag">No cost</span>
                      </button>
                    ))}
                  </div>
                  <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                    Instalment shown on the current total; final amount includes
                    GST added at approval.
                  </p>
                </>
              )}
            </div>
          )}

          {/* Pickup */}
          <div className="divider" />
          <label>🏬 Store pickup</label>
          <div className="pickup-best">
            ⭐ Best pickup windows: <strong>10 AM – 12 PM</strong> and{' '}
            <strong>8 PM – 10 PM</strong>
          </div>

          {isDiscounted ? (
            <div className="pickup-note next">
              ⏳ Because of the bank-discount processing workflow, your order will
              be ready for pickup <strong>tomorrow</strong>. Pick a time that
              suits you:
              <label style={{ marginTop: 8 }}>Your preferred pickup time</label>
              <input
                type="datetime-local"
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
              />
            </div>
          ) : (
            <div className="pickup-note ready">
              🟢 Full-price order — <strong>ready in ~10 minutes</strong>, today.
              Collect it from the store anytime (best in the windows above).
            </div>
          )}
        </div>

        <div className="summary">
          <h3 style={{ marginTop: 0 }}>Order summary</h3>
          <div className="summary-row">
            <span>Subtotal</span>
            <span>₹{cart.subtotal}</span>
          </div>
          <div className="summary-row">
            <span>GST</span>
            <span>Added at approval</span>
          </div>
          {shownDiscount > 0 && (
            <div className="summary-row" style={{ color: 'var(--success)' }}>
              <span>{chosen ? `Coupon (${coupon})` : 'Credit-card offer'}</span>
              <span>− ₹{shownDiscount.toLocaleString('en-IN')}</span>
            </div>
          )}
          <div className="summary-total">
            <span>Total</span>
            <span>
              ₹{(subtotalNum - shownDiscount).toLocaleString('en-IN')}
              {shownDiscount > 0 && (
                <span
                  className="muted"
                  style={{ fontSize: 12, marginLeft: 6, fontWeight: 500 }}
                >
                  + GST
                </span>
              )}
            </span>
          </div>

          {applicable.length > 0 && (
            <div className="applicable-coupons">
              <strong style={{ fontSize: 13 }}>🏷️ Coupons for your cart</strong>
              {applicable.map((c) => (
                <div
                  key={c.id}
                  className={`appl-coupon ${coupon === c.code ? 'active' : ''}`}
                >
                  <div>
                    <code>{c.code}</code>
                    <span
                      className="muted"
                      style={{ fontSize: 12, marginLeft: 8 }}
                    >
                      {c.type === 'PERCENT'
                        ? `${Number(c.value)}% off`
                        : `₹${Number(c.value)} off`}{' '}
                      · save ₹{Number(c.discount).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <button
                    className={coupon === c.code ? 'success' : 'secondary'}
                    onClick={() => setCoupon(coupon === c.code ? '' : c.code)}
                  >
                    {coupon === c.code ? '✓ Applied' : 'Apply'}
                  </button>
                </div>
              ))}
            </div>
          )}

          <label style={{ marginTop: 14 }}>Coupon code</label>
          <input
            placeholder="e.g. SAVE10"
            value={coupon}
            onChange={(e) => setCoupon(e.target.value.toUpperCase())}
          />
          <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            Coupon &amp; card discounts move pickup to the next day.
          </p>

          {isEmi && emiChosen && (
            <div className="summary-row" style={{ color: 'var(--accent)' }}>
              <span>No-cost EMI</span>
              <span>
                {emiChosen.months} × ₹
                {emiChosen.monthly.toLocaleString('en-IN')}/mo
              </span>
            </div>
          )}

          <button
            className="success"
            style={{ width: '100%', marginTop: 14 }}
            onClick={placeOrder}
            disabled={cart.items.length === 0 || emiBlocked}
          >
            Place order
          </button>
          {msg && (
            <p className="muted" style={{ marginTop: 12 }}>
              {msg}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
