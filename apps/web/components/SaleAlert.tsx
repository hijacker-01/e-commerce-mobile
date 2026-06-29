'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../lib/api';

interface Offer {
  id: string;
  title: string;
}

/**
 * Store-wide sale alert. Shows a dismissible banner whenever the owner has a
 * live sale running (active offers). Dismissal is remembered per offer set for
 * the browser session so it isn't naggy.
 */
export default function SaleAlert() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    api
      .get<Offer[]>('/offers')
      .then((list) => {
        setOffers(list);
        if (list.length) {
          const key = `salealert:${list.map((o) => o.id).join(',')}`;
          setDismissed(sessionStorage.getItem(key) === '1');
        }
      })
      .catch(() => {});
  }, []);

  if (dismissed || offers.length === 0) return null;

  const key = `salealert:${offers.map((o) => o.id).join(',')}`;
  // Rotate through headlines if more than one sale is live.
  const headline = offers.map((o) => o.title).join('  •  ');

  return (
    <div className="sale-alert" role="status">
      <Link href="/special" className="sale-alert-body">
        <span className="sale-alert-tag">🔥 SALE</span>
        <span className="sale-alert-text">{headline}</span>
        <span className="sale-alert-cta">Shop the sale →</span>
      </Link>
      <button
        className="sale-alert-x"
        aria-label="Dismiss"
        onClick={() => {
          sessionStorage.setItem(key, '1');
          setDismissed(true);
        }}
      >
        ✕
      </button>
    </div>
  );
}
