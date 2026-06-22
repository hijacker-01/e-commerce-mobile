'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, setRole, setToken } from '../../lib/api';

interface AuthResp {
  accessToken: string;
}
interface Me {
  role: string;
}

type RoleKey = 'CUSTOMER' | 'OWNER' | 'EMPLOYEE' | 'STOCKIST';

const ROLES: {
  key: RoleKey;
  label: string;
  icon: string;
  desc: string;
}[] = [
  {
    key: 'CUSTOMER',
    label: 'Customer',
    icon: '🛍️',
    desc: 'Shop devices, track orders, bargain & exchange',
  },
  {
    key: 'OWNER',
    label: 'Owner',
    icon: '👑',
    desc: 'Manage store, orders, inventory & staff',
  },
  {
    key: 'EMPLOYEE',
    label: 'Employee',
    icon: '🧑‍💼',
    desc: 'Handle orders, returns & customer Q&A',
  },
  {
    key: 'STOCKIST',
    label: 'Stockist',
    icon: '📦',
    desc: 'Supply inventory via challans',
  },
];

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState<RoleKey | null>(null);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const role = ROLES.find((r) => r.key === selectedRole);
  // Only customers can self-register; staff/stockist accounts are provisioned.
  const canRegister = selectedRole === 'CUSTOMER';

  function chooseRole(key: RoleKey) {
    setSelectedRole(key);
    setMode('login');
    setError(null);
  }

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      const resp =
        mode === 'login'
          ? await api.post<AuthResp>('/auth/login', { phone, password })
          : await api.post<AuthResp>('/auth/register', {
              name,
              phone,
              password,
              role: 'CUSTOMER',
            });
      setToken(resp.accessToken);
      const me = await api.get<Me>('/auth/me');
      setRole(me.role);
      // Warn if the account's real role differs from the chosen portal.
      if (selectedRole && me.role !== selectedRole) {
        setError(
          `This account is a ${me.role}. Signing you in to your ${me.role} area.`,
        );
      }
      router.push(
        me.role === 'OWNER' || me.role === 'EMPLOYEE'
          ? '/owner'
          : me.role === 'STOCKIST'
            ? '/stockist'
            : '/',
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  // ---- Step 1: choose a role ----
  if (!selectedRole) {
    return (
      <main>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div className="eyebrow">SAMSUNG·Store</div>
          <h1>Sign in to continue</h1>
          <p className="muted">Choose how you want to sign in.</p>
        </div>
        <div className="role-grid">
          {ROLES.map((r) => (
            <button
              key={r.key}
              className="role-card"
              onClick={() => chooseRole(r.key)}
            >
              <span className="role-icon">{r.icon}</span>
              <strong>{r.label}</strong>
              <span className="muted" style={{ fontSize: 13 }}>
                {r.desc}
              </span>
            </button>
          ))}
        </div>
      </main>
    );
  }

  // ---- Step 2: login / register for the chosen role ----
  return (
    <main>
      <div className="auth-wrap">
        {/* Brand panel */}
        <div className="auth-panel">
          <div className="eyebrow" style={{ color: 'rgba(255,255,255,0.8)' }}>
            SAMSUNG·Store
          </div>
          <h2>
            {role?.icon} {role?.label} portal
          </h2>
          <ul>
            <li>⚡ AI-verified authentic devices</li>
            <li>💬 Instant in-app bargaining</li>
            <li>🚚 Fast delivery &amp; easy exchange</li>
            <li>💳 No-cost EMI on flagship devices</li>
          </ul>
        </div>

        {/* Form */}
        <div className="auth-form">
          <button
            className="link-btn"
            onClick={() => setSelectedRole(null)}
            style={{ marginBottom: 10 }}
          >
            ← Choose a different role
          </button>
          <h1 style={{ fontSize: 28 }}>
            {mode === 'login'
              ? `Log in as ${role?.label}`
              : 'Create your account'}
          </h1>
          {mode === 'register' && (
            <>
              <label>Name</label>
              <input
                value={name}
                autoComplete="name"
                onChange={(e) => setName(e.target.value)}
              />
            </>
          )}
          <label>Phone</label>
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
          <label>Password</label>
          <input
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
          {error && (
            <p className="error" style={{ marginTop: 10 }}>
              {error}
            </p>
          )}
          <button
            style={{ marginTop: 18, width: '100%' }}
            onClick={submit}
            disabled={loading}
          >
            {loading ? '…' : mode === 'login' ? 'Log in' : 'Sign up'}
          </button>

          {canRegister ? (
            <p className="muted" style={{ marginTop: 16 }}>
              {mode === 'login' ? 'No account?' : 'Have an account?'}{' '}
              <a
                style={{
                  color: 'var(--accent)',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              >
                {mode === 'login' ? 'Register' : 'Log in'}
              </a>
            </p>
          ) : (
            <p className="muted" style={{ marginTop: 16, fontSize: 13 }}>
              {role?.label} accounts are provisioned by the store owner.
            </p>
          )}
          {selectedRole === 'OWNER' && (
            <p className="muted" style={{ fontSize: 12 }}>
              Seeded owner — phone 9000000001 / password123
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
