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

  const isEmpty = bundles.length === 0;

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: spacing.xl,
        maxWidth: '1400px',
        margin: '0 auto',
      }}
    >
      <header
        style={{
          marginBottom: spacing.xl,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          paddingBottom: spacing.lg,
          borderBottom: `3px solid ${colors.primary}`,
          gap: spacing.md,
        }}
      >
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
            ← Back to dashboard
          </Link>
          <h1
            style={{
              fontSize: typography.fontSize['3xl'],
              fontWeight: typography.fontWeight.bold,
              color: colors.text,
              margin: 0,
            }}
          >
            Picking queue
          </h1>
          <p
            style={{
              margin: 0,
              marginTop: spacing.xs,
              fontSize: typography.fontSize.sm,
              color: colors.textLight,
            }}
          >
            Bundles waiting to be picked for shipment.
          </p>
        </div>
      </header>

      {isEmpty ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
          {/* Real empty state */}
          <div
            style={{
              textAlign: 'center',
              padding: spacing['2xl'],
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              border: `2px solid ${colors.border}`,
            }}
          >
            <p
              style={{
                fontSize: typography.fontSize.lg,
                color: colors.text,
                marginBottom: spacing.sm,
              }}
            >
              No bundles to pick right now.
            </p>
            <p
              style={{
                fontSize: typography.fontSize.sm,
                color: colors.textLight,
                margin: 0,
              }}
            >
              You&apos;re caught up! New orders will appear here automatically. You can head to
              <span style={{ fontWeight: typography.fontWeight.semibold }}> Receive</span> to add
              inventory, or check
              <span style={{ fontWeight: typography.fontWeight.semibold }}> Shipping</span> for ready
              bundles.
            </p>
          </div>

          {/* Example layout helper */}
          <div
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.md,
              border: `1px dashed ${colors.border}`,
              padding: spacing.lg,
            }}
          >
            <p
              style={{
                margin: 0,
                marginBottom: spacing.sm,
                fontSize: typography.fontSize.xs,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: colors.textLight,
              }}
            >
              Example row (for reference only)
            </p>

            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                opacity: 0.7,
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      padding: spacing.sm,
                      textAlign: 'left',
                      fontSize: typography.fontSize.xs,
                      fontWeight: typography.fontWeight.bold,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: colors.textLight,
                    }}
                  >
                    Order date
                  </th>
                  <th
                    style={{
                      padding: spacing.sm,
                      textAlign: 'left',
                      fontSize: typography.fontSize.xs,
                      fontWeight: typography.fontWeight.bold,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: colors.textLight,
                    }}
                  >
                    Order #
                  </th>
                  <th
                    style={{
                      padding: spacing.sm,
                      textAlign: 'left',
                      fontSize: typography.fontSize.xs,
                      fontWeight: typography.fontWeight.bold,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: colors.textLight,
                    }}
                  >
                    Tier
                  </th>
                  <th
                    style={{
                      padding: spacing.sm,
                      textAlign: 'left',
                      fontSize: typography.fontSize.xs,
                      fontWeight: typography.fontWeight.bold,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: colors.textLight,
                    }}
                  >
                    Books
                  </th>
                  <th
                    style={{
                      padding: spacing.sm,
                      textAlign: 'left',
                      fontSize: typography.fontSize.xs,
                      fontWeight: typography.fontWeight.bold,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: colors.textLight,
                    }}
                  >
                    Ship by
                  </th>
                  <th
                    style={{
                      padding: spacing.sm,
                      textAlign: 'right',
                      fontSize: typography.fontSize.xs,
                      fontWeight: typography.fontWeight.bold,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: colors.textLight,
                    }}
                  >
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td
                    style={{
                      padding: spacing.sm,
                      fontSize: typography.fontSize.sm,
                      color: colors.textLight,
                    }}
                  >
                    Feb 10, 2026
                  </td>
                  <td
                    style={{
                      padding: spacing.sm,
                      fontSize: typography.fontSize.sm,
                      color: colors.textLight,
                    }}
                  >
                    BN-1234
                  </td>
                  <td
                    style={{
                      padding: spacing.sm,
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        padding: `${spacing.xs} ${spacing.sm}`,
                        backgroundColor: colors.sageMist,
                        color: colors.deepCocoa,
                        fontSize: typography.fontSize.xs,
                        fontWeight: typography.fontWeight.bold,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderRadius: radii.sm,
                      }}
                    >
                      Cozy Nest
                    </span>
                  </td>
                  <td
                    style={{
                      padding: spacing.sm,
                      fontSize: typography.fontSize.sm,
                      color: colors.textLight,
                    }}
                  >
                    4
                  </td>
                  <td
                    style={{
                      padding: spacing.sm,
                      fontSize: typography.fontSize.sm,
                      color: colors.textLight,
                    }}
                  >
                    Tue • Feb 12, 2026
                  </td>
                  <td
                    style={{
                      padding: spacing.sm,
                      textAlign: 'right',
                    }}
                  >
                    <button
                      type="button"
                      disabled
                      style={{
                        padding: `${spacing.xs} ${spacing.md}`,
                        borderRadius: radii.md,
                        border: `1px solid ${colors.border}`,
                        backgroundColor: colors.surface,
                        color: colors.textLight,
                        fontSize: typography.fontSize.xs,
                        fontWeight: typography.fontWeight.semibold,
                        cursor: 'not-allowed',
                      }}
                    >
                      Start picking
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: colors.surface,
            borderRadius: radii.lg,
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: `1px solid ${colors.border}`,
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
            }}
          >
            <thead
              style={{
                backgroundColor: colors.cream,
                borderBottom: `2px solid ${colors.border}`,
              }}
            >
              <tr>
                <th
                  style={{
                    padding: spacing.md,
                    textAlign: 'left',
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.bold,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Order date
                </th>
                <th
                  style={{
                    padding: spacing.md,
                    textAlign: 'left',
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.bold,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Order #
                </th>
                <th
                  style={{
                    padding: spacing.md,
                    textAlign: 'left',
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.bold,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Tier
                </th>
                <th
                  style={{
                    padding: spacing.md,
                    textAlign: 'left',
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.bold,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Books
                </th>
                <th
                  style={{
                    padding: spacing.md,
                    textAlign: 'left',
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.bold,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Ship by
                </th>
                <th
                  style={{
                    padding: spacing.md,
                    textAlign: 'right',
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.bold,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
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
                  <td
                    style={{
                      padding: spacing.md,
                      fontSize: typography.fontSize.base,
                      color: colors.text,
                    }}
                  >
                    {formatOrderDate(bundle.created_at)}
                  </td>
                  <td
                    style={{
                      padding: spacing.md,
                      fontSize: typography.fontSize.base,
                      color: colors.text,
                    }}
                  >
                    {bundle.order_number || '—'}
                  </td>
                  <td
                    style={{
                      padding: spacing.md,
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        padding: `${spacing.xs} ${spacing.sm}`,
                        backgroundColor: colors.sageMist,
                        color: colors.deepCocoa,
                        fontSize: typography.fontSize.xs,
                        fontWeight: typography.fontWeight.bold,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderRadius: radii.sm,
                      }}
                    >
                      {getTierDisplayName(bundle.tier)}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: spacing.md,
                      fontSize: typography.fontSize.base,
                      color: colors.text,
                    }}
                  >
                    {bundle.books_to_pick ?? getTierBookCount(bundle.tier)}
                  </td>
                  <td
                    style={{
                      padding: spacing.md,
                      fontSize: typography.fontSize.base,
                      color: colors.text,
                    }}
                  >
                    {formatShipDate(bundle.created_at)}
                  </td>
                  <td
                    style={{
                      padding: spacing.md,
                      textAlign: 'right',
                    }}
                  >
                    <ActionButton
                      href={`/pick/${bundle.bundle_id}`}
                      backgroundColor={colors.primary}
                      hoverColor={colors.primaryHover}
                    >
                      Start picking
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
