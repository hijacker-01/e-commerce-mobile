'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, setRole, setToken } from '../../lib/api';
import { toast } from '../../lib/toast';

interface AuthResp {
  accessToken: string;
}
interface Me {
  role: string;
}

type RoleKey = 'CUSTOMER' | 'OWNER' | 'EMPLOYEE' | 'STOCKIST';

const ROLES: { key: RoleKey; label: string; icon: string; desc: string }[] = [
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

const HOME_FOR: Record<string, string> = {
  OWNER: '/owner',
  EMPLOYEE: '/owner',
  STOCKIST: '/stockist',
  CUSTOMER: '/',
};

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState<RoleKey | null>(null);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const role = ROLES.find((r) => r.key === selectedRole);
  // Only customers can self-register; staff/stockist accounts are provisioned.
  const canRegister = selectedRole === 'CUSTOMER';

  // Form is valid enough to submit (mirrors backend: password >= 6 on register).
  const canSubmit =
    mode === 'login'
      ? phone.trim().length > 0 && password.length > 0
      : name.trim().length > 0 &&
        phone.trim().length > 0 &&
        password.length >= 6;

  function chooseRole(key: RoleKey) {
    setSelectedRole(key);
    setMode('login');
    setError(null);
  }

  function switchMode() {
    setMode((m) => (m === 'login' ? 'register' : 'login'));
    setError(null);
  }

  async function submit() {
    if (!canSubmit || loading) return;
    setError(null);
    setLoading(true);
    try {
      const resp =
        mode === 'login'
          ? await api.post<AuthResp>('/auth/login', {
              phone: phone.trim(),
              password,
            })
          : await api.post<AuthResp>('/auth/register', {
              name: name.trim(),
              phone: phone.trim(),
              password,
              role: 'CUSTOMER',
            });
      setToken(resp.accessToken);
      const me = await api.get<Me>('/auth/me');
      setRole(me.role);
      // If the account's real role differs from the chosen portal, let them
      // know (as a toast that survives navigation) and route by the real role.
      if (selectedRole && me.role !== selectedRole) {
        toast(`Signed in as ${me.role} — taking you to your area.`, 'info');
      } else {
        toast(mode === 'login' ? 'Welcome back!' : 'Account created!');
      }
      router.push(HOME_FOR[me.role] ?? '/');
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  }

  // ---- Step 1: choose a role ----
  if (!selectedRole) {
    return (
      <main>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div className="eyebrow">Voltora·Store</div>
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
              <span className="role-icon" aria-hidden="true">
                {r.icon}
              </span>
              <strong>{r.label}</strong>
              <span className="muted" style={{ fontSize: 13 }}>
                {r.desc}
              </span>
            </button>
          ))}
        </div>
        <p className="muted" style={{ textAlign: 'center', marginTop: 24 }}>
          <button className="link-inline" onClick={() => router.push('/')}>
            Continue browsing without signing in →
          </button>
        </p>
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
            Voltora·Store
          </div>
          <h2>
            <span aria-hidden="true">{role?.icon}</span> {role?.label} portal
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

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            noValidate
          >
            {mode === 'register' && (
              <>
                <label htmlFor="name">Name</label>
                <input
                  id="name"
                  value={name}
                  autoComplete="name"
                  onChange={(e) => setName(e.target.value)}
                />
              </>
            )}

            <label htmlFor="phone">Phone</label>
            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              maxLength={15}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, ''))}
            />

            <label htmlFor="password">Password</label>
            <div className="pass-wrap">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={
                  mode === 'login' ? 'current-password' : 'new-password'
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="pass-toggle"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {mode === 'register' && (
              <p className="field-hint">At least 6 characters.</p>
            )}

            {error && (
              <p className="error" role="alert" style={{ marginTop: 10 }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              style={{ marginTop: 18, width: '100%' }}
              disabled={loading || !canSubmit}
            >
              {loading
                ? 'Signing in…'
                : mode === 'login'
                  ? 'Log in'
                  : 'Sign up'}
            </button>
          </form>

          {canRegister ? (
            <p className="muted" style={{ marginTop: 16 }}>
              {mode === 'login' ? 'No account?' : 'Have an account?'}{' '}
              <button className="link-inline" onClick={switchMode}>
                {mode === 'login' ? 'Register' : 'Log in'}
              </button>
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
