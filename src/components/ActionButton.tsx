'use client';

import Link from 'next/link';
import { colors, typography, spacing, radii } from '@/styles/tokens';

interface ActionButtonProps {
  href: string;
  backgroundColor: string;
  hoverColor: string;
  children: React.ReactNode;
}

export default function ActionButton({ 
  href, 
  backgroundColor, 
  hoverColor, 
  children 
}: ActionButtonProps) {
  return (
    <Link
      href={href}
      style={{
        display: 'inline-block',
        padding: `${spacing.sm} ${spacing.lg}`,
        backgroundColor,
        color: colors.cream,
        textDecoration: 'none',
        borderRadius: radii.md,
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.semibold,
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = hoverColor;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = backgroundColor;
      }}
    >
      {children}
    </Link>
  );
}