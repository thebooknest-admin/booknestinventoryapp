'use client';

import { useState } from 'react';
import Link from 'next/link';
import { colors, typography, spacing, radii } from '@/styles/tokens';
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

const STATUS_COLORS: Record<string, string> = {
  in_house: colors.sageMist,
  picking: colors.goldenHoney,
  picked: colors.primary,
  packed: colors.deepTeal,
  shipped: colors.secondary,
  returned: colors.sageMist,
  damaged: colors.warning,
  retired: colors.textLight,
};

export default function ReturnsPage() {
  const [skuInput, setSkuInput] = useState('');
  const [bookCopy, setBookCopy] = useState<BookCopyInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSkuScan = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!skuInput.trim()) {
      setError('Please enter a SKU');
      return;
    }

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
    } catch (err) {
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
        setSuccessMessage(`✓ Status updated to: ${STATUS_LABELS[newStatus]}`);

        // Reset form after 2 seconds
        setTimeout(() => {
          setSkuInput('');
          setBookCopy(null);
          setSuccessMessage(null);
        }, 2000);
      } else {
        setError(result.error || 'Failed to update status');
      }
    } catch (err) {
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
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: spacing.xl,
        maxWidth: '1000px',
        margin: '0 auto',
      }}
    >
      <header
        style={{
          marginBottom: spacing.xl,
          paddingBottom: spacing.lg,
          borderBottom: `3px solid ${colors.secondary}`,
        }}
      >
        <Link
          href="/dashboard"
          style={{
            display: 'inline-block',
            color: colors.secondary,
            textDecoration: 'none',
            fontSize: typography.fontSize.base,
            fontWeight: typography.fontWeight.semibold,
            marginBottom: spacing.sm,
          }}
        >
          ← DASHBOARD
        </Link>
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
      </header>

      {/* Success Message */}
      {successMessage && (
        <div
          style={{
            backgroundColor: colors.success,
            color: colors.deepCocoa,
            padding: spacing.lg,
            borderRadius: radii.md,
            marginBottom: spacing.lg,
            fontSize: typography.fontSize.xl,
            fontWeight: typography.fontWeight.bold,
            textAlign: 'center',
            border: `3px solid ${colors.sageMist}`,
          }}
        >
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div
          style={{
            backgroundColor: colors.warning,
            color: colors.deepCocoa,
            padding: spacing.lg,
            borderRadius: radii.md,
            marginBottom: spacing.lg,
            fontSize: typography.fontSize.base,
            fontWeight: typography.fontWeight.semibold,
            border: `3px solid ${colors.mustardOchre}`,
          }}
        >
          {error}
        </div>
      )}

      {/* SKU Scan Form */}
      {!bookCopy && (
        <form onSubmit={handleSkuScan}>
          <div
            style={{
              backgroundColor: colors.surface,
              border: `3px solid ${colors.border}`,
              borderRadius: radii.md,
              padding: spacing.xl,
              marginBottom: spacing.lg,
            }}
          >
            <label
              style={{
                display: 'block',
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.bold,
                color: colors.textLight,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: spacing.sm,
              }}
            >
              Scan Book Nest SKU
            </label>
            <input
              type="text"
              value={skuInput}
              onChange={(e) => setSkuInput(e.target.value.toUpperCase())}
              placeholder="Scan or enter SKU (e.g., BK-12345)"
              autoFocus
              disabled={isLoading}
              style={{
                width: '100%',
                padding: spacing.md,
                fontSize: typography.fontSize['2xl'],
                fontWeight: typography.fontWeight.bold,
                color: colors.text,
                backgroundColor: colors.cream,
                border: `3px solid ${colors.border}`,
                borderRadius: radii.md,
                fontFamily: 'monospace',
                boxSizing: 'border-box',
                marginBottom: spacing.md,
              }}
            />
            <button
              type="submit"
              disabled={isLoading || !skuInput.trim()}
              style={{
                width: '100%',
                padding: spacing.lg,
                backgroundColor:
                  isLoading || !skuInput.trim() ? colors.border : colors.secondary,
                color:
                  isLoading || !skuInput.trim() ? colors.textLight : colors.cream,
                border: `3px solid ${
                  isLoading || !skuInput.trim() ? colors.border : colors.secondary
                }`,
                fontSize: typography.fontSize.lg,
                fontWeight: typography.fontWeight.bold,
                textTransform: 'uppercase',
                borderRadius: radii.md,
                cursor: isLoading || !skuInput.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {isLoading ? 'LOOKING UP...' : 'LOOKUP SKU'}
            </button>
          </div>
        </form>
      )}

      {/* Book Details & Status Update */}
      {bookCopy && (
        <>
          {/* Book Info Display */}
          <div
            style={{
              backgroundColor: colors.surface,
              border: `3px solid ${colors.border}`,
              borderRadius: radii.md,
              padding: spacing.xl,
              marginBottom: spacing.lg,
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: bookCopy.coverUrl ? '120px 1fr' : '1fr',
                gap: spacing.lg,
                marginBottom: spacing.lg,
              }}
            >
              {bookCopy.coverUrl && (
                <img
                  src={bookCopy.coverUrl}
                  alt={bookCopy.title}
                  style={{
                    width: '120px',
                    height: 'auto',
                    border: `2px solid ${colors.border}`,
                    borderRadius: radii.sm,
                  }}
                />
              )}
              <div>
                <h2
                  style={{
                    fontSize: typography.fontSize.xl,
                    fontWeight: typography.fontWeight.bold,
                    color: colors.text,
                    margin: 0,
                    marginBottom: spacing.xs,
                  }}
                >
                  {bookCopy.title}
                </h2>
                <p
                  style={{
                    fontSize: typography.fontSize.lg,
                    color: colors.textLight,
                    margin: 0,
                    marginBottom: spacing.sm,
                  }}
                >
                  {bookCopy.author}
                </p>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto auto',
                    gap: spacing.md,
                    alignItems: 'center',
                    justifyContent: 'start',
                  }}
                >
                  <p
                    style={{
                      fontSize: typography.fontSize.sm,
                      color: colors.textLight,
                      fontFamily: 'monospace',
                      margin: 0,
                    }}
                  >
                    SKU: {bookCopy.sku}
                  </p>
                  <p
                    style={{
                      fontSize: typography.fontSize.sm,
                      color: colors.textLight,
                      margin: 0,
                    }}
                  >
                    Bin: {bookCopy.bin}
                  </p>
                </div>
              </div>
            </div>

            {/* Current Status */}
            <div
              style={{
                paddingTop: spacing.lg,
                borderTop: `2px solid ${colors.border}`,
              }}
            >
              <div
                style={{
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.bold,
                  color: colors.textLight,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: spacing.sm,
                }}
              >
                Current Status
              </div>
              <span
                style={{
                  display: 'inline-block',
                  padding: `${spacing.sm} ${spacing.md}`,
                  backgroundColor: STATUS_COLORS[bookCopy.status] || colors.border,
                  color: colors.deepCocoa,
                  fontSize: typography.fontSize.lg,
                  fontWeight: typography.fontWeight.bold,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  borderRadius: radii.sm,
                }}
              >
                {STATUS_LABELS[bookCopy.status] || bookCopy.status}
              </span>
            </div>

            <button
              type="button"
              onClick={handleNewScan}
              disabled={isUpdating}
              style={{
                marginTop: spacing.lg,
                padding: `${spacing.sm} ${spacing.md}`,
                backgroundColor: colors.surface,
                color: colors.textLight,
                border: `2px solid ${colors.border}`,
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.semibold,
                textTransform: 'uppercase',
                borderRadius: radii.sm,
                cursor: isUpdating ? 'not-allowed' : 'pointer',
              }}
            >
              Different Book
            </button>
          </div>

          {/* Action Buttons */}
          <div
            style={{
              backgroundColor: colors.surface,
              border: `3px solid ${colors.border}`,
              borderRadius: radii.md,
              padding: spacing.xl,
            }}
          >
            <h3
              style={{
                fontSize: typography.fontSize.lg,
                fontWeight: typography.fontWeight.bold,
                color: colors.text,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                margin: 0,
                marginBottom: spacing.lg,
              }}
            >
              Update Status
            </h3>

            <div
              style={{
                display: 'grid',
                gap: spacing.md,
              }}
            >
              {/* Returned (back in house) */}
              <button
                onClick={() => handleStatusUpdate('returned', 'Book returned to inventory')}
                disabled={isUpdating}
                style={{
                  width: '100%',
                  padding: spacing.lg,
                  backgroundColor: colors.sageMist,
                  color: colors.deepCocoa,
                  border: `3px solid ${colors.sageMist}`,
                  fontSize: typography.fontSize.lg,
                  fontWeight: typography.fontWeight.bold,
                  textTransform: 'uppercase',
                  borderRadius: radii.md,
                  cursor: isUpdating ? 'not-allowed' : 'pointer',
                  opacity: isUpdating ? 0.6 : 1,
                }}
              >
                ✓ RETURNED (IN HOUSE)
              </button>

              {/* Damaged */}
              <button
                onClick={() => handleStatusUpdate('damaged', 'Book damaged during return')}
                disabled={isUpdating}
                style={{
                  width: '100%',
                  padding: spacing.lg,
                  backgroundColor: colors.warning,
                  color: colors.deepCocoa,
                  border: `3px solid ${colors.warning}`,
                  fontSize: typography.fontSize.lg,
                  fontWeight: typography.fontWeight.bold,
                  textTransform: 'uppercase',
                  borderRadius: radii.md,
                  cursor: isUpdating ? 'not-allowed' : 'pointer',
                  opacity: isUpdating ? 0.6 : 1,
                }}
              >
                ⚠ DAMAGED
              </button>

              {/* Retired */}
              <button
                onClick={() => handleStatusUpdate('retired', 'Book retired from inventory')}
                disabled={isUpdating}
                style={{
                  width: '100%',
                  padding: spacing.lg,
                  backgroundColor: colors.surface,
                  color: colors.textLight,
                  border: `3px solid ${colors.border}`,
                  fontSize: typography.fontSize.lg,
                  fontWeight: typography.fontWeight.bold,
                  textTransform: 'uppercase',
                  borderRadius: radii.md,
                  cursor: isUpdating ? 'not-allowed' : 'pointer',
                  opacity: isUpdating ? 0.6 : 1,
                }}
              >
                ✕ RETIRED
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}