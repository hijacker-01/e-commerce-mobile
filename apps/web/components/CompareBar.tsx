'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCompare, clearCompare } from '../lib/compare';

export default function CompareBar() {
  const [ids, setIds] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    const sync = () => setIds(getCompare());
    sync();
    window.addEventListener('app:compare', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('app:compare', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  if (ids.length === 0) return null;

  return (
    <div className="compare-bar">
      <span>
        <strong>{ids.length}</strong> selected to compare
      </span>
      <div className="row" style={{ gap: 8 }}>
        <button
          style={{ background: 'var(--accent)', color: '#fff', border: 'none' }}
          onClick={() => clearCompare()}
        >
          Clear
        </button>
        <button
          disabled={ids.length < 2}
          onClick={() => router.push(`/compare?ids=${ids.join(',')}`)}
        >
          Compare →
        </button>
      </div>
    </div>
  );
}
