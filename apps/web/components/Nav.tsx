'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, clearToken, getRole, getToken } from '../lib/api';

export default function Nav() {
  const [authed, setAuthed] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    setAuthed(!!token);
    setRole(getRole());
    if (!token) return;

    let active = true;
    const poll = () =>
      api
        .get<{ count: number }>('/notifications/unread-count')
        .then((r) => active && setUnread(r.count))
        .catch(() => {});
    poll();
    const id = setInterval(poll, 20000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  function logout() {
    clearToken();
    localStorage.removeItem('role');
    setAuthed(false);
    router.push('/');
  }

  return (
    <nav className="nav">
      <Link href="/" className="brand">
        ⚡ Electronics Store
      </Link>
      <Link href="/">Shop</Link>
      <Link href="/services">Services</Link>
      {authed && <Link href="/cart">Cart</Link>}
      {authed && <Link href="/orders">My Orders</Link>}
      {authed && <Link href="/chat">Bargain</Link>}
      {authed && role === 'CUSTOMER' && <Link href="/wishlist">Wishlist</Link>}
      {authed && role === 'CUSTOMER' && <Link href="/exchange">Exchange</Link>}
      {role === 'OWNER' || role === 'EMPLOYEE' ? (
        <Link href="/owner">Owner</Link>
      ) : null}
      <span style={{ flex: 1 }} />
      {authed && (
        <Link href="/notifications">
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
    </nav>
  );
}
