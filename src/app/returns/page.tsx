'use client';

import { useState, useRef, useEffect } from 'react';
import { colors, typography, spacing, radii, shadows } from '@/styles/tokens';
import { getBookCopybySku, updateBookCopyStatus } from '@/app/actions/returns';

interface BookCopyInfo {
  id: string;
  sku: string;
  isbn: string;
  status: string;
  bin: string;
  ageGroup: string;
  title: string;
  author: string;
  coverUrl: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  in_house: 'In House',
  picking: 'Picking',
  picked: 'Picked',
  packed: 'Packed',
  shipped: 'Shipped',
  returned: 'Returned',
  damaged: 'Damaged',
  retired: 'Retired',
};

const STATUS_CONFIG: Record<string, { bg: string; color: string; border: string }> = {
  in_house: { bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0' },
  picking: { bg: '#FFFBEB', color: '#92400E', border: '#FDE68A' },
  picked: { bg: '#EFF6FF', color: '#1E40AF', border: '#BFDBFE' },
  packed: { bg: '#F0FDF4', color: '#166534', border: '#BBF7D0' },
  shipped: { bg: '#FFFBEB', color: '#92400E', border: '#FDE68A' },
  returned: { bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0' },
  damaged: { bg: '#FEF2F2', color: '#991B1B', border: '#FECACA' },
  retired: { bg: '#F3F4F6', color: '#6B7280', border: '#D1D5DB' },
};

const AGE_LABELS: Record<string, string> = {
  hatchlings: 'Hatchlings (0–2)',
  fledglings: 'Fledglings (3–5)',
  soarers: 'Soarers (6–8)',
  sky_readers: 'Sky Readers (9–12)',
};

export default function ReturnsPage() {
  const [skuInput, setSkuInput] = useState('');
  const [bookCopy, setBookCopy] = useState<BookCopyInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [processedCount, setProcessedCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the input
  useEffect(() => {
    inputRef.current?.focus();
  }, [bookCopy, successMessage]);

  const handleSkuScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skuInput.trim()) return;

    setIsLoading(true);
    setError(null);
    setBookCopy(null);
    setSuccessMessage(null);

    try {
      const result = await getBookCopybySku(skuInput.trim());
      if (result.success && result.bookCopy) {
        setBookCopy(result.bookCopy);
      } else {
        setError(result.error || 'Book not found');
      }
    } catch {
      setError('Failed to fetch book data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string, note?: string) => {
    if (!bookCopy) return;

    setIsUpdating(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await updateBookCopyStatus(
        bookCopy.id,
        bookCopy.sku,
        bookCopy.status,
        newStatus,
        note
      );

      if (result.success) {
        const label = STATUS_LABELS[newStatus] || newStatus;
        setSuccessMessage(`${bookCopy.title} → ${label}`);
        setProcessedCount((c) => c + 1);

        setTimeout(() => {
          setSkuInput('');
          setBookCopy(null);
          setSuccessMessage(null);
          inputRef.current?.focus();
        }, 1500);
      } else {
        setError(result.error || 'Failed to update status');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleNewScan = () => {
    setSkuInput('');
    setBookCopy(null);
    setError(null);
    setSuccessMessage(null);
    inputRef.current?.focus();
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: spacing.xl,
        maxWidth: '800px',
        margin: '0 auto',
      }}
    >
      {/* Header */}
      <header
        style={{
          marginBottom: spacing.xl,
          paddingBottom: spacing.lg,
          borderBottom: `3px solid ${colors.secondary}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: typography.fontFamily.heading,
              fontSize: typography.fontSize['3xl'],
              fontWeight: typography.fontWeight.bold,
              color: colors.secondary,
              margin: 0,
            }}
          >
            Process Returns
          </h1>
          <p
            style={{
              margin: 0,
              marginTop: spacing.xs,
              fontSize: typography.fontSize.sm,
              color: colors.textLight,
            }}
          >
            Scan a book&apos;s SKU to check it back in.
          </p>
        </div>
        {processedCount > 0 && (
          <div
            style={{
              fontSize: typography.fontSize.xs,
              fontWeight: typography.fontWeight.semibold,
              color: '#065F46',
              backgroundColor: '#ECFDF5',
              padding: `${spacing.xs} ${spacing.sm}`,
              borderRadius: radii.full,
              border: '1px solid #A7F3D0',
            }}
          >
            {processedCount} processed
          </div>
        )}
      </header>

      {/* Success toast */}
      {successMessage && (
        <div
          style={{
            backgroundColor: '#ECFDF5',
            color: '#065F46',
            padding: `${spacing.md} ${spacing.lg}`,
            borderRadius: radii.md,
            marginBottom: spacing.lg,
            fontSize: typography.fontSize.base,
            fontWeight: typography.fontWeight.semibold,
            border: '2px solid #A7F3D0',
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
            boxShadow: shadows.sm,
          }}
        >
          <span style={{ fontSize: typography.fontSize.lg }}>✓</span>
          {successMessage}
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          style={{
            backgroundColor: '#FEF2F2',
            color: '#991B1B',
            padding: `${spacing.md} ${spacing.lg}`,
            borderRadius: radii.md,
            marginBottom: spacing.lg,
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.semibold,
            border: '2px solid #FECACA',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{error}</span>
          <button
            onClick={() => {
              setError(null);
              inputRef.current?.focus();
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#991B1B',
              cursor: 'pointer',
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.bold,
              padding: spacing.xs,
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Scan Input ────────────────────────────────────────── */}
      {!bookCopy && !successMessage && (
        <div
          style={{
            backgroundColor: colors.surface,
            border: `2px solid ${colors.border}`,
            borderRadius: radii.md,
            padding: spacing.xl,
            boxShadow: shadows.sm,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '2.5rem',
              marginBottom: spacing.md,
            }}
          >
            📦
          </div>
          <h2
            style={{
              fontSize: typography.fontSize.lg,
              fontWeight: typography.fontWeight.bold,
              color: colors.text,
              margin: 0,
              marginBottom: spacing.xs,
            }}
          >
            Scan or type a SKU
          </h2>
          <p
            style={{
              fontSize: typography.fontSize.xs,
              color: colors.textLight,
              margin: 0,
              marginBottom: spacing.lg,
            }}
          >
            Use your barcode scanner or type the Book Nest SKU manually
          </p>

          <form
            onSubmit={handleSkuScan}
            style={{
              display: 'flex',
              gap: spacing.sm,
              maxWidth: '500px',
              margin: '0 auto',
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={skuInput}
              onChange={(e) => setSkuInput(e.target.value.toUpperCase())}
              placeholder="BK-12345"
              autoFocus
              disabled={isLoading}
              style={{
                flex: 1,
                padding: `${spacing.sm} ${spacing.md}`,
                fontSize: typography.fontSize.lg,
                fontWeight: typography.fontWeight.semibold,
                color: colors.text,
                backgroundColor: colors.cream,
                border: `2px solid ${colors.border}`,
                borderRadius: radii.sm,
                fontFamily: 'monospace',
                boxSizing: 'border-box',
                textAlign: 'center',
                letterSpacing: '0.05em',
              }}
            />
            <button
              type="submit"
              disabled={isLoading || !skuInput.trim()}
              style={{
                padding: `${spacing.sm} ${spacing.lg}`,
                backgroundColor:
                  isLoading || !skuInput.trim() ? colors.border : colors.secondary,
                color:
                  isLoading || !skuInput.trim() ? colors.textLight : colors.cream,
                border: 'none',
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.bold,
                textTransform: 'uppercase',
                borderRadius: radii.sm,
                cursor: isLoading || !skuInput.trim() ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {isLoading ? 'Looking up…' : 'Lookup'}
            </button>
          </form>
        </div>
      )}

      {/* ── Book Details + Actions ─────────────────────────────── */}
      {bookCopy && (
        <div
          style={{
            backgroundColor: colors.surface,
            border: `2px solid ${colors.border}`,
            borderRadius: radii.md,
            overflow: 'hidden',
            boxShadow: shadows.sm,
          }}
        >
          {/* Book info header */}
          <div
            style={{
              padding: spacing.lg,
              display: 'grid',
              gridTemplateColumns: bookCopy.coverUrl ? '80px 1fr' : '1fr',
              gap: spacing.md,
              borderBottom: `1px solid ${colors.border}`,
            }}
          >
            {bookCopy.coverUrl && (
              <img
                src={bookCopy.coverUrl}
                alt={bookCopy.title}
                style={{
                  width: '80px',
                  height: 'auto',
                  border: `1px solid ${colors.border}`,
                  borderRadius: radii.sm,
                }}
              />
            )}
            <div>
              <h2
                style={{
                  fontSize: typography.fontSize.lg,
                  fontWeight: typography.fontWeight.bold,
                  color: colors.text,
                  margin: 0,
                  marginBottom: '2px',
                }}
              >
                {bookCopy.title}
              </h2>
              <p
                style={{
                  fontSize: typography.fontSize.sm,
                  color: colors.textLight,
                  margin: 0,
                  marginBottom: spacing.sm,
                }}
              >
                {bookCopy.author}
              </p>

              {/* Meta row */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: spacing.sm,
                  alignItems: 'center',
                }}
              >
                {/* SKU */}
                <span
                  style={{
                    fontSize: typography.fontSize.xs,
                    fontFamily: 'monospace',
                    color: colors.textLight,
                    backgroundColor: colors.cream,
                    padding: `2px ${spacing.xs}`,
                    borderRadius: radii.sm,
                  }}
                >
                  {bookCopy.sku}
                </span>

                {/* Bin */}
                <span
                  style={{
                    fontSize: typography.fontSize.xs,
                    fontWeight: typography.fontWeight.semibold,
                    color: colors.deepCocoa,
                    backgroundColor: colors.sageMist,
                    padding: `2px ${spacing.xs}`,
                    borderRadius: radii.sm,
                  }}
                >
                  {bookCopy.bin}
                </span>

                {/* Age group */}
                {bookCopy.ageGroup && (
                  <span
                    style={{
                      fontSize: typography.fontSize.xs,
                      color: colors.textLight,
                    }}
                  >
                    {AGE_LABELS[bookCopy.ageGroup] || bookCopy.ageGroup}
                  </span>
                )}

                {/* Current status */}
                <span
                  style={{
                    fontSize: typography.fontSize.xs,
                    fontWeight: typography.fontWeight.bold,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    padding: `2px ${spacing.xs}`,
                    borderRadius: radii.sm,
                    backgroundColor: (STATUS_CONFIG[bookCopy.status] || STATUS_CONFIG.retired).bg,
                    color: (STATUS_CONFIG[bookCopy.status] || STATUS_CONFIG.retired).color,
                    border: `1px solid ${(STATUS_CONFIG[bookCopy.status] || STATUS_CONFIG.retired).border}`,
                  }}
                >
                  {STATUS_LABELS[bookCopy.status] || bookCopy.status}
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ padding: spacing.lg }}>
            <div
              style={{
                fontSize: typography.fontSize.xs,
                fontWeight: typography.fontWeight.bold,
                color: colors.textLight,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: spacing.sm,
              }}
            >
              What happened to this book?
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
              {/* Return to shelf */}
              <button
                onClick={() => handleStatusUpdate('returned', 'Book returned to inventory')}
                disabled={isUpdating}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.sm,
                  width: '100%',
                  padding: `${spacing.md} ${spacing.lg}`,
                  backgroundColor: '#ECFDF5',
                  color: '#065F46',
                  border: '2px solid #A7F3D0',
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.bold,
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  borderRadius: radii.sm,
                  cursor: isUpdating ? 'not-allowed' : 'pointer',
                  opacity: isUpdating ? 0.6 : 1,
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: typography.fontSize.lg }}>✓</span>
                <div>
                  <div>Return to shelf</div>
                  <div
                    style={{
                      fontSize: typography.fontSize.xs,
                      fontWeight: typography.fontWeight.normal,
                      textTransform: 'none',
                      color: '#059669',
                      marginTop: '1px',
                    }}
                  >
                    Book is in good condition — put it back in the bin
                  </div>
                </div>
              </button>

              {/* Damaged */}
              <button
                onClick={() => handleStatusUpdate('damaged', 'Book damaged during return')}
                disabled={isUpdating}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.sm,
                  width: '100%',
                  padding: `${spacing.md} ${spacing.lg}`,
                  backgroundColor: '#FFFBEB',
                  color: '#92400E',
                  border: '2px solid #FDE68A',
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.bold,
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  borderRadius: radii.sm,
                  cursor: isUpdating ? 'not-allowed' : 'pointer',
                  opacity: isUpdating ? 0.6 : 1,
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: typography.fontSize.lg }}>⚠</span>
                <div>
                  <div>Damaged</div>
                  <div
                    style={{
                      fontSize: typography.fontSize.xs,
                      fontWeight: typography.fontWeight.normal,
                      textTransform: 'none',
                      color: '#B45309',
                      marginTop: '1px',
                    }}
                  >
                    Torn pages, water damage, heavy wear — pull from rotation
                  </div>
                </div>
              </button>

              {/* Retired */}
              <button
                onClick={() => handleStatusUpdate('retired', 'Book retired from inventory')}
                disabled={isUpdating}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.sm,
                  width: '100%',
                  padding: `${spacing.md} ${spacing.lg}`,
                  backgroundColor: '#F9FAFB',
                  color: '#6B7280',
                  border: '2px solid #D1D5DB',
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.bold,
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  borderRadius: radii.sm,
                  cursor: isUpdating ? 'not-allowed' : 'pointer',
                  opacity: isUpdating ? 0.6 : 1,
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: typography.fontSize.lg }}>✕</span>
                <div>
                  <div>Retire</div>
                  <div
                    style={{
                      fontSize: typography.fontSize.xs,
                      fontWeight: typography.fontWeight.normal,
                      textTransform: 'none',
                      color: '#9CA3AF',
                      marginTop: '1px',
                    }}
                  >
                    Remove from inventory permanently — donate or recycle
                  </div>
                </div>
              </button>
            </div>

            {/* Scan another */}
            <button
              type="button"
              onClick={handleNewScan}
              disabled={isUpdating}
              style={{
                marginTop: spacing.md,
                padding: `${spacing.sm} ${spacing.md}`,
                backgroundColor: 'transparent',
                color: colors.textLight,
                border: `1px solid ${colors.border}`,
                fontSize: typography.fontSize.xs,
                fontWeight: typography.fontWeight.semibold,
                textTransform: 'uppercase',
                borderRadius: radii.sm,
                cursor: isUpdating ? 'not-allowed' : 'pointer',
              }}
            >
              ← Scan different book
            </button>
          </div>
        </div>
      )}
    </div>
  );
}