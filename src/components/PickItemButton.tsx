'use client';

import { colors, typography, spacing, radii } from '@/styles/tokens';

interface PickItemButtonProps {
  picked: boolean;
}

export default function PickItemButton({ picked }: PickItemButtonProps) {
  return (
    <button
      style={{
        padding: `${spacing.sm} ${spacing.md}`,
        backgroundColor: picked ? colors.success : colors.primary,
        color: colors.cream,
        border: 'none',
        borderRadius: radii.md,
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.semibold,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
    >
      {picked ? '✓ Picked' : 'Mark as Picked'}
    </button>
  );
}