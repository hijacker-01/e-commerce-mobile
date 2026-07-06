'use client';

import Link from 'next/link';
import { CSSProperties, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getRole, getToken } from '../lib/api';

type Item = {
  href: string;
  label: string;
  icon: string;
  auth?: boolean; // only when signed in (any role)
  customer?: boolean; // only for signed-in customers
};

// Everything a shopper reaches from the quarter-circle "speed dial". Filtered
// by auth/role below so guests see the public set and customers get the rest.
const ITEMS: Item[] = [
  { href: '/', label: 'Shop', icon: '🛍️' },
  { href: '/special', label: 'Special', icon: '✦' },
  { href: '/coupons', label: 'Offers', icon: '🏷️' },
  { href: '/services', label: 'Services', icon: '🛠️' },
  { href: '/cart', label: 'Cart', icon: '🛒', customer: true },
  { href: '/wishlist', label: 'Wishlist', icon: '❤️', customer: true },
  { href: '/orders', label: 'Orders', icon: '📦', customer: true },
  { href: '/account', label: 'Account', icon: '👤', auth: true },
];

// Splash/login screens own the whole viewport — no floating menu there.
const HIDDEN_ON = ['/welcome', '/login'];

export default function RadialMenu() {
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    setAuthed(!!getToken());
    setRole(getRole());
  }, [pathname]);

  // Collapse the fan whenever the route changes.
  useEffect(() => setOpen(false), [pathname]);

  if (HIDDEN_ON.includes(pathname)) return null;

  const items = ITEMS.filter((it) => {
    if (it.customer) return authed && role === 'CUSTOMER';
    if (it.auth) return authed;
    return true;
  });

  const n = items.length;
  const R = 158; // arc radius (px)
  // Fan each item along a quarter circle from ~straight-up to ~straight-left,
  // slightly inset from the axes so pills clear the FAB and the screen edge.
  const point = (i: number) => {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const deg = 90 + t * 88; // 90° (up) → 178° (left)
    const rad = (deg * Math.PI) / 180;
    return { x: Math.cos(rad) * R, y: -Math.sin(rad) * R };
  };

  return (
    <div className={`radial ${open ? 'open' : ''}`}>
      {open && (
        <button
          className="radial-scrim"
          aria-hidden="true"
          tabIndex={-1}
          onClick={() => setOpen(false)}
        />
      )}
      {items.map((it, i) => {
        const { x, y } = point(i);
        const style = {
          '--x': `${x.toFixed(1)}px`,
          '--y': `${y.toFixed(1)}px`,
          // Open: stagger outward from the FAB. Close: reverse-stagger back.
          transitionDelay: `${open ? i * 34 : (n - 1 - i) * 22}ms`,
        } as CSSProperties;
        return (
          <Link
            key={it.href}
            href={it.href}
            className="radial-item"
            style={style}
            onClick={() => setOpen(false)}
          >
            <span className="radial-ic">{it.icon}</span>
            <span className="radial-lb">{it.label}</span>
          </Link>
        );
      })}
      <button
        className="radial-fab"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="radial-fab-ic">{open ? '✕' : '☰'}</span>
        <span className="radial-fab-tx">Menu</span>
      </button>
    </div>
  );
}
