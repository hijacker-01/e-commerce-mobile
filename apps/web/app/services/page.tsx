'use client';

import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

interface ServiceCenter {
  id: string;
  brand: string;
  name: string;
  address?: string;
  phone?: string;
  hours?: string;
}

const SERVICE_TYPES = [
  '📱 Screen replacement',
  '🔋 Battery service',
  '🛡️ Warranty claims',
  '💧 Water-damage recovery',
  '⚙️ Software & updates',
  '📦 Data transfer',
  '🔍 Free diagnostics',
  '🎧 Audio repairs',
];

export default function ServicesPage() {
  const [centers, setCenters] = useState<ServiceCenter[]>([]);
  const [brand, setBrand] = useState('');
  const [q, setQ] = useState('');

  function load() {
    const params = new URLSearchParams();
    if (brand) params.set('brand', brand);
    if (q) params.set('q', q);
    api
      .get<ServiceCenter[]>(`/service-centers?${params.toString()}`)
      .then(setCenters)
      .catch(() => {});
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main>
      {/* Highlighted services hero */}
      <section className="hero" style={{ marginBottom: 28 }}>
        <div className="eyebrow" style={{ color: 'rgba(255,255,255,0.85)' }}>
          🔧 In-store service centre
        </div>
        <h1>We service almost every brand.</h1>
        <p>
          Phones, tablets, laptops &amp; audio — repairs, warranty claims, screen
          &amp; battery, software fixes, water-damage recovery and data transfer,
          all under one roof. Genuine parts, fast turnaround, trusted by 5M+
          customers.
        </p>
        <div className="hero-cta" style={{ gap: 8, flexWrap: 'wrap' }}>
          {SERVICE_TYPES.map((s) => (
            <span
              key={s}
              className="chip"
              style={{
                background: 'rgba(255,255,255,0.15)',
                borderColor: 'rgba(255,255,255,0.35)',
                color: '#fff',
              }}
            >
              {s}
            </span>
          ))}
        </div>
      </section>

      <div className="section-head">
        <h2 style={{ margin: 0 }}>Brands we service</h2>
        <span className="muted">
          {centers.length > 0 ? `${centers.length} brands` : ''}
        </span>
      </div>
      <p className="muted" style={{ marginTop: 0 }}>
        Search by brand or city — our team handles authorized &amp; out-of-warranty
        repairs for each.
      </p>
      <div className="row" style={{ margin: '12px 0 24px' }}>
        <input
          placeholder="Brand (e.g. Samsung)"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
          style={{ maxWidth: 200 }}
        />
        <input
          placeholder="City / area"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
        />
        <button onClick={load}>Search</button>
      </div>

      <div className="grid">
        {centers.map((c) => (
          <div key={c.id} className="card">
            <span className="badge">{c.brand}</span>
            <strong style={{ display: 'block', marginTop: 8 }}>{c.name}</strong>
            {c.hours && (
              <div className="stock-in" style={{ marginTop: 6, fontSize: 13 }}>
                ⏱ {c.hours}
              </div>
            )}
            {c.address && (
              <div className="muted" style={{ marginTop: 4 }}>
                📍 {c.address}
              </div>
            )}
            {c.phone && (
              <a
                href={`tel:${c.phone}`}
                className="btn"
                style={{ marginTop: 12, width: '100%' }}
              >
                📞 Book / enquire
              </a>
            )}
          </div>
        ))}
        {centers.length === 0 && (
          <div className="empty-state">
            <div className="emoji">🔧</div>
            <h3 style={{ marginTop: 12 }}>No services found</h3>
            <p className="muted">Try a different brand or city.</p>
          </div>
        )}
      </div>
    </main>
  );
}
