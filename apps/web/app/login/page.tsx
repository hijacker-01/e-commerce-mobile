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

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
      router.push(me.role === 'OWNER' || me.role === 'EMPLOYEE' ? '/owner' : '/');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <div className="auth-wrap">
        {/* Brand panel */}
        <div className="auth-panel">
          <div className="eyebrow" style={{ color: 'rgba(255,255,255,0.8)' }}>
            SAMSUNG·Store
          </div>
          <h2>
            {mode === 'login'
              ? 'Welcome back.'
              : 'Join the next era of smart shopping.'}
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
          <h1 style={{ fontSize: 28 }}>
            {mode === 'login' ? 'Log in' : 'Create account'}
          </h1>
          {mode === 'register' && (
            <>
              <label>Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </>
          )}
          <label>Phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} />
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
          <p className="muted" style={{ marginTop: 16 }}>
            {mode === 'login' ? 'No account?' : 'Have an account?'}{' '}
            <a
              style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            >
              {mode === 'login' ? 'Register' : 'Log in'}
            </a>
          </p>
          <p className="muted" style={{ fontSize: 12 }}>
            Seeded owner — phone 9000000001 / password123
          </p>
        </div>
      </div>
    </main>
  );
}
