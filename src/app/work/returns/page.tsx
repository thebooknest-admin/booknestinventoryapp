import { colors, typography, spacing, radii, shadows } from '@/styles/tokens';
import { supabaseServer } from '@/lib/supabaseServer';
import ActionButton from '@/components/ActionButton';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface ReturnRow {
  id: string;
  return_number: string | null;
  member_id: string;
  original_shipment_id: string | null;
  status: string | null;
  return_type: string | null;
  return_tracking_number: string | null;
  return_label_url: string | null;
  return_label_generated_at: string | null;
  expected_return_date: string | null;
  actual_return_date: string | null;
  shipping_cost: number | null;
  notes: string | null;
  created_at: string | null;
  members: { name: string | null; email: string | null; tier: string | null } | null;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
  label_created: {
    label: 'Label Sent',
    bg: '#EFF6FF',
    color: '#1E40AF',
    border: '#BFDBFE',
  },
  in_transit: {
    label: 'In Transit',
    bg: '#FFFBEB',
    color: '#92400E',
    border: '#FDE68A',
  },
  delivered: {
    label: 'Delivered',
    bg: '#FEF3C7',
    color: '#92400E',
    border: '#FCD34D',
  },
  processing: {
    label: 'Processing',
    bg: '#F0FDF4',
    color: '#166534',
    border: '#BBF7D0',
  },
  processed: {
    label: 'Processed',
    bg: '#ECFDF5',
    color: '#065F46',
    border: '#A7F3D0',
  },
};

function getStatusConfig(status: string | null) {
  return STATUS_CONFIG[status || ''] || {
    label: status || 'Unknown',
    bg: '#F3F4F6',
    color: '#6B7280',
    border: '#D1D5DB',
  };
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function daysAgo(dateStr: string | null): string {
  if (!dateStr) return '';
  const days = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

export default async function IncomingReturnsPage() {
  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from('returns')
    .select(`
      id,
      return_number,
      member_id,
      original_shipment_id,
      status,
      return_type,
      return_tracking_number,
      return_label_url,
      return_label_generated_at,
      expected_return_date,
      actual_return_date,
      shipping_cost,
      notes,
      created_at,
      members (
        name,
        email,
        tier
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching returns:', error);
  }

  const allReturns = ((data || []) as unknown as ReturnRow[]).map((r) => {
    const member = Array.isArray(r.members) ? r.members[0] : r.members;
    return { ...r, members: member };
  });

  const pendingReturns = allReturns.filter(
    (r) => r.status !== 'processed'
  );
  const processedReturns = allReturns.filter(
    (r) => r.status === 'processed'
  );

  const isEmpty = allReturns.length === 0;

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: spacing.xl,
        maxWidth: '1200px',
        margin: '0 auto',
      }}
    >
      {/* Header */}
      <header
        style={{
          marginBottom: spacing.lg,
          paddingBottom: spacing.lg,
          borderBottom: `3px solid ${colors.secondary}`,
        }}
      >
        <h1
          style={{
            fontFamily: typography.fontFamily.heading,
            fontSize: typography.fontSize['3xl'],
            fontWeight: typography.fontWeight.bold,
            color: colors.secondary,
            margin: 0,
          }}
        >
          Incoming Returns
        </h1>
        <p
          style={{
            margin: 0,
            marginTop: spacing.xs,
            fontSize: typography.fontSize.sm,
            color: colors.textLight,
          }}
        >
          Track return labels and incoming packages.
        </p>
      </header>

      {/* Summary pills */}
      {!isEmpty && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: spacing.sm,
            marginBottom: spacing.lg,
          }}
        >
          <SummaryPill label="Pending" value={pendingReturns.length} />
          <SummaryPill label="Processed" value={processedReturns.length} variant="success" />
        </div>
      )}

      {/* Empty state */}
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
          <div style={{ fontSize: '2.5rem', marginBottom: spacing.sm }}>📬</div>
          <h2
            style={{
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.bold,
              color: colors.text,
              margin: 0,
              marginBottom: spacing.sm,
            }}
          >
            No returns yet
          </h2>
          <p
            style={{
              fontSize: typography.fontSize.sm,
              color: colors.textLight,
              margin: 0,
            }}
          >
            When you generate a return label for a member, it&apos;ll show up here so you can track it.
          </p>
        </div>
      )}

      {/* Pending returns */}
      {pendingReturns.length > 0 && (
        <div
          style={{
            backgroundColor: colors.surface,
            border: `2px solid ${colors.border}`,
            borderRadius: radii.md,
            overflow: 'hidden',
            boxShadow: shadows.sm,
            marginBottom: spacing.xl,
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: colors.secondary, color: colors.cream }}>
                {['Status', 'Member', 'Return #', 'Tracking', 'Label Created', 'Expected', 'Cost', 'Action'].map(
                  (header, i) => (
                    <th
                      key={header}
                      style={{
                        padding: `${spacing.sm} ${spacing.md}`,
                        textAlign: i === 7 ? 'right' : 'left',
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
              {pendingReturns.map((ret, index) => {
                const config = getStatusConfig(ret.status);

                return (
                  <tr
                    key={ret.id}
                    style={{
                      borderBottom: `1px solid ${colors.border}`,
                      backgroundColor: index % 2 === 0 ? colors.surface : colors.cream,
                    }}
                  >
                    {/* Status badge */}
                    <td style={{ padding: spacing.md }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: `${spacing.xs} ${spacing.sm}`,
                          backgroundColor: config.bg,
                          color: config.color,
                          border: `1px solid ${config.border}`,
                          borderRadius: radii.sm,
                          fontSize: typography.fontSize.xs,
                          fontWeight: typography.fontWeight.bold,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {config.label}
                      </span>
                    </td>

                    {/* Member */}
                    <td style={{ padding: spacing.md }}>
                      <div
                        style={{
                          fontSize: typography.fontSize.sm,
                          fontWeight: typography.fontWeight.semibold,
                          color: colors.text,
                        }}
                      >
                        {ret.members?.name || '—'}
                      </div>
                      <div
                        style={{
                          fontSize: typography.fontSize.xs,
                          color: colors.textLight,
                          fontFamily: 'monospace',
                          marginTop: '1px',
                        }}
                      >
                        {ret.members?.email || ''}
                      </div>
                    </td>

                    {/* Return # */}
                    <td
                      style={{
                        padding: spacing.md,
                        fontSize: typography.fontSize.xs,
                        fontFamily: 'monospace',
                        color: colors.textLight,
                      }}
                    >
                      {ret.return_number || '—'}
                    </td>

                    {/* Tracking */}
                    <td style={{ padding: spacing.md }}>
                      {ret.return_tracking_number ? (
                        <a
                          href={`https://tools.usps.com/go/TrackConfirmAction?tLabels=${ret.return_tracking_number}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: typography.fontSize.xs,
                            fontFamily: 'monospace',
                            color: colors.primary,
                            textDecoration: 'none',
                          }}
                        >
                          {ret.return_tracking_number.slice(-8)}… ↗
                        </a>
                      ) : (
                        <span style={{ fontSize: typography.fontSize.xs, color: colors.textLight }}>
                          —
                        </span>
                      )}
                    </td>

                    {/* Label created */}
                    <td style={{ padding: spacing.md }}>
                      <div
                        style={{
                          fontSize: typography.fontSize.xs,
                          color: colors.text,
                        }}
                      >
                        {formatDate(ret.return_label_generated_at)}
                      </div>
                      <div
                        style={{
                          fontSize: typography.fontSize.xs,
                          color: colors.textLight,
                        }}
                      >
                        {daysAgo(ret.return_label_generated_at)}
                      </div>
                    </td>

                    {/* Expected */}
                    <td
                      style={{
                        padding: spacing.md,
                        fontSize: typography.fontSize.xs,
                        color: colors.text,
                      }}
                    >
                      {formatDate(ret.expected_return_date)}
                    </td>

                    {/* Cost */}
                    <td
                      style={{
                        padding: spacing.md,
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.semibold,
                        fontFamily: 'monospace',
                        color: colors.text,
                      }}
                    >
                      {ret.shipping_cost ? `$${ret.shipping_cost.toFixed(2)}` : '—'}
                    </td>

                    {/* Action */}
                    <td style={{ padding: spacing.md, textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: spacing.xs, justifyContent: 'flex-end' }}>
                        {ret.return_label_url && (
                          <a
                            href={ret.return_label_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-block',
                              padding: `${spacing.xs} ${spacing.sm}`,
                              fontSize: typography.fontSize.xs,
                              fontWeight: typography.fontWeight.bold,
                              color: colors.primary,
                              border: `1px solid ${colors.primary}`,
                              borderRadius: radii.sm,
                              textDecoration: 'none',
                              textTransform: 'uppercase',
                            }}
                          >
                            Label
                          </a>
                        )}
                        <ActionButton
                          href="/returns"
                          backgroundColor={colors.primary}
                          hoverColor={colors.primaryHover}
                        >
                          Process
                        </ActionButton>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Processed returns (collapsed) */}
      {processedReturns.length > 0 && (
        <div>
          <h2
            style={{
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.bold,
              color: colors.textLight,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: spacing.sm,
            }}
          >
            Recently processed ({processedReturns.length})
          </h2>
          <div
            style={{
              backgroundColor: colors.surface,
              border: `2px solid ${colors.border}`,
              borderRadius: radii.md,
              overflow: 'hidden',
            }}
          >
            {processedReturns.slice(0, 10).map((ret, index) => (
              <div
                key={ret.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: `${spacing.sm} ${spacing.md}`,
                  borderBottom:
                    index < processedReturns.length - 1
                      ? `1px solid ${colors.border}`
                      : 'none',
                  fontSize: typography.fontSize.xs,
                  color: colors.textLight,
                }}
              >
                <div style={{ display: 'flex', gap: spacing.md, alignItems: 'center' }}>
                  <span style={{ color: '#065F46' }}>✓</span>
                  <span style={{ fontWeight: typography.fontWeight.semibold, color: colors.text }}>
                    {ret.members?.name || '—'}
                  </span>
                  <span style={{ fontFamily: 'monospace' }}>{ret.return_number}</span>
                </div>
                <span>{formatDate(ret.actual_return_date || ret.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Summary Pill ───────────────────────────────────────────────────

function SummaryPill({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant?: 'success';
}) {
  const isSuccess = variant === 'success';

  return (
    <div
      style={{
        padding: `${spacing.xs} ${spacing.md}`,
        borderRadius: radii.full,
        border: `1px solid ${isSuccess ? '#A7F3D0' : colors.border}`,
        backgroundColor: isSuccess ? '#ECFDF5' : colors.surface,
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
          color: isSuccess ? '#065F46' : colors.text,
        }}
      >
        {value}
      </span>
    </div>
  );
}