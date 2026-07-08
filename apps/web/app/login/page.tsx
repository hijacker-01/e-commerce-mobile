'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { api, setRole, setToken } from '../../lib/api';
import { toast } from '../../lib/toast';

interface AuthResp {
  accessToken: string;
}
interface Me {
  role: string;
}

type RoleKey = 'CUSTOMER' | 'STOCKIST' | 'EMPLOYEE' | 'OWNER';

const ROLES: {
  key: RoleKey;
  label: string;
  desc: string;
  img: string;
}[] = [
  {
    key: 'CUSTOMER',
    label: 'Customer',
    desc: 'Shop devices, bargain & track orders',
    img: '/roles/role-customer.png',
  },
  {
    key: 'STOCKIST',
    label: 'Stockist',
    desc: 'Supply inventory & manage challans',
    img: '/roles/role-stockist.png',
  },
  {
    key: 'EMPLOYEE',
    label: 'Employee',
    desc: 'Billing, GST invoices & support',
    img: '/roles/role-employee.png',
  },
  {
    key: 'OWNER',
    label: 'Owner',
    desc: 'Full ERP console & analytics',
    img: '/roles/role-owner.png',
  },
];

const HOME_FOR: Record<string, string> = {
  OWNER: '/owner',
  EMPLOYEE: '/owner',
  STOCKIST: '/stockist',
  CUSTOMER: '/',
};

type Screen = 'role' | 'login' | 'signup';

export default function LoginPage() {
  const [screen, setScreen] = useState<Screen>('role');
  const [selectedRole, setSelectedRole] = useState<RoleKey>('CUSTOMER');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // If we were bounced here by an expired session, jump straight to the
  // sign-in screen, explain why, and remember where to return afterwards.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('expired') === '1') {
      setScreen('login');
      setNotice('Your session expired. Please sign in again to continue.');
    }
    const next = params.get('next');
    if (next && next.startsWith('/')) setNextUrl(next);
  }, []);

  const role = ROLES.find((r) => r.key === selectedRole)!;
  const canRegister = selectedRole === 'CUSTOMER';

  function go(next: Screen) {
    setError(null);
    setScreen(next);
    if (typeof window !== 'undefined')
      window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const canSubmit =
    screen === 'signup'
      ? name.trim() && phone.trim() && password.length >= 6
      : phone.trim() && password.length > 0;

  async function submit() {
    if (!canSubmit || loading) return;
    setError(null);
    setLoading(true);
    try {
      const resp =
        screen === 'signup'
          ? await api.post<AuthResp>('/auth/register', {
              name: name.trim(),
              phone: phone.trim(),
              password,
              role: 'CUSTOMER',
            })
          : await api.post<AuthResp>('/auth/login', {
              phone: phone.trim(),
              password,
            });
      setToken(resp.accessToken);
      const me = await api.get<Me>('/auth/me');
      setRole(me.role);
      if (me.role !== selectedRole) {
        toast(`Signed in as ${me.role} — taking you to your area.`, 'info');
      } else {
        toast(screen === 'signup' ? 'Account created!' : 'Welcome back!');
      }
      // Return to the page that bounced us here (e.g. the owner was mid-task),
      // unless this is a fresh signup.
      const dest =
        nextUrl && screen !== 'signup' ? nextUrl : HOME_FOR[me.role] ?? '/';
      router.push(dest);
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  }

  const brandbar = (
    <div className="brandbar">
      <div className="lmark">P</div>
      <span className="lname">
        Prakash<span className="dot">·</span>Mobile
      </span>
    </div>
  );

  const social = (
    <div className="airy-social">
      <button
        type="button"
        className="airy-soc"
        onClick={() => toast('Social sign-in is coming soon.', 'info')}
      >
         Apple
      </button>
      <button
        type="button"
        className="airy-soc"
        onClick={() => toast('Social sign-in is coming soon.', 'info')}
      >
        <span style={{ fontWeight: 800 }}>G</span> Google
      </button>
    </div>
  );

  return (
    <main className="vlogin">
      {brandbar}
      <div className="stagebox">
        {/* ===== Screen 1: role selection ===== */}
        {screen === 'role' && (
          <div className="panel">
            <span className="hero-emoji">⚡</span>
            <h1 className="welcome">Welcome to Prakash Mobile</h1>
            <p className="sub">Choose how you&apos;ll be signing in.</p>

            <div className="vrole-grid">
              {ROLES.map((r) => (
                <button
                  key={r.key}
                  className={`vrole ${selectedRole === r.key ? 'active' : ''}`}
                  onClick={() => setSelectedRole(r.key)}
                >
                  <span className="r-check">✓</span>
                  <div className="r-ic">
                    <Image
                      src={r.img}
                      alt={r.label}
                      fill
                      sizes="76px"
                      style={{ objectFit: 'contain', padding: 6 }}
                    />
                  </div>
                  <div className="r-name">{r.label}</div>
                  <div className="r-desc">{r.desc}</div>
                </button>
              ))}
            </div>

            <button className="btn-primary" onClick={() => go('login')}>
              Continue as {role.label}
            </button>
            <p className="foot">
              Already a member?{' '}
              <a onClick={() => go('login')}>Sign in</a>
            </p>
          </div>
        )}

        {/* ===== Screen 2: sign in ===== */}
        {screen === 'login' && (
          <div className="airy">
            <button
              className="airy-back"
              aria-label="Back"
              onClick={() => go('role')}
            >
              ←
            </button>
            <h1 className="airy-h">Welcome back</h1>
            <p className="airy-sub">
              Sign in to your <b>{role.label}</b> account.
            </p>

            {notice && <p className="airy-notice">{notice}</p>}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
              noValidate
            >
              <div className="airy-field">
                <label>Phone</label>
                <div className="airy-input">
                  <input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    placeholder="10-digit mobile number"
                    value={phone}
                    onChange={(e) =>
                      setPhone(e.target.value.replace(/[^\d+]/g, ''))
                    }
                  />
                </div>
              </div>
              <div className="airy-field">
                <label>Password</label>
                <div className="airy-input">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="eye"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className="airy-row">
                <label className="remember">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  <span className="checkbox">✓</span> Remember me
                </label>
                <button
                  type="button"
                  className="forgot"
                  onClick={() =>
                    toast('Contact the store owner to reset your password.', 'info')
                  }
                >
                  Forgot password?
                </button>
              </div>

              {error && <p className="err">{error}</p>}

              <button
                type="submit"
                className="airy-submit"
                disabled={loading || !canSubmit}
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            {social}

            <div className="airy-foot">
              <span>
                {canRegister ? (
                  <>
                    Don&apos;t have an account?{' '}
                    <a onClick={() => go('signup')}>Sign up</a>
                  </>
                ) : (
                  <>{role.label} accounts are provisioned by the owner.</>
                )}
              </span>
              <a>Terms &amp; Conditions</a>
            </div>
          </div>
        )}

        {/* ===== Screen 3: sign up (customer only) ===== */}
        {screen === 'signup' && (
          <div className="airy">
            <button
              className="airy-back"
              aria-label="Back"
              onClick={() => go('login')}
            >
              ←
            </button>
            <h1 className="airy-h">Create an account</h1>
            <p className="airy-sub">
              Sign up for your <b>Customer</b> account.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
              noValidate
            >
              <div className="airy-field">
                <label>Full name</label>
                <div className="airy-input">
                  <input
                    autoComplete="name"
                    placeholder="Amélie Laurent"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>
              <div className="airy-field">
                <label>Phone</label>
                <div className="airy-input">
                  <input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    placeholder="10-digit mobile number"
                    value={phone}
                    onChange={(e) =>
                      setPhone(e.target.value.replace(/[^\d+]/g, ''))
                    }
                  />
                </div>
              </div>
              <div className="airy-field">
                <label>Password</label>
                <div className="airy-input">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Create a password (min 6)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="eye"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {error && <p className="err">{error}</p>}

              <button
                type="submit"
                className="airy-submit"
                disabled={loading || !canSubmit}
              >
                {loading ? 'Creating…' : 'Submit'}
              </button>
            </form>

            {social}

            <div className="airy-foot">
              <span>
                Have an account? <a onClick={() => go('login')}>Sign in</a>
              </span>
              <a>Terms &amp; Conditions</a>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
