import Link from 'next/link';
import { colors, typography, spacing, radii } from '@/styles/tokens';
import ActionButton from '@/components/ActionButton';
import { getPickingQueue } from '@/lib/queries';
import { getTierBookCount, getTierDisplayName } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SHIPPING_DAYS = [2, 5]; // Tuesday (2) and Friday (5)

function getNextShipDate(orderDate: Date): Date {
  const shipDate = new Date(orderDate);
  shipDate.setHours(0, 0, 0, 0);

  while (!SHIPPING_DAYS.includes(shipDate.getDay())) {
    shipDate.setDate(shipDate.getDate() + 1);
  }

  return shipDate;
}

function formatShipDate(createdAt: string): string {
  if (!createdAt) {
    return 'TBD';
  }

  const nextShipDate = getNextShipDate(new Date(createdAt));
  return nextShipDate.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatOrderDate(createdAt: string): string {
  if (!createdAt) {
    return '—';
  }

  return new Date(createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default async function PickingQueue() {
  const bundles = await getPickingQueue();

  return (
    <div style={{
      minHeight: '100vh',
      padding: spacing.xl,
      maxWidth: '1400px',
      margin: '0 auto',
    }}>
      <header style={{
        marginBottom: spacing.xl,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: spacing.lg,
        borderBottom: `3px solid ${colors.primary}`,
      }}>
        <div>
          <Link
            href="/dashboard"
            style={{
              display: 'inline-block',
              color: colors.primary,
              textDecoration: 'none',
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.semibold,
              marginBottom: spacing.xs,
            }}
          >
            ← Back to Dashboard
          </Link>
          <h1 style={{
            fontSize: typography.fontSize['3xl'],
            fontWeight: typography.fontWeight.bold,
            color: colors.text,
            margin: 0,
          }}>
            Picking Queue
          </h1>
        </div>
      </header>

      {bundles.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: spacing['2xl'],
          backgroundColor: colors.surface,
          borderRadius: radii.lg,
        }}>
          <p style={{
            fontSize: typography.fontSize.xl,
            color: colors.text,
          }}>
            No bundles to pick right now!
          </p>
        </div>
      ) : (
        <div style={{
          backgroundColor: colors.surface,
          borderRadius: radii.lg,
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
          }}>
            <thead style={{
              backgroundColor: colors.cream,
              borderBottom: `2px solid ${colors.border}`,
            }}>
              <tr>
                <th style={{
                  padding: spacing.md,
                  textAlign: 'left',
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.bold,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Order Date
                </th>
                <th style={{
                  padding: spacing.md,
                  textAlign: 'left',
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.bold,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Order #
                </th>
                <th style={{
                  padding: spacing.md,
                  textAlign: 'left',
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.bold,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Tier
                </th>
                <th style={{
                  padding: spacing.md,
                  textAlign: 'left',
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.bold,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Books
                </th>
                <th style={{
                  padding: spacing.md,
                  textAlign: 'left',
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.bold,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Ship By
                </th>
                <th style={{
                  padding: spacing.md,
                  textAlign: 'right',
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.bold,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {bundles.map((bundle, index) => (
                <tr
                  key={bundle.bundle_id}
                  style={{
                    borderBottom: `2px solid ${colors.border}`,
                    backgroundColor: index % 2 === 0 ? colors.surface : colors.cream,
                  }}
                >
                  <td style={{
                    padding: spacing.md,
                    fontSize: typography.fontSize.base,
                    color: colors.text,
                  }}>
                    {formatOrderDate(bundle.created_at)}
                  </td>
                  <td style={{
                    padding: spacing.md,
                    fontSize: typography.fontSize.base,
                    color: colors.text,
                  }}>
                    {bundle.order_number || '—'}
                  </td>
                  <td style={{
                    padding: spacing.md,
                  }}>
                    <span style={{
                      display: 'inline-block',
                      padding: `${spacing.xs} ${spacing.sm}`,
                      backgroundColor: colors.sageMist,
                      color: colors.deepCocoa,
                      fontSize: typography.fontSize.xs,
                      fontWeight: typography.fontWeight.bold,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      borderRadius: radii.sm,
                    }}>
                      {getTierDisplayName(bundle.tier)}
                    </span>
                  </td>
                  <td style={{
                    padding: spacing.md,
                    fontSize: typography.fontSize.base,
                    color: colors.text,
                  }}>
                    {bundle.books_to_pick ?? getTierBookCount(bundle.tier)}
                  </td>
                  <td style={{
                    padding: spacing.md,
                    fontSize: typography.fontSize.base,
                    color: colors.text,
                  }}>
                    {formatShipDate(bundle.created_at)}
                  </td>
                  <td style={{
                    padding: spacing.md,
                    textAlign: 'right',
                  }}>
                    <ActionButton
                      href={`/pick/${bundle.bundle_id}`}
                      backgroundColor={colors.primary}
                      hoverColor={colors.primaryHover}
                    >
                      PICK →
                    </ActionButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}