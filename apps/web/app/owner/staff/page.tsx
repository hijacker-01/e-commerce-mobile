'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, getRole, getToken } from '../../../lib/api';
import { toast } from '../../../lib/toast';

type StaffRole = 'OWNER' | 'EMPLOYEE' | 'STOCKIST';

const ROLE_LABEL: Record<StaffRole, string> = {
  OWNER: 'Owner',
  EMPLOYEE: 'Employee',
  STOCKIST: 'Stockist',
};
const ROLE_COLOR: Record<StaffRole, string> = {
  OWNER: '#15803d',
  EMPLOYEE: '#1428a0',
  STOCKIST: '#7c5cff',
};

interface Staff {
  id: string;
  name: string;
  phone: string;
  role: StaffRole;
  isActive: boolean;
  permissions?: string[];
  createdAt?: string;
}

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<StaffRole>('EMPLOYEE');
  const [gstin, setGstin] = useState('');
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  function load() {
    api.get<Staff[]>('/users/staff').then(setStaff).catch(() => {});
  }

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    if (getRole() !== 'OWNER') {
      router.push('/owner');
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canAdd = name.trim() && phone.trim() && password.length >= 6;

  async function add() {
    setSaving(true);
    try {
      await api.post('/users/staff', {
        name: name.trim(),
        phone: phone.trim(),
        password,
        role,
        gstin: role === 'STOCKIST' && gstin.trim() ? gstin.trim() : undefined,
      });
      toast(`${ROLE_LABEL[role]} added ✓`);
      setName('');
      setPhone('');
      setPassword('');
      setGstin('');
      load();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function remove(s: Staff) {
    if (!window.confirm(`Remove ${s.role.toLowerCase()} "${s.name}"?`)) return;
    try {
      const r = await api.del<{ deactivated: boolean }>(`/users/staff/${s.id}`);
      toast(
        r.deactivated
          ? `${s.name} has history — login disabled instead of deleting.`
          : `${s.name} removed`,
        'info',
      );
      load();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  return (
    <main>
      <Link href="/owner" className="muted">
        ← Back to dashboard
      </Link>
      <div className="eyebrow" style={{ marginTop: 8 }}>
        Team
      </div>
      <h1>Owners, employees &amp; stockists</h1>

      {/* Add form */}
      <div className="card" style={{ marginTop: 8 }}>
        <strong>Add a team member</strong>
        <div className="row" style={{ marginTop: 10, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label>Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as StaffRole)}
            >
              <option value="EMPLOYEE">Employee</option>
              <option value="STOCKIST">Stockist</option>
              <option value="OWNER">Owner</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </div>
        <div className="row" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label>Phone (login id)</label>
            <input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, ''))}
            />
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label>Temporary password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="field-hint">At least 6 characters.</p>
          </div>
        </div>
        {role === 'STOCKIST' && (
          <>
            <label>GSTIN (optional)</label>
            <input value={gstin} onChange={(e) => setGstin(e.target.value)} />
          </>
        )}
        <button
          style={{ marginTop: 14 }}
          onClick={add}
          disabled={!canAdd || saving}
        >
          {saving ? 'Adding…' : `Add ${ROLE_LABEL[role].toLowerCase()}`}
        </button>
        <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
          Owners get full access to the console (finance, pricing, staff,
          wholesale). Employees get the standard staff permissions (approve
          orders, list products, invoices, inventory, coupons, challans).
          Stockists get a supply portal login.
        </p>
      </div>

      {/* Roster */}
      <h2 style={{ marginTop: 28 }}>Team ({staff.length})</h2>
      {staff.length === 0 ? (
        <p className="muted">No employees or stockists yet.</p>
      ) : (
        <div className="card" style={{ padding: 8 }}>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.phone}</td>
                  <td>
                    <span
                      className="badge"
                      style={{ background: ROLE_COLOR[s.role] ?? '#1428a0' }}
                    >
                      {s.role}
                    </span>
                  </td>
                  <td>
                    {s.isActive ? (
                      <span className="stock-in">● Active</span>
                    ) : (
                      <span className="muted">○ Disabled</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="secondary"
                      onClick={() => remove(s)}
                      disabled={!s.isActive}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
