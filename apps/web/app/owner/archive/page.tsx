'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, getRole, getToken } from '../../../lib/api';
import { toast } from '../../../lib/toast';

interface ArchiveFile {
  id: string;
  name: string;
  size: number;
  createdAt: string;
}

function kb(n: number) {
  return n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`;
}

export default function ArchivePage() {
  const [files, setFiles] = useState<ArchiveFile[]>([]);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  function load() {
    api.get<ArchiveFile[]>('/archive').then(setFiles).catch(() => {});
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

  async function archive(scope: 'terminal' | 'all') {
    if (
      scope === 'all' &&
      !window.confirm(
        'Archive and PERMANENTLY remove ALL orders (including in-progress ones) from the live database? They stay recoverable from the archive file.',
      )
    )
      return;
    setBusy(true);
    try {
      const r = await api.post<{ archived: number; totalSales?: string; file?: string }>(
        '/archive',
        { scope },
      );
      if (r.archived === 0) toast('No matching orders to archive.', 'info');
      else
        toast(
          `Archived ${r.archived} orders (₹${r.totalSales} sales) → ${r.file}. Removed from the live DB.`,
        );
      load();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function restore(id: string) {
    setBusy(true);
    try {
      const r = await api.post<{ restored: number; skipped: number; failed: string[] }>(
        `/archive/${id}/restore`,
      );
      toast(
        `Restored ${r.restored} orders` +
          (r.skipped ? `, ${r.skipped} already present` : '') +
          (r.failed?.length ? `, ${r.failed.length} failed` : ''),
        r.failed?.length ? 'info' : 'success',
      );
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function download(id: string) {
    try {
      const data = await api.get<unknown>(`/archive/${id}`);
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = id;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  async function remove(id: string) {
    if (!window.confirm(`Delete archive file "${id}"? This cannot be undone.`))
      return;
    try {
      await api.del(`/archive/${id}`);
      toast('Archive file deleted', 'info');
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
        Cold storage
      </div>
      <h1>Archive orders &amp; sales</h1>
      <p className="muted" style={{ lineHeight: 1.6 }}>
        Export completed orders &amp; sales (invoices) to a file and{' '}
        <strong>remove them from the live database</strong> to keep it lean. The
        archive file is your recovery copy — restore any batch back anytime.
        Stored on the server now; a Google&nbsp;Drive connector plugs into the
        same flow once credentials are added (products/inventory are never
        archived).
      </p>

      <div className="card" style={{ marginTop: 8 }}>
        <strong>Create an archive</strong>
        <div className="row" style={{ marginTop: 12, flexWrap: 'wrap' }}>
          <button onClick={() => archive('terminal')} disabled={busy}>
            Archive delivered &amp; closed orders
          </button>
          <button
            className="secondary"
            onClick={() => archive('all')}
            disabled={busy}
          >
            Archive ALL orders
          </button>
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
          “Delivered &amp; closed” = Delivered, Cancelled, Rejected. These no
          longer need to sit in the active database.
        </p>
      </div>

      <h2 style={{ marginTop: 28 }}>Archive files</h2>
      {files.length === 0 ? (
        <div className="empty-state">
          <div className="emoji">🗄️</div>
          <h3 style={{ marginTop: 12 }}>No archives yet</h3>
          <p className="muted">Create one above to offload completed sales.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 8 }}>
          <table>
            <thead>
              <tr>
                <th>File</th>
                <th>Size</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {files.map((f) => (
                <tr key={f.id}>
                  <td style={{ wordBreak: 'break-all' }}>{f.name}</td>
                  <td>{kb(f.size)}</td>
                  <td className="muted">
                    {new Date(f.createdAt).toLocaleString()}
                  </td>
                  <td>
                    <div
                      className="row"
                      style={{ gap: 6, justifyContent: 'flex-end' }}
                    >
                      <button
                        className="success"
                        onClick={() => restore(f.id)}
                        disabled={busy}
                      >
                        Restore
                      </button>
                      <button
                        className="secondary"
                        onClick={() => download(f.id)}
                      >
                        ⬇ Download
                      </button>
                      <button
                        className="secondary"
                        onClick={() => remove(f.id)}
                      >
                        Delete
                      </button>
                    </div>
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
