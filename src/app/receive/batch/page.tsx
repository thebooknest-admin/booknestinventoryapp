'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { colors, typography, spacing, radii } from '@/styles/tokens';

type IntakeItem = {
  id: string;
  batch_id: string;
  isbn: string;
  metadata: {
    title?: string;
    author?: string;
    summary?: string | null;
    readingAge?: string | null;
    coverUrl?: string | null;
  };
  suggested_age_tier: string | null;
  suggested_bin: string | null;
  final_age_tier: string | null;
  final_bin: string | null;
  qty: number;
  action: 'create' | 'increase_qty' | 'skip' | 'new_copy';
  existing_book_id: string | null;
  error: string | null;
  created_at: string;
};

type CommitSummary = {
  batch_id: string;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: Array<{ item_id: string; isbn: string; error: string }>;
};

const AGE_OPTIONS = ['HATCH', 'FLED', 'SOAR', 'SKY'];

export default function BatchReceivePage() {
  const [batchId, setBatchId] = useState<string | null>(null);
  const [batchStatus, setBatchStatus] = useState<string | null>(null);
  const [items, setItems] = useState<IntakeItem[]>([]);
  const [scanInput, setScanInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [summary, setSummary] = useState<CommitSummary | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAge, setBulkAge] = useState('');
  const [bulkBin, setBulkBin] = useState('');

  const count = items.length;
  const maxReached = count >= 20;

  const missingRequiredCount = useMemo(() => {
    return items.filter((i) => i.action !== 'skip' && (!i.final_age_tier || !i.final_bin)).length;
  }, [items]);

  async function startBatch() {
    setBusy(true);
    setError(null);
    setMessage(null);
    setSummary(null);

    try {
      const res = await fetch('/api/intake-batch/start', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to start batch');

      const id = data?.batch?.id as string;
      setBatchId(id);
      setBatchStatus(data?.batch?.status || 'open');
      setMessage(data?.reused ? `Reused open batch: ${id}` : `Started new batch: ${id}`);
      await loadBatch(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start batch');
    } finally {
      setBusy(false);
    }
  }

  async function loadBatch(id: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/intake-batch/${id}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load batch');

      setBatchStatus(data?.batch?.status || null);
      setItems((data?.items || []) as IntakeItem[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load batch');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Auto-pick up existing open batch on page load
    startBatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function scanIsbn(e: React.FormEvent) {
    e.preventDefault();
    if (!batchId) return;

    const isbn = scanInput.trim();
    if (!isbn) return;

    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(`/api/intake-batch/${batchId}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isbn }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data?.code === 'DUPLICATE_IN_BATCH') {
          throw new Error('This ISBN is already in the current batch.');
        }
        throw new Error(data?.error || 'Failed to scan ISBN');
      }

      setScanInput('');
      await loadBatch(batchId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to scan ISBN');
    } finally {
      setBusy(false);
    }
  }

  async function patchItem(itemId: string, patch: Record<string, unknown>) {
    if (!batchId) return;
    setError(null);

    const res = await fetch(`/api/intake-batch/${batchId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, ...patch }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data?.error || 'Failed to update row');
      return;
    }

    setItems((prev) => prev.map((it) => (it.id === itemId ? data.item : it)));
  }

  async function applyBulk() {
    if (!selectedIds.length) return;
    setBusy(true);
    setError(null);

    try {
      for (const id of selectedIds) {
        const patch: Record<string, unknown> = {};
        if (bulkAge) patch.final_age_tier = bulkAge;
        if (bulkBin) patch.final_bin = bulkBin;
        if (Object.keys(patch).length) {
          // eslint-disable-next-line no-await-in-loop
          await patchItem(id, patch);
        }
      }
      setMessage(`Applied bulk updates to ${selectedIds.length} row(s).`);
    } finally {
      setBusy(false);
    }
  }

  async function confirmBatch() {
    if (!batchId) return;
    if (missingRequiredCount > 0) {
      setError('Please fill final age tier and bin for all non-skipped rows before commit.');
      return;
    }

    const ok = window.confirm('Confirm this batch? This will create/update inventory in one commit.');
    if (!ok) return;

    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(`/api/intake-batch/${batchId}/commit`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to commit batch');

      setSummary(data.summary as CommitSummary);
      setMessage('Batch committed. New copies were sent to label pending queue.');
      await loadBatch(batchId);
      setBatchStatus('committed');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to commit batch');
    } finally {
      setBusy(false);
    }
  }

  async function cancelBatch() {
    if (!batchId) return;
    const ok = window.confirm('Cancel this batch?');
    if (!ok) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/intake-batch/${batchId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to cancel batch');

      setMessage('Batch cancelled.');
      setBatchStatus('cancelled');
      setItems([]);
      setSelectedIds([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to cancel batch');
    } finally {
      setBusy(false);
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <div style={{ minHeight: '100vh', padding: spacing.xl, maxWidth: 1500, margin: '0 auto' }}>
      <header style={{ marginBottom: spacing.lg, paddingBottom: spacing.md, borderBottom: `3px solid ${colors.primary}` }}>
        <Link href="/receive" style={{ color: colors.primary, textDecoration: 'none', fontWeight: 700 }}>
          ← RECEIVE
        </Link>
        <h1 style={{ margin: `${spacing.sm} 0 0 0`, color: colors.primary, fontSize: typography.fontSize['3xl'] }}>
          Batch Receive Mode
        </h1>
        <p style={{ marginTop: spacing.xs, color: colors.textLight }}>
          Scan up to 20 ISBNs, review/edit rows, then confirm all at once.
        </p>
      </header>

      <div style={{ display: 'flex', gap: spacing.md, alignItems: 'center', flexWrap: 'wrap', marginBottom: spacing.md }}>
        <button onClick={startBatch} disabled={busy} style={btn(colors.primary, colors.cream)}>
          Start New Intake Batch
        </button>

        <span style={{ fontWeight: 700 }}>Batch: {batchId || 'None'}</span>
        <span style={{ fontWeight: 700 }}>Status: {batchStatus || '—'}</span>
        <span style={{ fontWeight: 700 }}>Count: {count}/20</span>
      </div>

      {error && <div style={notice(colors.warning, colors.deepCocoa)}>{error}</div>}
      {message && <div style={notice(colors.sageMist, colors.deepCocoa)}>{message}</div>}

      <form onSubmit={scanIsbn} style={{ display: 'flex', gap: spacing.sm, marginBottom: spacing.md }}>
        <input
          value={scanInput}
          onChange={(e) => setScanInput(e.target.value)}
          autoFocus
          placeholder="Scan ISBN here..."
          disabled={!batchId || batchStatus !== 'open' || maxReached || busy}
          style={{
            flex: 1,
            padding: spacing.md,
            border: `2px solid ${colors.border}`,
            borderRadius: radii.sm,
            fontSize: typography.fontSize.xl,
            fontFamily: 'monospace',
          }}
        />
        <button
          type="submit"
          disabled={!batchId || batchStatus !== 'open' || maxReached || busy || !scanInput.trim()}
          style={btn(colors.secondary, colors.cream)}
        >
          Add Scan
        </button>
      </form>

      <div style={{ display: 'flex', gap: spacing.sm, alignItems: 'center', marginBottom: spacing.md, flexWrap: 'wrap' }}>
        <strong>Bulk apply to selected:</strong>
        <select value={bulkAge} onChange={(e) => setBulkAge(e.target.value)} style={selectStyle}>
          <option value="">Age tier...</option>
          {AGE_OPTIONS.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <input
          value={bulkBin}
          onChange={(e) => setBulkBin(e.target.value.toUpperCase())}
          placeholder="Bin..."
          style={inputSmall}
        />
        <button onClick={applyBulk} disabled={!selectedIds.length || busy} type="button" style={btn(colors.deepTeal, colors.cream)}>
          Apply
        </button>
      </div>

      <div style={{ overflowX: 'auto', border: `2px solid ${colors.border}`, borderRadius: radii.md, background: colors.surface }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1300 }}>
          <thead>
            <tr style={{ background: colors.primary, color: colors.cream }}>
              <th style={th}>Select</th>
              <th style={th}>ISBN</th>
              <th style={th}>Title</th>
              <th style={th}>Author</th>
              <th style={th}>Age Tier</th>
              <th style={th}>Bin</th>
              <th style={th}>Qty</th>
              <th style={th}>Action</th>
              <th style={th}>Status</th>
              <th style={th}>Error</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} style={td}>Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={10} style={td}>No items yet. Start scanning.</td></tr>
            ) : (
              items.map((row) => {
                const title = row.metadata?.title || 'Unknown Title';
                const author = row.metadata?.author || 'Unknown Author';
                const missingMeta = title === 'Unknown Title' || author === 'Unknown Author';

                return (
                  <tr key={row.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <td style={td}>
                      <input type="checkbox" checked={selectedIds.includes(row.id)} onChange={() => toggleSelected(row.id)} />
                    </td>
                    <td style={td}>{row.isbn}</td>
                    <td style={td}>{title}</td>
                    <td style={td}>{author}</td>
                    <td style={td}>
                      <select
                        value={row.final_age_tier || ''}
                        onChange={(e) => patchItem(row.id, { final_age_tier: e.target.value })}
                        style={selectStyle}
                        disabled={batchStatus !== 'open'}
                      >
                        <option value="">Select...</option>
                        {AGE_OPTIONS.map((a) => (
                          <option key={a} value={a}>{a}</option>
                        ))}
                      </select>
                    </td>
                    <td style={td}>
                      <input
                        value={row.final_bin || ''}
                        onChange={(e) => patchItem(row.id, { final_bin: e.target.value.toUpperCase() })}
                        style={inputSmall}
                        disabled={batchStatus !== 'open'}
                      />
                    </td>
                    <td style={td}>
                      <input
                        type="number"
                        min={1}
                        max={200}
                        value={row.qty || 1}
                        onChange={(e) => patchItem(row.id, { qty: Number(e.target.value) || 1 })}
                        style={{ ...inputSmall, width: 80 }}
                        disabled={batchStatus !== 'open'}
                      />
                    </td>
                    <td style={td}>
                      <select
                        value={row.action}
                        onChange={(e) => patchItem(row.id, { action: e.target.value })}
                        style={selectStyle}
                        disabled={batchStatus !== 'open'}
                      >
                        <option value="create">create</option>
                        <option value="increase_qty">increase_qty</option>
                        <option value="new_copy">new_copy</option>
                        <option value="skip">skip</option>
                      </select>
                    </td>
                    <td style={td}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {row.existing_book_id && <Badge text="Existing in inventory" bg={colors.goldenHoney} />}
                        {missingMeta && <Badge text="Missing metadata" bg={colors.warning} />}
                        {!row.error && !missingMeta && !row.existing_book_id && <Badge text="New" bg={colors.sageMist} />}
                      </div>
                    </td>
                    <td style={td}>{row.error || '—'}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: spacing.md, marginTop: spacing.lg, flexWrap: 'wrap' }}>
        <button
          onClick={confirmBatch}
          disabled={!batchId || batchStatus !== 'open' || busy || items.length === 0}
          style={btn(colors.deepTeal, colors.cream)}
        >
          Confirm Batch
        </button>

        <button
          onClick={cancelBatch}
          disabled={!batchId || batchStatus !== 'open' || busy}
          style={btn(colors.warning, colors.deepCocoa)}
        >
          Cancel Batch
        </button>

        <Link href="/work/labels" style={{ ...btn(colors.surface, colors.text), textDecoration: 'none' }}>
          Open Label Queue →
        </Link>
      </div>

      {summary && (
        <div style={{ marginTop: spacing.lg, ...notice(colors.cream, colors.text), border: `2px solid ${colors.border}` }}>
          <strong>Commit Summary</strong>
          <div>Created: {summary.created}</div>
          <div>Updated: {summary.updated}</div>
          <div>Skipped: {summary.skipped}</div>
          <div>Failed: {summary.failed}</div>
          {summary.errors?.length > 0 && (
            <ul>
              {summary.errors.map((e) => (
                <li key={e.item_id}>{e.isbn}: {e.error}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Badge({ text, bg }: { text: string; bg: string }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        padding: '2px 6px',
        borderRadius: 999,
        background: bg,
        color: colors.deepCocoa,
      }}
    >
      {text}
    </span>
  );
}

const th: React.CSSProperties = {
  padding: '10px',
  textAlign: 'left',
  fontSize: 12,
  textTransform: 'uppercase',
};

const td: React.CSSProperties = {
  padding: '8px 10px',
  verticalAlign: 'top',
};

const inputSmall: React.CSSProperties = {
  width: '100%',
  minWidth: 120,
  padding: '6px 8px',
  border: `1px solid ${colors.border}`,
  borderRadius: 6,
  fontFamily: 'monospace',
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  minWidth: 130,
  padding: '6px 8px',
  border: `1px solid ${colors.border}`,
  borderRadius: 6,
};

const btn = (bg: string, color: string): React.CSSProperties => ({
  padding: '10px 12px',
  borderRadius: 8,
  border: `2px solid ${bg === colors.surface ? colors.border : bg}`,
  background: bg,
  color,
  fontWeight: 700,
  cursor: 'pointer',
});

const notice = (bg: string, color: string): React.CSSProperties => ({
  background: bg,
  color,
  borderRadius: 8,
  padding: '10px',
  marginBottom: '10px',
});
