'use client';

import { colors, typography, spacing, radii } from '@/styles/tokens';

export default function PrintButton() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <button
      onClick={handlePrint}
      style={{
        padding: `${spacing.sm} ${spacing.lg}`,
        backgroundColor: colors.primary,
        color: colors.cream,
        border: 'none',
        borderRadius: radii.md,
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.semibold,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = colors.primaryHover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = colors.primary;
      }}
    >
      🖨️ Print
    </button>
  );
}