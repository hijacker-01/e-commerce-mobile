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
      <h1>Service centers</h1>
      <p className="muted">Find authorized service & repair centers near you.</p>
      <div className="row" style={{ margin: '12px 0 20px' }}>
        <input
          placeholder="Brand (e.g. Samsung)"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          style={{ maxWidth: 200 }}
        />
        <input
          placeholder="City / area"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button onClick={load}>Search</button>
      </div>
      <div className="grid">
        {centers.map((c) => (
          <div key={c.id} className="card">
            <span className="badge">{c.brand}</span>
            <strong style={{ display: 'block', marginTop: 6 }}>{c.name}</strong>
            {c.address && <div className="muted">{c.address}</div>}
            {c.hours && <div className="muted">Hours: {c.hours}</div>}
            {c.phone && (
              <a href={`tel:${c.phone}`} className="price" style={{ display: 'block' }}>
                📞 {c.phone}
              </a>
            )}
          </div>
        ))}
        {centers.length === 0 && <p className="muted">No service centers found.</p>}
      </div>
    </main>
  );
}
