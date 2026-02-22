import Link from 'next/link';
import { colors, typography, spacing, radii } from '@/styles/tokens';
import ActionButton from '@/components/ActionButton';
import { getShippingQueue } from '@/lib/queries';
import { getTierDisplayName, getTierBookCount } from '@/lib/types';

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

function formatShipDate(createdAt: string | null): string {
  if (!createdAt) return '—';
  const nextShipDate = getNextShipDate(new Date(createdAt));
  return nextShipDate.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default async function ShippingQueue() {
  const bundles = await getShippingQueue();

  const totalOrders = bundles.length;
  const totalBooks = bundles.reduce(
    (sum, b) => sum + (b.item_count ?? getTierBookCount(b.tier)),
    0
  );

  const isEmpty = totalOrders === 0;

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
          marginBottom: spacing.lg,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          paddingBottom: spacing.lg,
          borderBottom: `3px solid ${colors.secondary}`,
          gap: spacing.md,
        }}
      >
        <div>
          <Link
            href="/dashboard"
            style={{
              display: 'inline-block',
              color: colors.secondary,
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
              fontFamily: typography.fontFamily.heading,
              fontSize: typography.fontSize['3xl'],
              fontWeight: typography.fontWeight.bold,
              color: colors.secondary,
              margin: 0,
            }}
          >
            Shipping queue
          </h1>
          <p
            style={{
              margin: 0,
              marginTop: spacing.xs,
              fontSize: typography.fontSize.sm,
              color: colors.textLight,
            }}
          >
            Bundles ready to be packed and shipped.
          </p>
        </div>
      </header>

      {/* Queue summary */}
      {!isEmpty && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: spacing.sm,
            marginBottom: spacing.lg,
          }}
        >
          <SummaryPill label="Orders" value={totalOrders} />
          <SummaryPill label="Books" value={totalBooks} />
        </div>
      )}

      {/* Empty State */}
      {isEmpty && (
        <div
          style={{
            textAlign: 'center',
            padding: spacing['2xl'],
            backgroundColor: colors.surface,
            border: `2px solid ${colors.border}`,
            borderRadius: radii.md,
          }}
        >
          <h2
            style={{
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.bold,
              color: colors.text,
              margin: 0,
              marginBottom: spacing.sm,
            }}
          >
            No orders waiting to ship
          </h2>
          <p
            style={{
              fontSize: typography.fontSize.sm,
              color: colors.textLight,
              margin: 0,
            }}
          >
            As soon as picking is completed for a bundle, it will appear here for packing and
            label printing.
          </p>
        </div>
      )}

      {/* Table View */}
      {!isEmpty && (
        <div
          style={{
            backgroundColor: colors.surface,
            border: `2px solid ${colors.border}`,
            borderRadius: radii.md,
            overflow: 'hidden',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: colors.secondary,
                  color: colors.cream,
                }}
              >
                <th
                  style={{
                    padding: spacing.sm,
                    textAlign: 'left',
                    fontSize: typography.fontSize.xs,
                    fontWeight: typography.fontWeight.bold,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Member
                </th>
                <th
                  style={{
                    padding: spacing.sm,
                    textAlign: 'left',
                    fontSize: typography.fontSize.xs,
                    fontWeight: typography.fontWeight.bold,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Email
                </th>
                <th
                  style={{
                    padding: spacing.sm,
                    textAlign: 'left',
                    fontSize: typography.fontSize.xs,
                    fontWeight: typography.fontWeight.bold,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
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
                  }}
                >
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {bundles.map((bundle, index) => {
                const fullName = `${bundle.first_name || ''} ${bundle.last_name || ''}`.trim();
                const ordersBooks = bundle.item_count ?? getTierBookCount(bundle.tier);

                return (
                  <tr
                    key={bundle.bundle_id}
                    style={{
                      borderBottom: `1px solid ${colors.border}`,
                      backgroundColor: index % 2 === 0 ? colors.surface : colors.cream,
                    }}
                  >
                    <td
                      style={{
                        padding: spacing.md,
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.semibold,
                        color: colors.text,
                      }}
                    >
                      {fullName || '—'}
                    </td>
                    <td
                      style={{
                        padding: spacing.md,
                        fontSize: typography.fontSize.sm,
                        color: colors.text,
                        fontFamily: 'monospace',
                      }}
                    >
                      {bundle.email || '—'}
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
                        fontSize: typography.fontSize.sm,
                        color: colors.text,
                      }}
                    >
                      {ordersBooks} {ordersBooks === 1 ? 'book' : 'books'}
                    </td>
                    <td
                      style={{
                        padding: spacing.md,
                        fontSize: typography.fontSize.sm,
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
                        href={`/ship/${bundle.bundle_id}`}
                        backgroundColor={colors.secondary}
                        hoverColor="#B87D1C"
                      >
                        Ship →
                      </ActionButton>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SummaryPill({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        padding: `${spacing.xs} ${spacing.md}`,
        borderRadius: radii.full,
        border: `1px solid ${colors.border}`,
        backgroundColor: colors.surface,
        fontSize: typography.fontSize.xs,
        display: 'inline-flex',
        alignItems: 'center',
        gap: spacing.xs,
      }}
    >
      <span
        style={{
          fontWeight: typography.fontWeight.semibold,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: colors.textLight,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontWeight: typography.fontWeight.bold,
          color: colors.text,
        }}
      >
        {value}
      </span>
    </div>
  );
}
