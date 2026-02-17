'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { colors, radii, shadows, spacing, typography } from '@/styles/tokens';

export default function NavBar({ user }: { user: string | null }) {
  const pathname = usePathname();

  // Keep auth pages clean.
  if (pathname === '/login' || pathname === '/logout') return null;

  const linkStyle: React.CSSProperties = {
    textDecoration: 'none',
    color: colors.text,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    padding: `${spacing.xs} ${spacing.sm}`,
    borderRadius: radii.md,
  };

  const isActive = (href: string) => pathname === href;

  const activeStyle: React.CSSProperties = {
    background: colors.sageMist,
  };

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: colors.surface,
        borderBottom: `1px solid ${colors.border}`,
        boxShadow: shadows.sm,
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: `${spacing.sm} ${spacing.lg}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.lg,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
          <Link
            href="/"
            style={{
              textDecoration: 'none',
              color: colors.deepCocoa,
              fontFamily: typography.fontFamily.heading,
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.bold,
              lineHeight: typography.lineHeight.tight,
            }}
          >
            Book Nest Ops
          </Link>

          <nav style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
            <Link
              href="/dashboard"
              style={{ ...linkStyle, ...(isActive('/dashboard') ? activeStyle : {}) }}
            >
              Dashboard
            </Link>
            <Link
              href="/receive"
              style={{ ...linkStyle, ...(isActive('/receive') ? activeStyle : {}) }}
            >
              Receive
            </Link>
            <Link
              href="/returns"
              style={{ ...linkStyle, ...(isActive('/returns') ? activeStyle : {}) }}
            >
              Returns
            </Link>
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: spacing.sm }}>
              <span style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                Signed in as
              </span>
              <span style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold }}>
                {user}
              </span>
            </div>
          ) : null}

          <Link
            href="/logout"
            style={{
              textDecoration: 'none',
              background: colors.primary,
              color: 'white',
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.semibold,
              padding: `${spacing.xs} ${spacing.md}`,
              borderRadius: radii.md,
            }}
          >
            Logout
          </Link>
        </div>
      </div>
    </header>
  );
}
