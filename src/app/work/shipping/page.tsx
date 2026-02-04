import Link from 'next/link';
import { colors, typography, spacing, radii } from '@/styles/tokens';
import ActionButton from '@/components/ActionButton';
import { getShippingQueue } from '@/lib/queries';
import { getTierDisplayName } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ShippingQueue() {
  const bundles = await getShippingQueue();

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
        borderBottom: `3px solid ${colors.secondary}`,
      }}>
        <div>
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
          <h1 style={{
            fontFamily: typography.fontFamily.heading,
            fontSize: typography.fontSize['3xl'],
            fontWeight: typography.fontWeight.bold,
            color: colors.secondary,
            margin: 0,
          }}>
            Shipping Queue
          </h1>
        </div>
        <div style={{
          fontSize: typography.fontSize['2xl'],
          fontWeight: typography.fontWeight.bold,
          color: colors.secondary,
        }}>
          {bundles.length} ORDERS
        </div>
      </header>

      {/* Empty State */}
      {bundles.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: spacing['3xl'],
            backgroundColor: colors.surface,
            border: `3px solid ${colors.border}`,
            borderRadius: radii.md,
          }}
        >
          <div style={{
            fontSize: typography.fontSize['3xl'],
            marginBottom: spacing.md,
          }}>
            📮
          </div>
          <h2 style={{
            fontSize: typography.fontSize.xl,
            fontWeight: typography.fontWeight.bold,
            color: colors.text,
            margin: 0,
            marginBottom: spacing.sm,
          }}>
            No Orders to Ship
          </h2>
          <p style={{
            fontSize: typography.fontSize.base,
            color: colors.textLight,
            margin: 0,
          }}>
            The shipping queue is empty. Orders will appear here after picking is complete.
          </p>
        </div>
      )}

      {/* Table View */}
      {bundles.length > 0 && (
        <div style={{
          backgroundColor: colors.surface,
          border: `2px solid ${colors.border}`,
          borderRadius: radii.md,
          overflow: 'hidden',
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
          }}>
            <thead>
              <tr style={{
                backgroundColor: colors.secondary,
                color: colors.cream,
              }}>
                <th style={{
                  padding: spacing.md,
                  textAlign: 'left',
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.bold,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Member
                </th>
                <th style={{
                  padding: spacing.md,
                  textAlign: 'left',
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.bold,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Email
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
                    fontSize: typography.fontSize.lg,
                    fontWeight: typography.fontWeight.bold,
                    color: colors.text,
                  }}>
                    {bundle.first_name} {bundle.last_name}
                  </td>
                  <td style={{
                    padding: spacing.md,
                    fontSize: typography.fontSize.base,
                    color: colors.text,
                  }}>
                    {bundle.email}
                  </td>
                  <td style={{
                    padding: spacing.md,
                    fontSize: typography.fontSize.base,
                    color: colors.text,
                  }}>
                    {bundle.item_count} books
                  </td>
                  <td style={{
                    padding: spacing.md,
                    fontSize: typography.fontSize.base,
                    color: colors.text,
                  }}>
                    {bundle.ship_by ? new Date(bundle.ship_by).toLocaleDateString() : 'ASAP'}
                  </td>
                  <td style={{
                    padding: spacing.md,
                    textAlign: 'right',
                  }}>
                    <ActionButton
                      href={`/ship/${bundle.bundle_id}`}
                      backgroundColor={colors.secondary}
                      hoverColor="#B87D1C"
                    >
                      SHIP →
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