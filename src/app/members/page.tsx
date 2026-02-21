import Link from 'next/link';
import { colors, typography, spacing, radii } from '@/styles/tokens';
import { getMembersList } from '@/lib/queries';
import { getTierDisplayName } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function MembersPage() {
  const members = await getMembersList();

  const totals = {
    all: members.length,
    waitlist: members.filter((m) => m.subscription_status === 'waitlist').length,
    active: members.filter((m) => m.subscription_status === 'active').length,
    founding: members.filter((m) => m.is_founding_flock).length,
    vip: members.filter((m) => m.is_vip).length,
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: spacing.xl,
        maxWidth: '1200px',
        margin: '0 auto',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: spacing.xl,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: typography.fontFamily.heading,
              fontSize: typography.fontSize['3xl'],
              fontWeight: typography.fontWeight.bold,
              color: colors.primary,
              margin: 0,
              marginBottom: spacing.xs,
            }}
          >
            Members
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: typography.fontSize.sm,
              color: colors.textLight,
            }}
          >
            Waitlist and active members. Founding Flock & VIP are internal flags only.
          </p>
        </div>

        <Link
          href="/dashboard"
          style={{
            fontSize: typography.fontSize.sm,
            color: colors.textLight,
            textDecoration: 'none',
          }}
        >
          ← Back to dashboard
        </Link>
      </header>

      {/* Summary pills */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: spacing.sm,
          marginBottom: spacing.lg,
        }}
      >
        <SummaryPill label="Total" value={totals.all} />
        <SummaryPill label="Active" value={totals.active} />
        <SummaryPill label="Waitlist" value={totals.waitlist} />
        <SummaryPill label="Founding Flock" value={totals.founding} />
        <SummaryPill label="VIP" value={totals.vip} />
      </div>

      {/* Members table */}
      <div
        style={{
          backgroundColor: colors.surface,
          borderRadius: radii.md,
          border: `2px solid ${colors.border}`,
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              minWidth: '900px',
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: colors.primary,
                  color: colors.cream,
                }}
              >
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Tier</th>
                <th style={thStyle}>Age Group</th>
                <th style={thStyle}>Next Ship</th>
                <th style={thStyle}>Flags</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m, index) => {
                const bg = index % 2 === 0 ? colors.surface : colors.cream;
                const status = (m.subscription_status || '').toLowerCase();
                const tierDisplay = m.tier ? getTierDisplayName(m.tier) : '—';

                return (
                  <tr key={m.id} style={{ backgroundColor: bg, borderBottom: `1px solid ${colors.border}` }}>
                    <td style={tdMainStyle}>{m.name || '—'}</td>
                    <td style={tdMonoStyle}>{m.email || '—'}</td>
                    <td style={tdStatusStyle}>
                      {status ? (
                        <span
                          style={{
                            display: 'inline-block',
                            padding: `${spacing.xs} ${spacing.sm}`,
                            borderRadius: radii.full,
                            backgroundColor:
                              status === 'active'
                                ? colors.sageMist
                                : status === 'waitlist'
                                ? colors.peachClay
                                : colors.border,
                            color: colors.deepCocoa,
                            fontSize: typography.fontSize.xs,
                            fontWeight: typography.fontWeight.semibold,
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                          }}
                        >
                          {status}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td style={tdStyle}>{tierDisplay}</td>
                    <td style={tdStyle}>{m.age_group || '—'}</td>
                    <td style={tdMonoStyle}>
                      {m.next_ship_date
                        ? new Date(m.next_ship_date).toLocaleDateString()
                        : '—'}
                    </td>
                    <td style={tdStyle}>
                      <div
                        style={{
                          display: 'flex',
                          gap: spacing.xs,
                          flexWrap: 'wrap',
                        }}
                      >
                        {m.is_founding_flock && (
                          <FlagPill label="Founding Flock" tone="gold" />
                        )}
                        {m.is_vip && <FlagPill label="VIP" tone="teal" />}
                        {!m.is_founding_flock && !m.is_vip && <span>—</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {members.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ ...tdStyle, textAlign: 'center', padding: spacing.xl }}>
                    No members yet. You can add waitlist members manually in Supabase for now.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: spacing.md,
  textAlign: 'left',
  fontSize: typography.fontSize.xs,
  fontWeight: typography.fontWeight.bold,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: spacing.md,
  fontSize: typography.fontSize.sm,
  color: colors.text,
};

const tdMainStyle: React.CSSProperties = {
  ...tdStyle,
  fontWeight: typography.fontWeight.semibold,
};

const tdMonoStyle: React.CSSProperties = {
  ...tdStyle,
  fontFamily: 'monospace',
  fontSize: typography.fontSize.xs,
};

const tdStatusStyle: React.CSSProperties = {
  ...tdStyle,
  whiteSpace: 'nowrap',
};

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

function FlagPill({ label, tone }: { label: string; tone: 'gold' | 'teal' }) {
  const bg = tone === 'gold' ? colors.mustardOchre : colors.deepTeal;

  return (
    <span
      style={{
        display: 'inline-block',
        padding: `${spacing.xs} ${spacing.sm}`,
        borderRadius: radii.full,
        backgroundColor: bg,
        color: colors.cream,
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.semibold,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}
