'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { colors, typography, spacing, radii } from '@/styles/tokens';

type PickListItem = {
  book_title_id: string;
  bin_label: string | null;
  bin_id: string | null;
  bin_code?: string | null;
  instruction: string | null;
  book_to_find: string | null;
  book_sku?: string | null;
  status: string | null;
  scanned_at: string | null;
};

type PickListRow = PickListItem & {
  title: string;
  author: string;
  sku: string;
  isPicked: boolean;
};

type ShipmentSummary = {
  id: string;
  orderNumber?: number | string | null;
  memberName: string;
  tier: string;
  createdAt: string;
};

const TIER_BOOK_COUNTS: Record<string, number> = {
  'little nest': 4,
  'cozy nest': 6,
  'story nest': 8,
};

const formatTierKey = (tier: string) => tier.trim().toLowerCase();

const getShipByDate = (createdAt: string) => {
  const createdDate = new Date(createdAt);
  if (Number.isNaN(createdDate.getTime())) return '—';

  const day = createdDate.getDay(); // 0 Sun - 6 Sat
  const daysUntilTuesday = (2 - day + 7) % 7;
  const daysUntilFriday = (5 - day + 7) % 7;
  const daysUntilShip = Math.min(
    daysUntilTuesday === 0 ? 0 : daysUntilTuesday,
    daysUntilFriday === 0 ? 0 : daysUntilFriday
  );
  const shipDate = new Date(createdDate);
  shipDate.setDate(createdDate.getDate() + daysUntilShip);

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(shipDate);
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

const parseBookToFind = (bookToFind: string | null) => {
  if (!bookToFind) {
    return { title: 'Unknown title', author: '' };
  }
  const cleaned = bookToFind.replace('📖 Find: "', '').replace('"', '');
  const [title, author] = cleaned.split('" by ');
  return {
    title: title?.trim() || 'Unknown title',
    author: author?.trim() || '',
  };
};

const mapPickListRow = (item: PickListItem): PickListRow => {
  const { title, author } = parseBookToFind(item.book_to_find);
  return {
    ...item,
    title,
    author,
    sku: item.book_sku ?? '',
    isPicked: item.status?.includes('PICKED') || Boolean(item.scanned_at),
  };
};

export default function PickBundle() {
  const params = useParams<{ bundleId: string }>();
  const bundleId = Array.isArray(params.bundleId)
    ? params.bundleId[0]
    : params.bundleId;
  const router = useRouter();
  const [items, setItems] = useState<PickListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [completeLoading, setCompleteLoading] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [shipmentSummary, setShipmentSummary] = useState<ShipmentSummary | null>(null);

  const loadPickList = useCallback(async () => {
    if (!bundleId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);
      const response = await fetch(`/api/shipments/${bundleId}/pick-list`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Failed to load pick list');
      }

      const data = (await response.json()) as PickListItem[];
      const sorted = data
        .map(mapPickListRow)
        .sort((a, b) => (a.bin_label || '').localeCompare(b.bin_label || ''));
      setItems(sorted);
    } catch (err) {
      console.error('Error loading pick list:', err);
      setError('Unable to load pick list. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [bundleId]);

  const loadShipmentSummary = useCallback(async () => {
    if (!bundleId) return;
    try {
      const response = await fetch(`/api/shipments/${bundleId}`, {
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error('Failed to load shipment');
      }
      const data = (await response.json()) as ShipmentSummary;
      setShipmentSummary(data);
    } catch (err) {
      console.error('Error loading shipment summary:', err);
    }
  }, [bundleId]);

  useEffect(() => {
    loadPickList();
    loadShipmentSummary();
  }, [loadPickList, loadShipmentSummary]);

  const pickedCount = useMemo(() => items.filter((item) => item.isPicked).length, [items]);
  const totalCount = items.length;
  const allPicked = totalCount > 0 && pickedCount === totalCount;
  const tierKey = shipmentSummary?.tier ? formatTierKey(shipmentSummary.tier) : '';
  const targetBookCount = tierKey ? TIER_BOOK_COUNTS[tierKey] : undefined;
  const displayBookCount = targetBookCount ?? (totalCount > 0 ? totalCount : undefined);

  const handleScan = async (item: PickListRow) => {
    if (item.isPicked) return;
    try {
      setActionLoadingId(item.book_title_id);
      if (!bundleId) {
        throw new Error('Missing shipment ID.');
      }
      const response = await fetch(`/api/shipments/${bundleId}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ book_title_id: item.book_title_id }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark as picked');
      }

      setItems((prev) =>
        prev.map((row) =>
          row.book_title_id === item.book_title_id
            ? { ...row, isPicked: true, status: '✅ PICKED', scanned_at: new Date().toISOString() }
            : row
        )
      );
    } catch (err) {
      console.error('Error scanning book:', err);
      setError('Unable to mark book as picked. Please try again.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleScanSubmit = async () => {
    const trimmed = scanInput.trim();
    if (!trimmed) return;
    setError(null);
    setSuccessMessage(null);
    const normalized = trimmed.toUpperCase();
    const match = items.find((item) => item.sku.toUpperCase() === normalized);
    if (!match) {
      setError('Scanned ID does not match any book in this pick list.');
      return;
    }
    await handleScan(match);
    setScanInput('');
  };

  const handleComplete = async () => {
    try {
      setCompleteLoading(true);
      setError(null);
      setSuccessMessage(null);
      if (!bundleId) {
        throw new Error('Missing shipment ID.');
      }
      const response = await fetch(`/api/shipments/${bundleId}/complete`, {
        method: 'POST',
      });

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body?.error || 'Failed to complete shipment');
      }

      setSuccessMessage('All books picked! Moving this shipment to shipping.');
      window.setTimeout(() => {
        router.push('/work/picking');
      }, 1500);
    } catch (err) {
      console.error('Error completing shipment:', err);
      setError('Unable to complete picking. Please confirm all books are scanned.');
    } finally {
      setCompleteLoading(false);
    }
  };

  const handleClearScans = async () => {
    if (!bundleId) {
      setError('Missing shipment ID.');
      return;
    }
    const confirmed = window.confirm('Clear all scans and start this pick list over?');
    if (!confirmed) return;
    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);
      const response = await fetch(`/api/shipments/${bundleId}/clear`, {
        method: 'POST',
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body?.error || 'Failed to clear scans');
      }
      setScanInput('');
      await loadPickList();
    } catch (err) {
      console.error('Error clearing scans:', err);
      setError('Unable to clear scans. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      padding: spacing.xl,
      maxWidth: '1400px',
      margin: '0 auto',
    }}>
      <header style={{
        marginBottom: spacing.xl,
        paddingBottom: spacing.lg,
        borderBottom: `3px solid ${colors.primary}`,
      }}>
        <Link
          href="/work/picking"
          style={{
            display: 'inline-block',
            color: colors.primary,
            textDecoration: 'none',
            fontSize: typography.fontSize.base,
            fontWeight: typography.fontWeight.semibold,
            marginBottom: spacing.sm,
          }}
        >
          ← PICKING QUEUE
        </Link>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h1 style={{
            fontFamily: typography.fontFamily.heading,
            fontSize: typography.fontSize['3xl'],
            fontWeight: typography.fontWeight.bold,
            color: colors.primary,
            margin: 0,
          }}>
            PICK LIST {shipmentSummary?.orderNumber ? `#${shipmentSummary.orderNumber}` : '—'}
          </h1>
          <div style={{
            fontSize: typography.fontSize['2xl'],
            fontWeight: typography.fontWeight.bold,
            color: allPicked ? colors.sageMist : colors.primary,
          }}>
            {pickedCount} / {totalCount}
          </div>
        </div>
      </header>

      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: spacing.md,
        marginBottom: spacing.xl,
        padding: spacing.lg,
        borderRadius: radii.md,
        backgroundColor: colors.surface,
        border: `2px solid ${colors.border}`,
      }}>
        <div>
          <div style={{
            fontSize: typography.fontSize.sm,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: colors.textLight,
            marginBottom: spacing.xs,
            fontWeight: typography.fontWeight.bold,
          }}>
            Order #
          </div>
          <div style={{
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.bold,
            color: colors.primary,
            fontFamily: 'monospace',
          }}>
            {shipmentSummary?.orderNumber ? `#${shipmentSummary.orderNumber}` : '—'}
          </div>
        </div>
        <div>
          <div style={{
            fontSize: typography.fontSize.sm,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: colors.textLight,
            marginBottom: spacing.xs,
            fontWeight: typography.fontWeight.bold,
          }}>
            Member
          </div>
          <div style={{
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.bold,
            color: colors.text,
          }}>
            {shipmentSummary?.memberName ?? '—'}
          </div>
        </div>
        <div>
          <div style={{
            fontSize: typography.fontSize.sm,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: colors.textLight,
            marginBottom: spacing.xs,
            fontWeight: typography.fontWeight.bold,
          }}>
            Tier
          </div>
          <div style={{
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.bold,
            color: colors.text,
          }}>
            {shipmentSummary?.tier ?? '—'}
          </div>
        </div>
        <div>
          <div style={{
            fontSize: typography.fontSize.sm,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: colors.textLight,
            marginBottom: spacing.xs,
            fontWeight: typography.fontWeight.bold,
          }}>
            Book Quantity
          </div>
          <div style={{
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.bold,
            color: colors.text,
          }}>
            {displayBookCount ? `${displayBookCount} books` : '—'}
          </div>
        </div>
        <div>
          <div style={{
            fontSize: typography.fontSize.sm,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: colors.textLight,
            marginBottom: spacing.xs,
            fontWeight: typography.fontWeight.bold,
          }}>
            Order Date
          </div>
          <div style={{
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.bold,
            color: colors.text,
          }}>
            {shipmentSummary?.createdAt ? formatDate(shipmentSummary.createdAt) : '—'}
          </div>
        </div>
        <div>
          <div style={{
            fontSize: typography.fontSize.sm,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: colors.textLight,
            marginBottom: spacing.xs,
            fontWeight: typography.fontWeight.bold,
          }}>
            Ship By (Tue/Fri)
          </div>
          <div style={{
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.bold,
            color: colors.text,
          }}>
            {shipmentSummary?.createdAt ? getShipByDate(shipmentSummary.createdAt) : '—'}
          </div>
        </div>
      </section>

      {/* Scan Input */}
      <div style={{
        marginBottom: spacing.lg,
        padding: spacing.md,
        borderRadius: radii.md,
        backgroundColor: colors.surface,
        border: `2px solid ${colors.border}`,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: spacing.md,
      }}>
        <div style={{ flex: '1 1 260px' }}>
          <div style={{
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.bold,
            color: colors.textLight,
            marginBottom: spacing.xs,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Scan book barcode
          </div>
          <input
            value={scanInput}
            onChange={(event) => {
              setScanInput(event.target.value);
              if (error) {
                setError(null);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleScanSubmit();
              }
            }}
            placeholder="Scan Book Nest SKU (e.g., BN-FLED-0214)"
            style={{
              width: '100%',
              padding: `${spacing.sm} ${spacing.md}`,
              borderRadius: radii.sm,
              border: `2px solid ${colors.border}`,
              fontSize: typography.fontSize.base,
            }}
          />
        </div>
        <button
          onClick={handleScanSubmit}
          disabled={!scanInput.trim()}
          style={{
            padding: `${spacing.sm} ${spacing.lg}`,
            backgroundColor: scanInput.trim() ? colors.primary : colors.border,
            color: scanInput.trim() ? colors.cream : colors.textLight,
            border: `2px solid ${scanInput.trim() ? colors.primary : colors.border}`,
            fontSize: typography.fontSize.base,
            fontWeight: typography.fontWeight.bold,
            textTransform: 'uppercase',
            borderRadius: radii.sm,
            cursor: scanInput.trim() ? 'pointer' : 'not-allowed',
            height: 'fit-content',
          }}
        >
          Scan
        </button>
        <button
          onClick={handleClearScans}
          disabled={loading || items.length === 0}
          style={{
            padding: `${spacing.sm} ${spacing.lg}`,
            backgroundColor: colors.surface,
            color: colors.primary,
            border: `2px solid ${colors.primary}`,
            fontSize: typography.fontSize.base,
            fontWeight: typography.fontWeight.bold,
            textTransform: 'uppercase',
            borderRadius: radii.sm,
            cursor: loading || items.length === 0 ? 'not-allowed' : 'pointer',
            height: 'fit-content',
          }}
        >
          Clear Scans
        </button>
        <div style={{
          flex: '1 1 220px',
          color: colors.textLight,
          fontSize: typography.fontSize.sm,
        }}>
          Tip: scan the Book Nest SKU barcode (e.g., BN-FLED-0214) to mark it picked.
        </div>
      </div>

      {/* Pick List Table */}
      {error && (
        <div style={{
          marginBottom: spacing.lg,
          padding: spacing.md,
          borderRadius: radii.md,
          backgroundColor: colors.cream,
          border: `2px solid ${colors.primary}`,
          color: colors.primary,
          fontSize: typography.fontSize.base,
          fontWeight: typography.fontWeight.semibold,
        }}>
          {error}
        </div>
      )}
      {successMessage && (
        <div style={{
          marginBottom: spacing.lg,
          padding: spacing.md,
          borderRadius: radii.md,
          backgroundColor: colors.sageMist,
          border: `2px solid ${colors.success}`,
          color: colors.deepCocoa,
          fontSize: typography.fontSize.base,
          fontWeight: typography.fontWeight.semibold,
        }}>
          {successMessage}
        </div>
      )}

      <div style={{
        backgroundColor: colors.surface,
        border: `2px solid ${colors.border}`,
        borderRadius: radii.md,
        overflow: 'hidden',
        marginBottom: spacing.xl,
      }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
        }}>
          <thead>
            <tr style={{
              backgroundColor: colors.primary,
              color: colors.cream,
            }}>
              <th style={{
                padding: spacing.md,
                textAlign: 'left',
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.bold,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                width: '15%',
              }}>
                Bin
              </th>
              <th style={{
                padding: spacing.md,
                textAlign: 'left',
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.bold,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                width: '18%',
              }}>
                Book Nest SKU
              </th>
              <th style={{
                padding: spacing.md,
                textAlign: 'left',
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.bold,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Title
              </th>
              <th style={{
                padding: spacing.md,
                textAlign: 'left',
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.bold,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                width: '20%',
              }}>
                Instruction
              </th>
              <th style={{
                padding: spacing.md,
                textAlign: 'center',
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.bold,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                width: '14%',
              }}>
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    padding: spacing.lg,
                    textAlign: 'center',
                    fontSize: typography.fontSize.base,
                    color: colors.textLight,
                  }}
                >
                  Loading pick list…
                </td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    padding: spacing.lg,
                    textAlign: 'center',
                    fontSize: typography.fontSize.base,
                    color: colors.textLight,
                  }}
                >
                  No books assigned yet.
                </td>
              </tr>
            )}
            {!loading && items.map((item, index) => {
              const isPicked = item.isPicked;
              return (
                <tr
                  key={item.book_title_id}
                  style={{
                    borderBottom: `2px solid ${colors.border}`,
                    backgroundColor: isPicked
                      ? colors.sageMist
                      : index % 2 === 0
                      ? colors.surface
                      : colors.cream,
                    opacity: isPicked ? 0.7 : 1,
                  }}
                >
                  <td style={{
                    padding: spacing.md,
                    fontSize: typography.fontSize.xl,
                    fontWeight: typography.fontWeight.bold,
                    color: colors.text,
                    fontFamily: 'monospace',
                  }}>
                    {item.bin_code || item.bin_label || '—'}
                  </td>
                  <td style={{
                    padding: spacing.md,
                    fontSize: typography.fontSize.base,
                    color: colors.primary,
                    fontFamily: 'monospace',
                    fontWeight: typography.fontWeight.bold,
                  }}>
                    {item.sku || '—'}
                  </td>
                  <td style={{
                    padding: spacing.md,
                    fontSize: typography.fontSize.base,
                    color: colors.text,
                  }}>
                    <div style={{ fontWeight: typography.fontWeight.bold }}>{item.title}</div>
                    {item.author && (
                      <div style={{ color: colors.textLight, fontSize: typography.fontSize.sm }}>
                        by {item.author}
                      </div>
                    )}
                  </td>
                  <td style={{
                    padding: spacing.md,
                    fontSize: typography.fontSize.base,
                    color: colors.text,
                  }}>
                    {item.instruction || 'Grab from bin'}
                  </td>
                  <td style={{
                    padding: spacing.md,
                    textAlign: 'center',
                  }}>
                    {isPicked ? (
                      <span style={{
                        display: 'inline-block',
                        padding: `${spacing.xs} ${spacing.md}`,
                        backgroundColor: colors.success,
                        color: colors.deepCocoa,
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.bold,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderRadius: radii.sm,
                      }}>
                        ✓ Picked
                      </span>
                    ) : (
                      <span style={{
                        display: 'inline-block',
                        padding: `${spacing.xs} ${spacing.md}`,
                        backgroundColor:
                          actionLoadingId === item.book_title_id ? colors.primary : colors.surface,
                        color:
                          actionLoadingId === item.book_title_id ? colors.cream : colors.textLight,
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.bold,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        border: `2px solid ${
                          actionLoadingId === item.book_title_id ? colors.primary : colors.border
                        }`,
                        borderRadius: radii.sm,
                        minWidth: '110px',
                      }}>
                        {actionLoadingId === item.book_title_id ? 'Scanning…' : 'Pending'}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: spacing.md,
        justifyContent: 'space-between',
      }}>
        <Link
          href={`/pick-slip/${bundleId ?? ''}`}
          style={{
            display: 'inline-block',
            padding: `${spacing.md} ${spacing.xl}`,
            backgroundColor: colors.surface,
            color: colors.primary,
            border: `3px solid ${colors.primary}`,
            textDecoration: 'none',
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.bold,
            textTransform: 'uppercase',
            borderRadius: radii.md,
          }}
        >
          🖨 PRINT PICK SLIP
        </Link>

        <button
          disabled={!allPicked || completeLoading}
          onClick={handleComplete}
          style={{
            padding: `${spacing.md} ${spacing.xl}`,
            backgroundColor: allPicked ? colors.primary : colors.border,
            color: allPicked ? colors.cream : colors.textLight,
            border: `3px solid ${allPicked ? colors.primary : colors.border}`,
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.bold,
            textTransform: 'uppercase',
            borderRadius: radii.md,
            cursor: allPicked ? 'pointer' : 'not-allowed',
          }}
        >
          {completeLoading ? 'Completing…' : 'Complete Picking →'}
        </button>
      </div>
    </div>
  );
}