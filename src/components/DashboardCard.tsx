'use client';

import Link from 'next/link';
import { colors, typography, spacing, radii, shadows } from '@/styles/tokens';

interface DashboardCardProps {
  href: string;
  label: string;
  color: string;
}

export default function DashboardCard({ href, label, color }: DashboardCardProps) {
  return (
    <Link
      href={href}
      style={{
        display: 'block',
        padding: spacing.lg,
        backgroundColor: colors.surface,
        border: `2px solid ${colors.border}`,
        borderRadius: radii.lg,
        textDecoration: 'none',
        transition: 'all 0.2s ease',
        boxShadow: shadows.sm,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = color;
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = shadows.lg;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = colors.border;
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = shadows.sm;
      }}
    >
      <h3 style={{
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.semibold,
        color: color,
        marginBottom: spacing.xs,
      }}>
        {label}
      </h3>
    </Link>
  );
}