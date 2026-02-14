'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { colors, typography, spacing, radii } from '@/styles/tokens';

type LabelRow = {
  id: string;
  title: string;
  sku: string;
  bin_code: string;
  qr_value: string;
  batch_id: string;
};

function toCsv(rows: LabelRow[]) {
  const escape = (v: string) => `"${String(v ?? '').replaceAll('"', '""')}"`;
  const header = ['title', 'sku', 'bin_code', 'qr_value'];
  const body = rows.map((r) => [escape(r.title), escape(r.sku), escape(r.bin_code), escape(r.qr_value)].join(','));
  return [header.join(','), ...body].join('\n');
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function LabelQueuePage() {
  const [rows, setRows] = useState<LabelRow[]>([]);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [limitCount, setLimitCount] = useState('20');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const csvContent = useMemo(() => toCsv(rows), [rows]);

  async function loadActiveBatch() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/labels/active-batch', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load active batch');
      setRows(data.rows || []);
      setBatchId(data.batchId || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load active batch');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadActiveBatch();
  }, []);

  async function createBatch() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const parsed = Number(limitCount || '20');
      const limit = Number.isFinite(parsed) ? parsed : 20;
      const res = await fetch('/api/labels/create-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limitCount: limit }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to create batch');

      setRows(data.rows || []);
      setBatchId(data.batchId || null);
      setMessage(`Batch ready: ${data.batchId || 'N/A'} (${data.count || 0} labels)`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create batch');
    } finally {
      setBusy(false);
    }
  }

  async function markPrinted() {
    if (!batchId) return;
    const confirmed = window.confirm(`Mark batch ${batchId} as printed?`);
    if (!confirmed) return;

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/labels/mark-printed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to mark printed');

      setMessage(`Marked printed: ${data.updatedCount} labels`);
      setRows([]);
      setBatchId(null);
      await loadActiveBatch();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to mark printed');
    } finally {
      setBusy(false);
    }
  }

  async function releaseBatch() {
    if (!batchId) return;
    const confirmed = window.confirm(`Release batch ${batchId} back to queue?`);
    if (!confirmed) return;

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/labels/release-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to release batch');

      setMessage(`Released: ${data.updatedCount} labels`);
      setRows([]);
      setBatchId(null);
      await loadActiveBatch();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to release batch');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', padding: spacing.lg, maxWidth: '1400px', margin: '0 auto' }}>
      <header style={{ marginBottom: spacing.lg, paddingBottom: spacing.md, borderBottom: `3px solid ${colors.primary}` }}>
        <Link href="/dashboard" style={{ color: colors.primary, textDecoration: 'none', fontWeight: 700 }}>
          ← DASHBOARD
        </Link>
        <h1 style={{ margin: `${spacing.sm} 0 0 0`, color: colors.primary, fontSize: typography.fontSize['3xl'] }}>
          Label Queue
        </h1>
        <p style={{ marginTop: spacing.xs, color: colors.textLight }}>
          Create a batch, export CSV for FlashLabel, print, then mark printed.
        </p>
      </header>

      <div style={{ display: 'flex', gap: spacing.md, flexWrap: 'wrap', alignItems: 'center', marginBottom: spacing.md }}>
        <label style={{ fontWeight: 700 }}>Batch size</label>
        <input
          value={limitCount}
          onChange={(e) => setLimitCount(e.target.value)}
          style={{ width: 80, padding: spacing.sm, border: `2px solid ${colors.border}`, borderRadius: radii.sm }}
        />

        <button onClick={createBatch} disabled={busy} style={btn(colors.primary, colors.cream)}>
          Create Next Batch
        </button>

        <button
          onClick={() => downloadCsv(`labels-${batchId || 'batch'}.csv`, csvContent)}
          disabled={!rows.length || busy}
          style={btn(colors.secondary, colors.cream)}
        >
          Export CSV
        </button>

        <button onClick={markPrinted} disabled={!batchId || busy} style={btn(colors.deepTeal, colors.cream)}>
          Mark Batch Printed
        </button>

        <button onClick={releaseBatch} disabled={!batchId || busy} style={btn(colors.warning, colors.deepCocoa)}>
          Release Batch
        </button>
      </div>

      <div style={{ marginBottom: spacing.md, fontWeight: 700 }}>
        Active Batch ID: {batchId || 'None'}
      </div>

      {message && <div style={notice(colors.sageMist, colors.deepCocoa)}>{message}</div>}
      {error && <div style={notice(colors.warning, colors.deepCocoa)}>{error}</div>}

      <div style={{ overflowX: 'auto', border: `2px solid ${colors.border}`, borderRadius: radii.md, background: colors.surface }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
          <thead>
            <tr style={{ background: colors.primary, color: colors.cream }}>
              <th style={th}>Title</th>
              <th style={th}>SKU</th>
              <th style={th}>Bin</th>
              <th style={th}>QR Value</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} style={td}>Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={4} style={td}>No active batch rows</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                <td style={td}>{r.title}</td>
                <td style={td}>{r.sku}</td>
                <td style={td}>{r.bin_code || '—'}</td>
                <td style={td}>{r.qr_value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th: CSSProperties = {
  padding: '10px',
  textAlign: 'left',
  fontSize: '12px',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const td: CSSProperties = {
  padding: '10px',
};

const btn = (bg: string, color: string): CSSProperties => ({
  padding: '10px 12px',
  border: `2px solid ${bg}`,
  borderRadius: '8px',
  background: bg,
  color,
  fontWeight: 700,
  cursor: 'pointer',
});

const notice = (bg: string, color: string): CSSProperties => ({
  background: bg,
  color,
  borderRadius: '8px',
  padding: '10px',
  marginBottom: '10px',
});
