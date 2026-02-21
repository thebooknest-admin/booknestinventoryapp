"use client";

import { useState } from 'react';
import Link from 'next/link';
import { colors, typography, spacing, radii } from '@/styles/tokens';
import { getTierDisplayName } from '@/lib/types';
import { getMembersList, type MembersListRow } from '@/lib/queries';
import { updateMember } from '@/app/actions/members';

export const dynamic = 'force-dynamic';

export default async function MembersPage() {
  const initialMembers = await getMembersList();
  return <MembersClient initialMembers={initialMembers} />;
}

function MembersClient({ initialMembers }: { initialMembers: MembersListRow[] }) {
  const [members, setMembers] = useState<MembersListRow[]>(initialMembers);
  const [editing, setEditing] = useState<MembersListRow | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totals = {
    all: members.length,
    waitlist: members.filter((m) => m.subscription_status === 'waitlist').length,
    active: members.filter((m) => m.subscription_status === 'active').length,
    founding: members.filter((m) => m.is_founding_flock).length,
    vip: members.filter((m) => m.is_vip).length,
  };

  const handleOpenEdit = (member: MembersListRow) => {
    setEditing(member);
    setError(null);
  };

  const handleCloseEdit = () => {
    setEditing(null);
    setError(null);
  };

  const handleSave = async () => {
    if (!editing) return;

    setIsSaving(true);
    setError(null);

    try {
      const result = await updateMember(editing.id, {
        subscription_status: editing.subscription_status,
        is_founding_flock: !!editing.is_founding_flock,
        is_vip: !!editing.is_vip,
      });

      if (!result.success) {
        setError(result.error || 'Failed to update member');
        setIsSaving(false);
        return;
      }

      setMembers((prev) => prev.map((m) => (m.id === editing.id ? editing : m)));
      setIsSaving(false);
      setEditing(null);
    } catch (e) {
      setError('Unexpected error while saving');
      setIsSaving(false);
    }
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
                <th style={thStyle}>Actions</th>
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
                    <td style={tdStyle}>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(m)}
                        style={{
                          padding: `${spacing.xs} ${spacing.md}`,
                          fontSize: typography.fontSize.xs,
                          borderRadius: radii.sm,
                          border: `1px solid ${colors.border}`,
                          backgroundColor: colors.surface,
                          cursor: 'pointer',
                          textTransform: 'uppercase',
                          fontWeight: typography.fontWeight.semibold,
                        }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}

              {members.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ ...tdStyle, textAlign: 'center', padding: spacing.xl }}>
                    No members yet. You can add waitlist members manually in Supabase for now.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editing && (
        <>
          <div
            onClick={handleCloseEdit}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 1000,
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              border: `2px solid ${colors.primary}`,
              padding: spacing.xl,
              maxWidth: '480px',
              width: '90%',
              zIndex: 1001,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: spacing.md,
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    marginBottom: spacing.xs,
                    fontSize: typography.fontSize['xl'],
                    fontWeight: typography.fontWeight.bold,
                    color: colors.primary,
                  }}
                >
                  Edit Member
                </h2>
                <p
                  style={{
                    margin: 0,
                    fontSize: typography.fontSize.xs,
                    color: colors.textLight,
                  }}
                >
                  Update waitlist/active status and internal flags.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseEdit}
                disabled={isSaving}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  fontSize: typography.fontSize.lg,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            {error && (
              <div
                style={{
                  marginBottom: spacing.sm,
                  padding: spacing.sm,
                  borderRadius: radii.sm,
                  backgroundColor: colors.warning,
                  color: colors.deepCocoa,
                  fontSize: typography.fontSize.xs,
                }}
              >
                {error}
              </div>
            )}

            {/* Name / email (read-only for now) */}
            <div style={{ marginBottom: spacing.md }}>
              <label
                style={{
                  display: 'block',
                  fontSize: typography.fontSize.xs,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: colors.textLight,
                  marginBottom: spacing.xs,
                }}
              >
                Name
              </label>
              <div style={{ ...tdMainStyle, padding: 0 }}>{editing.name || '—'}</div>
            </div>

            <div style={{ marginBottom: spacing.md }}>
              <label
                style={{
                  display: 'block',
                  fontSize: typography.fontSize.xs,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: colors.textLight,
                  marginBottom: spacing.xs,
                }}
              >
                Email
              </label>
              <div style={{ ...tdMonoStyle, padding: 0 }}>{editing.email || '—'}</div>
            </div>

            {/* Status */}
            <div style={{ marginBottom: spacing.md }}>
              <label
                style={{
                  display: 'block',
                  fontSize: typography.fontSize.xs,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: colors.textLight,
                  marginBottom: spacing.xs,
                }}
              >
                Status
              </label>
              <select
                value={editing.subscription_status || ''}
                onChange={(e) =>
                  setEditing({ ...editing, subscription_status: e.target.value || null })
                }
                style={{
                  width: '100%',
                  padding: spacing.sm,
                  borderRadius: radii.sm,
                  border: `1px solid ${colors.border}`,
                  fontSize: typography.fontSize.sm,
                  backgroundColor: colors.cream,
                }}
              >
                <option value="">(none)</option>
                <option value="waitlist">Waitlist</option>
                <option value="active">Active</option>
              </select>
            </div>

            {/* Flags */}
            <div style={{ marginBottom: spacing.lg }}>
              <label
                style={{
                  display: 'block',
                  fontSize: typography.fontSize.xs,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: colors.textLight,
                  marginBottom: spacing.xs,
                }}
              >
                Flags
              </label>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: spacing.xs,
                  fontSize: typography.fontSize.sm,
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                  <input
                    type="checkbox"
                    checked={!!editing.is_founding_flock}
                    onChange={(e) =>
                      setEditing({ ...editing, is_founding_flock: e.target.checked })
                    }
                  />
                  Founding Flock
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                  <input
                    type="checkbox"
                    checked={!!editing.is_vip}
                    onChange={(e) => setEditing({ ...editing, is_vip: e.target.checked })}
                  />
                  VIP
                </label>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: spacing.sm,
              }}
            >
              <button
                type="button"
                onClick={handleCloseEdit}
                disabled={isSaving}
                style={{
                  padding: `${spacing.sm} ${spacing.md}`,
                  borderRadius: radii.sm,
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.surface,
                  fontSize: typography.fontSize.sm,
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                style={{
                  padding: `${spacing.sm} ${spacing.md}`,
                  borderRadius: radii.sm,
                  border: `1px solid ${colors.primary}`,
                  backgroundColor: isSaving ? colors.border : colors.primary,
                  color: colors.cream,
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.semibold,
                  textTransform: 'uppercase',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                }}
              >
                {isSaving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </>
      )}
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
