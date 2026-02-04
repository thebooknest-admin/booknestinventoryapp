'use client';

import Link from 'next/link';
import { useState } from 'react';
import { colors, typography, spacing, radii } from '@/styles/tokens';

export default function PickBundle({ params }: { params: { bundleId: string } }) {
  // Mock data - replace with Supabase query
  const bundle = {
    id: params.bundleId,
    name: `ORDER-${params.bundleId}`,
    items: [
      { id: '1', sku: 'BK-12345', title: 'The Great Gatsby', location: 'A-12-3', picked: false },
      { id: '2', sku: 'BK-12346', title: '1984', location: 'B-05-2', picked: false },
      { id: '3', sku: 'BK-12347', title: 'To Kill a Mockingbird', location: 'A-15-1', picked: false },
      { id: '4', sku: 'BK-12348', title: 'Pride and Prejudice', location: 'C-08-4', picked: false },
      { id: '5', sku: 'BK-12349', title: 'The Catcher in the Rye', location: 'A-20-2', picked: false },
    ],
  };

  const [pickedItems, setPickedItems] = useState<Set<string>>(new Set());

  const togglePicked = (itemId: string) => {
    setPickedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const pickedCount = pickedItems.size;
  const totalCount = bundle.items.length;
  const allPicked = pickedCount === totalCount;

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
            {bundle.name}
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

      {/* Pick List Table */}
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
                SKU
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
                width: '15%',
              }}>
                Location
              </th>
              <th style={{
                padding: spacing.md,
                textAlign: 'center',
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.bold,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                width: '15%',
              }}>
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {bundle.items.map((item, index) => {
              const isPicked = pickedItems.has(item.id);
              return (
                <tr
                  key={item.id}
                  onClick={() => togglePicked(item.id)}
                  style={{
                    borderBottom: `2px solid ${colors.border}`,
                    backgroundColor: isPicked
                      ? colors.sageMist
                      : index % 2 === 0
                      ? colors.surface
                      : colors.cream,
                    cursor: 'pointer',
                    opacity: isPicked ? 0.7 : 1,
                  }}
                >
                  <td style={{
                    padding: spacing.md,
                    fontSize: typography.fontSize.lg,
                    fontWeight: typography.fontWeight.bold,
                    color: colors.text,
                    fontFamily: 'monospace',
                  }}>
                    {item.sku}
                  </td>
                  <td style={{
                    padding: spacing.md,
                    fontSize: typography.fontSize.base,
                    color: colors.text,
                  }}>
                    {item.title}
                  </td>
                  <td style={{
                    padding: spacing.md,
                    fontSize: typography.fontSize.xl,
                    fontWeight: typography.fontWeight.bold,
                    color: colors.primary,
                    fontFamily: 'monospace',
                  }}>
                    {item.location}
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
                        ✓ PICKED
                      </span>
                    ) : (
                      <span style={{
                        display: 'inline-block',
                        padding: `${spacing.xs} ${spacing.md}`,
                        backgroundColor: colors.surface,
                        color: colors.textLight,
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.bold,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        border: `2px solid ${colors.border}`,
                        borderRadius: radii.sm,
                      }}>
                        PENDING
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
          href={`/pick-slip/${bundle.id}`}
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
          disabled={!allPicked}
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
          COMPLETE PICKING →
        </button>
      </div>
    </div>
  );
}