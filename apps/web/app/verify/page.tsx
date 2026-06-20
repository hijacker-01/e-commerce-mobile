'use client';

import { useState } from 'react';
import { api } from '../../lib/api';

interface VerifyResult {
  genuine: boolean;
  brand?: string;
  model?: string;
  warrantyMonths?: number;
  validTill?: string;
  invoice?: string;
}

export default function VerifyPage() {
  const [serial, setSerial] = useState('');
  const [result, setResult] = useState<VerifyResult | null>(null);

  async function check() {
    if (!serial) return;
    setResult(await api.get<VerifyResult>(`/verify/imei/${encodeURIComponent(serial)}`));
  }

  return (
    <main style={{ maxWidth: 480 }}>
      <h1>Verify your device</h1>
      <p className="muted">Check a serial / IMEI for genuine warranty coverage.</p>
      <div className="row">
        <input
          placeholder="Serial / IMEI"
          value={serial}
          onChange={(e) => setSerial(e.target.value)}
        />
        <button onClick={check}>Verify</button>
      </div>
      {result && (
        <div
          className="card"
          style={{
            marginTop: 16,
            borderColor: result.genuine ? 'var(--accent)' : 'var(--danger)',
          }}
        >
          {result.genuine ? (
            <>
              <strong style={{ color: 'var(--accent)' }}>✓ Genuine product</strong>
              <p>
                {result.brand} {result.model}
              </p>
              <div className="muted">
                Warranty {result.warrantyMonths} months · valid till {result.validTill}
              </div>
              {result.invoice && (
                <div className="muted">Invoice: {result.invoice}</div>
              )}
            </>
          ) : (
            <strong style={{ color: 'var(--danger)' }}>
              ✗ No matching warranty record found
            </strong>
          )}
        </div>
      )}
    </main>
  );
}
