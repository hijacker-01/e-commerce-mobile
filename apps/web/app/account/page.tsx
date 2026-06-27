'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getToken } from '../../lib/api';
import { toast } from '../../lib/toast';

interface Me {
  id: string;
  role: string;
  name?: string;
  phone?: string;
  email?: string | null;
  loyaltyPoints?: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function AccountPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    api.get<Me>('/auth/me').then(setMe).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch the full account export and save it as a JSON file the user keeps.
  async function downloadBackup() {
    setBusy(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/backup/me`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? 'Backup failed');
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `voltora-backup-${data.userId}-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      const c = data.counts ?? {};
      toast(
        `Backup downloaded — ${c.orders ?? 0} orders, ${c.reviews ?? 0} reviews & more ✓`,
      );
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  if (!me) return <p className="muted">Loading…</p>;

  return (
    <main style={{ maxWidth: 640 }}>
      <div className="eyebrow">Account</div>
      <h1>Your account &amp; data</h1>

      <div className="card" style={{ marginTop: 8 }}>
        <strong>Profile</strong>
        <table style={{ marginTop: 8 }}>
          <tbody>
            <tr>
              <td className="muted">Name</td>
              <td>{me.name ?? '—'}</td>
            </tr>
            <tr>
              <td className="muted">Phone</td>
              <td>{me.phone ?? '—'}</td>
            </tr>
            {me.email && (
              <tr>
                <td className="muted">Email</td>
                <td>{me.email}</td>
              </tr>
            )}
            <tr>
              <td className="muted">Role</td>
              <td>{me.role}</td>
            </tr>
            {me.loyaltyPoints != null && (
              <tr>
                <td className="muted">Loyalty points</td>
                <td>★ {me.loyaltyPoints}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <strong>🔐 Data backup</strong>
        <p className="muted" style={{ marginTop: 6, lineHeight: 1.6 }}>
          Download a complete copy of everything tied to your account — profile,
          orders &amp; invoices, cart, wishlist, reviews, questions, returns,
          exchanges, loyalty, credit ledger and bargaining chats. Keep the file
          safe; if anything ever happens to your account, it has your full data
          for recovery. (Your password is never included.)
        </p>
        <button
          style={{ marginTop: 12 }}
          onClick={downloadBackup}
          disabled={busy}
        >
          {busy ? 'Preparing…' : '⬇ Download my data backup'}
        </button>
      </div>
    </main>
  );
}
