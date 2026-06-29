'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api, clearToken, getRole, getToken } from '../lib/api';

export default function Nav() {
  const [authed, setAuthed] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const cls = (href: string) => (pathname === href ? 'active' : undefined);

  // Close the mobile menu whenever the route changes.
  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    const token = getToken();
    setAuthed(!!token);
    setRole(getRole());
    if (!token) return;

    let active = true;
    const poll = () => {
      api
        .get<{ count: number }>('/notifications/unread-count')
        .then((r) => active && setUnread(r.count))
        .catch(() => {});
      api
        .get<{ items: unknown[] }>('/cart')
        .then((c) => active && setCartCount(c.items?.length ?? 0))
        .catch(() => {});
    };
    poll();
    const id = setInterval(poll, 20000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [pathname]);

  function logout() {
    clearToken();
    localStorage.removeItem('role');
    setAuthed(false);
    router.push('/');
  }

  return (
    <nav className="nav">
      <Link href="/" className="brand">
        Voltora<span style={{ color: 'var(--accent)' }}>·</span>Store
      </Link>
      <button
        className="nav-toggle"
        aria-label="Toggle menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((v) => !v)}
      >
        {menuOpen ? '✕' : '☰'}
      </button>
      <div
        className={`nav-links ${menuOpen ? 'open' : ''}`}
        onClick={() => setMenuOpen(false)}
      >
        <Link href="/" className={cls('/')}>Shop</Link>
        <Link href="/coupons" className={cls('/coupons')}>Offers</Link>
        <Link href="/services" className={cls('/services')}>Services</Link>
        <Link href="/verify" className={cls('/verify')}>Verify</Link>
        {authed && role === 'CUSTOMER' && (
          <Link href="/support" className={cls('/support')}>Support</Link>
        )}
        {authed && role === 'CUSTOMER' && (
          <Link href="/cart" className={cls('/cart')}>
            Cart{cartCount > 0 && <span className="nav-count">{cartCount}</span>}
          </Link>
        )}
        {authed && role === 'CUSTOMER' && (
          <Link href="/orders" className={cls('/orders')}>My Orders</Link>
        )}
        {authed && role === 'CUSTOMER' && (
          <Link href="/chat" className={cls('/chat')}>Bargain</Link>
        )}
        {authed && role === 'CUSTOMER' && (
          <Link href="/wishlist" className={cls('/wishlist')}>Wishlist</Link>
        )}
        {authed && role === 'CUSTOMER' && (
          <Link href="/exchange" className={cls('/exchange')}>Exchange</Link>
        )}
        {authed && <Link href="/account" className={cls('/account')}>Account</Link>}
        {role === 'OWNER' || role === 'EMPLOYEE' ? (
          <Link href="/owner" className={cls('/owner')}>Owner</Link>
        ) : null}
        {role === 'STOCKIST' && (
          <>
            <Link href="/stockist/order" className={cls('/stockist/order')}>
              Order stock
            </Link>
            <Link href="/stockist/orders" className={cls('/stockist/orders')}>
              My orders
            </Link>
            <Link href="/stockist" className={cls('/stockist')}>Challans</Link>
          </>
        )}
        <span className="nav-spacer" />
        {authed && (
          <Link href="/notifications" className={cls('/notifications')}>
            🔔{unread > 0 ? <span className="badge">{unread}</span> : null}
          </Link>
        )}
        {authed ? (
          <button className="secondary" onClick={logout}>
            Logout
          </button>
        ) : (
          <Link href="/login" className="btn">
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}
