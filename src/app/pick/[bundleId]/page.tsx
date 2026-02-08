'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { colors, typography, spacing, radii } from '@/styles/tokens';

type BookToPick = {
  book_id: string;
  book_sku: string; // This should come from books table
  title: string;
  author: string;
  bin: string;
  instruction: string;
};

type BundleData = {
  bundle_id: string;
  order_number: string; // This should be a readable order number
  member_name: string;
  tier: string;
  books_to_pick: number;
  created_at: string;
  books: BookToPick[];
};

export default function PickingPage() {
  const params = useParams();
  const router = useRouter();
  const [bundle, setBundle] = useState<BundleData | null>(null);
  const [scannedBooks, setScannedBooks] = useState<Set<string>>(new Set());
  const [currentScan, setCurrentScan] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchBundle() {
      try {
        const res = await fetch(`/api/bundles/${params.id}`);
        if (!res.ok) throw new Error('Failed to fetch bundle');
        const data = await res.json();
        setBundle(data);
      } catch (err) {
        console.error('Error fetching bundle:', err);
        setError('Failed to load picking data');
      }
    }

    if (params.id) {
      fetchBundle();
    }
  }, [params.id]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [scannedBooks]);

  const handleScan = () => {
    if (!currentScan.trim() || !bundle) {
      setError('Please scan a valid barcode');
      return;
    }

    const scannedSku = currentScan.trim().toUpperCase();
    
    // Find book by SKU (not by book_id)
    const book = bundle.books.find(b => b.book_sku === scannedSku);

    if (!book) {
      setError(`Book with SKU ${scannedSku} not found in this bundle`);
      setCurrentScan('');
      return;
    }

    if (scannedBooks.has(book.book_id)) {
      setError(`Book "${book.title}" already scanned`);
      setCurrentScan('');
      return;
    }

    setScannedBooks(new Set([...scannedBooks, book.book_id]));
    setCurrentScan('');
    setError('');
  };

  const handleClearScans = () => {
    setScannedBooks(new Set());
    setError('');
  };

  const handleCompletePicking = async () => {
    if (scannedBooks.size !== bundle?.books.length) {
      setError('Please scan all books before completing');
      return;
    }

    try {
      const res = await fetch(`/api/bundles/${params.id}/complete`, {
        method: 'POST',
      });

      if (!res.ok) throw new Error('Failed to complete picking');

      router.push('/app/work/picking');
    } catch (err) {
      console.error('Error completing picking:', err);
      setError('Failed to complete picking');
    }
  };

  const handlePrintPickSlip = () => {
    window.print();
  };

  if (!bundle) {
    return (
      <div style={{ padding: spacing.xl }}>
        <p>Loading...</p>
      </div>
    );
  }

  const nextShipDate = getNextShipDate(new Date(bundle.created_at));
  const formattedShipDate = nextShipDate.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const formattedOrderDate = new Date(bundle.created_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div style={{
      minHeight: '100vh',
      padding: spacing.xl,
      maxWidth: '1400px',
      margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{
        marginBottom: spacing.lg,
        paddingBottom: spacing.md,
        borderBottom: `2px solid ${colors.border}`,
      }}>
        <Link
          href="/app/work/picking"
          style={{
            display: 'inline-block',
            color: colors.primary,
            textDecoration: 'none',
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.semibold,
            marginBottom: spacing.xs,
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
            fontSize: typography.fontSize['2xl'],
            fontWeight: typography.fontWeight.bold,
            color: colors.text,
            margin: 0,
          }}>
            PICK LIST #{bundle.order_number}
          </h1>
          <div style={{
            fontSize: typography.fontSize['2xl'],
            fontWeight: typography.fontWeight.bold,
            color: colors.primary,
          }}>
            {scannedBooks.size} / {bundle.books.length}
          </div>
        </div>
      </div>

      {/* Order Info */}
      <div style={{
        backgroundColor: colors.surface,
        padding: spacing.lg,
        borderRadius: radii.md,
        marginBottom: spacing.lg,
        border: `1px solid ${colors.border}`,
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: spacing.lg,
        }}>
          <div>
            <div style={{
              fontSize: typography.fontSize.xs,
              fontWeight: typography.fontWeight.bold,
              color: colors.textSecondary,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: spacing.xs,
            }}>
              ORDER #
            </div>
            <div style={{
              fontSize: typography.fontSize.base,
              color: colors.text,
            }}>
              {bundle.order_number}
            </div>
          </div>
          <div>
            <div style={{
              fontSize: typography.fontSize.xs,
              fontWeight: typography.fontWeight.bold,
              color: colors.textSecondary,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: spacing.xs,
            }}>
              MEMBER
            </div>
            <div style={{
              fontSize: typography.fontSize.base,
              color: colors.text,
            }}>
              {bundle.member_name}
            </div>
          </div>
          <div>
            <div style={{
              fontSize: typography.fontSize.xs,
              fontWeight: typography.fontWeight.bold,
              color: colors.textSecondary,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: spacing.xs,
            }}>
              TIER / QTY
            </div>
            <div style={{
              fontSize: typography.fontSize.base,
              color: colors.text,
            }}>
              {bundle.tier}
            </div>
          </div>
          <div>
            <div style={{
              fontSize: typography.fontSize.xs,
              fontWeight: typography.fontWeight.bold,
              color: colors.textSecondary,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: spacing.xs,
            }}>
              ORDER DATE
            </div>
            <div style={{
              fontSize: typography.fontSize.base,
              color: colors.text,
            }}>
              {formattedOrderDate}
            </div>
          </div>
          <div>
            <div style={{
              fontSize: typography.fontSize.xs,
              fontWeight: typography.fontWeight.bold,
              color: colors.textSecondary,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: spacing.xs,
            }}>
              SHIP BY (TUE/FRI)
            </div>
            <div style={{
              fontSize: typography.fontSize.base,
              color: colors.text,
            }}>
              {formattedShipDate}
            </div>
          </div>
        </div>
      </div>

      {/* Scan Section */}
      <div style={{
        backgroundColor: colors.cream,
        padding: spacing.lg,
        borderRadius: radii.md,
        marginBottom: spacing.lg,
        border: `1px solid ${colors.border}`,
      }}>
        <div style={{
          fontSize: typography.fontSize.sm,
          fontWeight: typography.fontWeight.bold,
          color: colors.textSecondary,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: spacing.md,
        }}>
          SCAN BOOK BARCODE
        </div>
        <div style={{
          display: 'flex',
          gap: spacing.md,
          alignItems: 'flex-start',
        }}>
          <input
            ref={inputRef}
            type="text"
            value={currentScan}
            onChange={(e) => setCurrentScan(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleScan();
              }
            }}
            placeholder="Scan Book Nest SKU (e.g., BN-FLED-0214)"
            style={{
              flex: 1,
              padding: spacing.md,
              fontSize: typography.fontSize.base,
              border: `2px solid ${colors.border}`,
              borderRadius: radii.md,
              outline: 'none',
            }}
          />
          <button
            onClick={handleScan}
            style={{
              padding: `${spacing.md} ${spacing.xl}`,
              backgroundColor: colors.primary,
              color: 'white',
              border: 'none',
              borderRadius: radii.md,
              fontSize: typography.fontSize.base,
              fontWeight: typography.fontWeight.bold,
              cursor: 'pointer',
            }}
          >
            SCAN
          </button>
          <button
            onClick={handleClearScans}
            style={{
              padding: `${spacing.md} ${spacing.xl}`,
              backgroundColor: colors.surface,
              color: colors.text,
              border: `2px solid ${colors.border}`,
              borderRadius: radii.md,
              fontSize: typography.fontSize.base,
              fontWeight: typography.fontWeight.bold,
              cursor: 'pointer',
            }}
          >
            CLEAR SCANS
          </button>
        </div>
        <div style={{
          marginTop: spacing.sm,
          fontSize: typography.fontSize.sm,
          color: colors.textSecondary,
        }}>
          Tip: scan the Book Nest SKU barcode (e.g., BN-FLED-0214) to mark it picked.
        </div>
        {error && (
          <div style={{
            marginTop: spacing.md,
            padding: spacing.md,
            backgroundColor: '#fee',
            color: '#c00',
            borderRadius: radii.sm,
            fontSize: typography.fontSize.sm,
          }}>
            {error}
          </div>
        )}
      </div>

      {/* Books Table */}
      <div style={{
        backgroundColor: colors.surface,
        borderRadius: radii.lg,
        overflow: 'hidden',
        marginBottom: spacing.lg,
        border: `1px solid ${colors.border}`,
      }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
        }}>
          <thead style={{
            backgroundColor: colors.primary,
            color: 'white',
          }}>
            <tr>
              <th style={{ padding: spacing.md, textAlign: 'left', fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, textTransform: 'uppercase' }}>
                BIN
              </th>
              <th style={{ padding: spacing.md, textAlign: 'left', fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, textTransform: 'uppercase' }}>
                BOOK NEST SKU
              </th>
              <th style={{ padding: spacing.md, textAlign: 'left', fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, textTransform: 'uppercase' }}>
                TITLE
              </th>
              <th style={{ padding: spacing.md, textAlign: 'left', fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, textTransform: 'uppercase' }}>
                INSTRUCTION
              </th>
              <th style={{ padding: spacing.md, textAlign: 'right', fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, textTransform: 'uppercase' }}>
                STATUS
              </th>
            </tr>
          </thead>
          <tbody>
            {bundle.books.map((book, index) => {
              const isScanned = scannedBooks.has(book.book_id);
              return (
                <tr
                  key={book.book_id}
                  style={{
                    borderBottom: `1px solid ${colors.border}`,
                    backgroundColor: index % 2 === 0 ? colors.surface : colors.cream,
                    opacity: isScanned ? 0.6 : 1,
                  }}
                >
                  <td style={{ padding: spacing.md, fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.bold }}>
                    {book.bin}
                  </td>
                  <td style={{ padding: spacing.md, fontSize: typography.fontSize.sm, color: colors.textSecondary, fontFamily: 'monospace' }}>
                    {book.book_sku}
                  </td>
                  <td style={{ padding: spacing.md }}>
                    <div style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: colors.text }}>
                      {book.title}
                    </div>
                    <div style={{ fontSize: typography.fontSize.sm, color: colors.textSecondary }}>
                      by {book.author}
                    </div>
                  </td>
                  <td style={{ padding: spacing.md, fontSize: typography.fontSize.sm, color: colors.textSecondary }}>
                    📍 {book.instruction}
                  </td>
                  <td style={{ padding: spacing.md, textAlign: 'right' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: `${spacing.xs} ${spacing.md}`,
                      backgroundColor: isScanned ? colors.sageMist : colors.cream,
                      color: isScanned ? colors.deepCocoa : colors.textSecondary,
                      fontSize: typography.fontSize.xs,
                      fontWeight: typography.fontWeight.bold,
                      textTransform: 'uppercase',
                      borderRadius: radii.sm,
                      border: `1px solid ${colors.border}`,
                    }}>
                      {isScanned ? 'PICKED' : 'PENDING'}
                    </span>
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
        justifyContent: 'space-between',
        gap: spacing.md,
      }}>
        <button
          onClick={handlePrintPickSlip}
          style={{
            padding: `${spacing.md} ${spacing.xl}`,
            backgroundColor: colors.surface,
            color: colors.primary,
            border: `2px solid ${colors.primary}`,
            borderRadius: radii.md,
            fontSize: typography.fontSize.base,
            fontWeight: typography.fontWeight.bold,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
          }}
        >
          🖨️ PRINT PICK SLIP
        </button>
        <button
          onClick={handleCompletePicking}
          disabled={scannedBooks.size !== bundle.books.length}
          style={{
            padding: `${spacing.md} ${spacing.xl}`,
            backgroundColor: scannedBooks.size === bundle.books.length ? colors.primary : colors.border,
            color: 'white',
            border: 'none',
            borderRadius: radii.md,
            fontSize: typography.fontSize.base,
            fontWeight: typography.fontWeight.bold,
            cursor: scannedBooks.size === bundle.books.length ? 'pointer' : 'not-allowed',
            opacity: scannedBooks.size === bundle.books.length ? 1 : 0.5,
          }}
        >
          COMPLETE PICKING →
        </button>
      </div>
    </div>
  );
}

function getNextShipDate(orderDate: Date): Date {
  const SHIPPING_DAYS = [2, 5]; // Tuesday (2) and Friday (5)
  const shipDate = new Date(orderDate);
  shipDate.setHours(0, 0, 0, 0);

  while (!SHIPPING_DAYS.includes(shipDate.getDay())) {
    shipDate.setDate(shipDate.getDate() + 1);
  }

  return shipDate;
}