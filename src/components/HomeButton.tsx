'use client';

import Link from 'next/link';
import { colors, typography, spacing, radii, shadows } from '@/styles/tokens';

export default function HomeButton() {
  return (
    <Link
      href="/dashboard"
      style={{
        display: 'inline-block',
        padding: `${spacing.md} ${spacing.xl}`,
        backgroundColor: colors.primary,
        color: colors.cream,
        textDecoration: 'none',
        borderRadius: radii.md,
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.semibold,
        boxShadow: shadows.md,
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = colors.primaryHover;
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = shadows.lg;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = colors.primary;
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = shadows.md;
      }}
    >
      Go to Dashboard
    </Link>
  );
}