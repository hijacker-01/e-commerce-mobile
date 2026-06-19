'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearToken, getRole, getToken } from '../lib/api';

export default function Nav() {
  const [authed, setAuthed] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setAuthed(!!getToken());
    setRole(getRole());
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
      {authed && <Link href="/cart">Cart</Link>}
      {authed && <Link href="/orders">My Orders</Link>}
      {role === 'OWNER' || role === 'EMPLOYEE' ? (
        <Link href="/owner">Owner</Link>
      ) : null}
      <span style={{ flex: 1 }} />
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
