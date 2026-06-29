'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getRole, getToken } from '../../../lib/api';
import { toast } from '../../../lib/toast';

interface User {
  id: string;
  name: string;
  phone: string;
  role: string;
}
interface Ledger {
  id: string;
  amount: string;
  reason: string;
}
interface Account {
  status: string;
  limit: string;
  balance: string;
  ledger: Ledger[];
}

export default function OwnerCreditPage() {
  const [customers, setCustomers] = useState<User[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [account, setAccount] = useState<Account | null>(null);
  const [limit, setLimit] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    if (getRole() !== 'OWNER') {
      router.push('/owner');
      return;
    }
    api.get<User[]>('/users').then((u) => {
      setCustomers(u.filter((x) => x.role === 'CUSTOMER'));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function loadAccount(id: string) {
    setSelected(id);
    setAccount(null);
    if (id) api.get<Account>(`/credit/${id}`).then(setAccount).catch(() => {});
  }

  async function saveTerms() {
    try {
      await api.put(`/credit/${selected}/terms`, { limit: Number(limit) });
      toast('Terms saved ✓');
      loadAccount(selected);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  async function addLedger() {
    try {
      await api.post(`/credit/${selected}/ledger`, {
        amount: Number(amount),
        reason,
      });
      setAmount('');
      setReason('');
      toast('Ledger updated ✓');
      loadAccount(selected);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  return (
    <main>
      <h1>Customer credit</h1>
      <label>Customer</label>
      <select value={selected} onChange={(e) => loadAccount(e.target.value)}>
        <option value="">Select…</option>
        {customers.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} ({c.phone})
          </option>
        ))}
      </select>

      {selected && (
        <>
          <div className="card" style={{ marginTop: 16 }}>
            <h2 style={{ marginTop: 0 }}>Account</h2>
            {account ? (
              <>
                <div className="row">
                  <span className="badge">{account.status}</span>
                </div>
                <p>
                  Limit ₹{account.limit} · Outstanding{' '}
                  <strong>₹{account.balance}</strong>
                </p>
              </>
            ) : (
              <p className="muted">No account yet — set terms to activate.</p>
            )}
          </div>

          <div className="card">
            <h2 style={{ marginTop: 0 }}>Set terms</h2>
            <div className="row">
              <input
                type="number"
                placeholder="Credit limit (₹)"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
              />
              <button onClick={saveTerms} disabled={!limit}>
                Save / activate
              </button>
            </div>
          </div>

          <div className="card">
            <h2 style={{ marginTop: 0 }}>Ledger entry</h2>
            <div className="row">
              <input
                type="number"
                placeholder="Amount (+debit / -repay)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <input
                placeholder="Reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <button onClick={addLedger} disabled={!amount || !reason}>
                Record
              </button>
            </div>
            {account?.ledger?.map((l) => (
              <div key={l.id} className="muted" style={{ marginTop: 6 }}>
                {l.reason}: ₹{l.amount}
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
