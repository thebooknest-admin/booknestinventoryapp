import Link from 'next/link';
import { colors, typography, spacing, radii } from '@/styles/tokens';
import ActionButton from '@/components/ActionButton';
import { getPickingQueue } from '@/lib/queries';
import { getTierDisplayName } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
            color: colors.primary,
            margin: 0,
          }}>
            Picking Queue
          </h1>
        </div>
        <div style={{
          fontSize: typography.fontSize['2xl'],
          fontWeight: typography.fontWeight.bold,
          color: colors.primary,
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
            📦
          </div>
          <h2 style={{
            fontSize: typography.fontSize.xl,
            fontWeight: typography.fontWeight.bold,
            color: colors.text,
            margin: 0,
            marginBottom: spacing.sm,
          }}>
            No Orders to Pick
          </h2>
          <p style={{
            fontSize: typography.fontSize.base,
            color: colors.textLight,
            margin: 0,
          }}>
            The picking queue is empty. Orders will appear here when members complete onboarding.
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
                    {bundle.ship_by ? new Date(bundle.ship_by).toLocaleDateString() : 'ASAP'}
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