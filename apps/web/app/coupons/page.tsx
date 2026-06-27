'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import { toast } from '../../lib/toast';

interface Coupon {
  id: string;
  code: string;
  type: 'PERCENT' | 'FLAT';
  value: string;
  minOrder: string;
  usageLimit?: number | null;
  usedCount: number;
  expiresAt?: string | null;
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Coupon[]>('/coupons')
      .then((list) =>
        // Widely-used first, then biggest discount.
        setCoupons(
          [...list].sort(
            (a, b) =>
              b.usedCount - a.usedCount || Number(b.value) - Number(a.value),
          ),
        ),
      )
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Mark the top few most-redeemed coupons as "Popular".
  const popular = useMemo(() => {
    const ids = new Set<string>();
    coupons
      .filter((c) => c.usedCount > 0)
      .slice(0, 3)
      .forEach((c) => ids.add(c.id));
    return ids;
  }, [coupons]);

  function copy(code: string) {
    navigator.clipboard
      ?.writeText(code)
      .then(() => toast(`Copied “${code}” — apply it at checkout`))
      .catch(() => toast('Could not copy the code', 'error'));
  }

  return (
    <main>
      <div className="eyebrow">Save more</div>
      <div className="section-head">
        <h1 style={{ margin: 0 }}>Offers &amp; coupons</h1>
        <span className="muted">
          {loading ? 'Loading…' : `${coupons.length} active`}
        </span>
      </div>
      <p className="muted" style={{ marginTop: 4 }}>
        Copy a code and apply it on the <Link href="/checkout">checkout</Link>{' '}
        page. Most-used codes are shown first.
      </p>

      {loading ? (
        <div className="coupon-grid" style={{ marginTop: 22 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 110 }} />
          ))}
        </div>
      ) : coupons.length === 0 ? (
        <div className="empty-state">
          <div className="emoji">🏷️</div>
          <h3 style={{ marginTop: 12 }}>No active coupons right now</h3>
          <p className="muted">Check back soon for fresh offers.</p>
        </div>
      ) : (
        <div className="coupon-grid" style={{ marginTop: 22 }}>
          {coupons.map((c) => {
            const pct = c.type === 'PERCENT';
            const min = Number(c.minOrder);
            return (
              <div key={c.id} className="coupon">
                {popular.has(c.id) && <span className="coupon-pop">🔥 Popular</span>}
                <div className="coupon-left">
                  <span className="amt">
                    {pct
                      ? `${Number(c.value)}%`
                      : `₹${Number(c.value).toLocaleString('en-IN')}`}
                  </span>
                  <span className="off">Off</span>
                </div>
                <div className="coupon-body">
                  <div className="coupon-code">
                    <code>{c.code}</code>
                    <button
                      className="coupon-copy"
                      onClick={() => copy(c.code)}
                    >
                      Copy
                    </button>
                  </div>
                  <div className="coupon-meta">
                    {min > 0
                      ? `On orders above ₹${min.toLocaleString('en-IN')}`
                      : 'No minimum order'}
                  </div>
                  <div className="coupon-meta">
                    {c.usedCount > 0
                      ? `Used ${c.usedCount}×`
                      : 'Be the first to use it'}
                    {c.expiresAt
                      ? ` · Valid till ${new Date(c.expiresAt).toLocaleDateString('en-IN')}`
                      : ' · No expiry'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
