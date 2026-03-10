import Link from 'next/link';
import { colors, typography, spacing, radii, shadows } from '@/styles/tokens';
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

function isOverdue(createdAt: string | null): boolean {
  if (!createdAt) return false;
  const shipDate = getNextShipDate(new Date(createdAt));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return shipDate < today;
}

function isToday(createdAt: string | null): boolean {
  if (!createdAt) return false;
  const shipDate = getNextShipDate(new Date(createdAt));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return shipDate.getTime() === today.getTime();
}

export default async function ShippingQueue() {
  const bundles = await getShippingQueue();

  // Sort: overdue first, then today, then by ship date ascending
  const sortedBundles = [...bundles].sort((a, b) => {
    const aOverdue = isOverdue(a.created_at);
    const bOverdue = isOverdue(b.created_at);
    const aToday = isToday(a.created_at);
    const bToday = isToday(b.created_at);

    // Overdue items first
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;

    // Then today's items
    if (aToday && !bToday) return -1;
    if (!aToday && bToday) return 1;

    // Then by created_at (earliest first)
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  const totalOrders = sortedBundles.length;
  const totalBooks = sortedBundles.reduce(
    (sum, b) => sum + (b.item_count ?? getTierBookCount(b.tier)),
    0
  );
  const overdueCount = sortedBundles.filter((b) => isOverdue(b.created_at)).length;
  const todayCount = sortedBundles.filter((b) => isToday(b.created_at)).length;

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
          {todayCount > 0 && (
            <SummaryPill label="Ships today" value={todayCount} variant="today" />
          )}
          {overdueCount > 0 && (
            <SummaryPill label="Overdue" value={overdueCount} variant="overdue" />
          )}
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
          <div style={{ fontSize: '2.5rem', marginBottom: spacing.sm }}>📦</div>
          <h2
            style={{
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.bold,
              color: colors.text,
              margin: 0,
              marginBottom: spacing.sm,
            }}
          >
            All caught up!
          </h2>
          <p
            style={{
              fontSize: typography.fontSize.sm,
              color: colors.textLight,
              margin: 0,
            }}
          >
            No bundles waiting to ship. When picking is completed for an order, it&apos;ll appear here.
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
            boxShadow: shadows.sm,
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
                {['Member', 'Email', 'Tier', 'Books', 'Ship by', 'Action'].map(
                  (header, i) => (
                    <th
                      key={header}
                      style={{
                        padding: `${spacing.sm} ${spacing.md}`,
                        textAlign: i === 5 ? 'right' : 'left',
                        fontSize: typography.fontSize.xs,
                        fontWeight: typography.fontWeight.bold,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {header}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {sortedBundles.map((bundle, index) => {
                const fullName =
                  `${bundle.first_name || ''} ${bundle.last_name || ''}`.trim();
                const pickedBooks = bundle.item_count ?? 0;
                const expectedBooks = getTierBookCount(bundle.tier);
                const isFull = pickedBooks >= expectedBooks;
                const isUnderfilled = pickedBooks > 0 && pickedBooks < expectedBooks;
                const overdue = isOverdue(bundle.created_at);
                const shipsToday = isToday(bundle.created_at);
                const tierName = getTierDisplayName(bundle.tier);
                const KNOWN_TIERS = [
                  'little-nest', 'cozy-nest', 'story-nest',
                  'growing-nest', 'family-nest',
                  'little_nest', 'cozy_nest', 'story_nest',
                  'growing_nest', 'family_nest',
                ];
                const hasTier =
                  bundle.tier != null &&
                  bundle.tier.trim() !== '' &&
                  KNOWN_TIERS.includes(
                    bundle.tier.toLowerCase().replace(/\s+/g, '-')
                  );

                const rowBg = overdue
                  ? '#FEF2F2'
                  : index % 2 === 0
                    ? colors.surface
                    : colors.cream;

                return (
                  <tr
                    key={bundle.bundle_id}
                    style={{
                      borderBottom: `1px solid ${colors.border}`,
                      backgroundColor: rowBg,
                      borderLeft: overdue
                        ? '4px solid #DC2626'
                        : shipsToday
                          ? `4px solid ${colors.goldenHoney}`
                          : '4px solid transparent',
                    }}
                  >
                    {/* Member */}
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

                    {/* Email */}
                    <td
                      style={{
                        padding: spacing.md,
                        fontSize: typography.fontSize.xs,
                        color: colors.textLight,
                        fontFamily: 'monospace',
                      }}
                    >
                      {bundle.email || '—'}
                    </td>

                    {/* Tier badge */}
                    <td style={{ padding: spacing.md }}>
                      {hasTier ? (
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
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {tierName}
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-block',
                            padding: `${spacing.xs} ${spacing.sm}`,
                            backgroundColor: '#F3F4F6',
                            color: '#9CA3AF',
                            fontSize: typography.fontSize.xs,
                            fontWeight: typography.fontWeight.bold,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            borderRadius: radii.sm,
                            border: '1px dashed #D1D5DB',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          No tier
                        </span>
                      )}
                    </td>

                    {/* Books: picked / expected */}
                    <td
                      style={{
                        padding: spacing.md,
                        fontSize: typography.fontSize.sm,
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontWeight: typography.fontWeight.semibold,
                          color: isUnderfilled
                            ? '#B45309'
                            : isFull
                              ? '#065F46'
                              : colors.text,
                        }}
                      >
                        {isUnderfilled && (
                          <span
                            style={{ fontSize: typography.fontSize.xs }}
                            title="Bundle is underfilled"
                          >
                            ⚠️
                          </span>
                        )}
                        {isFull && (
                          <span
                            style={{
                              fontSize: typography.fontSize.xs,
                              color: '#065F46',
                            }}
                            title="Bundle is complete"
                          >
                            ✓
                          </span>
                        )}
                        <span>
                          {pickedBooks}/{expectedBooks}
                        </span>
                      </span>
                    </td>

                    {/* Ship by date */}
                    <td
                      style={{
                        padding: spacing.md,
                        fontSize: typography.fontSize.sm,
                        fontWeight: overdue
                          ? typography.fontWeight.bold
                          : shipsToday
                            ? typography.fontWeight.semibold
                            : typography.fontWeight.normal,
                        color: overdue
                          ? '#DC2626'
                          : shipsToday
                            ? '#B45309'
                            : colors.text,
                      }}
                    >
                      {overdue && (
                        <span
                          style={{
                            display: 'inline-block',
                            fontSize: '0.65rem',
                            fontWeight: typography.fontWeight.bold,
                            color: '#DC2626',
                            backgroundColor: '#FEE2E2',
                            padding: `2px ${spacing.xs}`,
                            borderRadius: radii.sm,
                            marginRight: spacing.xs,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}
                        >
                          Late
                        </span>
                      )}
                      {shipsToday && !overdue && (
                        <span
                          style={{
                            display: 'inline-block',
                            fontSize: '0.65rem',
                            fontWeight: typography.fontWeight.bold,
                            color: '#92400E',
                            backgroundColor: '#FEF3C7',
                            padding: `2px ${spacing.xs}`,
                            borderRadius: radii.sm,
                            marginRight: spacing.xs,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}
                        >
                          Today
                        </span>
                      )}
                      {formatShipDate(bundle.created_at)}
                    </td>

                    {/* Action */}
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

// ── Summary pill ───────────────────────────────────────────────────

function SummaryPill({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant?: 'overdue' | 'today';
}) {
  const pillStyles: Record<string, { bg: string; border: string; valueColor: string }> = {
    default: {
      bg: colors.surface,
      border: colors.border,
      valueColor: colors.text,
    },
    overdue: {
      bg: '#FEF2F2',
      border: '#FECACA',
      valueColor: '#DC2626',
    },
    today: {
      bg: '#FFFBEB',
      border: '#FDE68A',
      valueColor: '#B45309',
    },
  };

  const style = pillStyles[variant || 'default'];

  return (
    <div
      style={{
        padding: `${spacing.xs} ${spacing.md}`,
        borderRadius: radii.full,
        border: `1px solid ${style.border}`,
        backgroundColor: style.bg,
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
          color: style.valueColor,
        }}
      >
        {value}
      </span>
    </div>
  );
}