'use client';

import { colors, typography, spacing, radii, shadows } from '@/styles/tokens';

export default function CompletePickingButton() {
  return (
    <button
      style={{
        padding: `${spacing.md} ${spacing.xl}`,
        backgroundColor: colors.primary,
        color: colors.cream,
        border: 'none',
        borderRadius: radii.md,
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.semibold,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: shadows.md,
      }}
    >
      Complete Picking
    </button>
  );
}