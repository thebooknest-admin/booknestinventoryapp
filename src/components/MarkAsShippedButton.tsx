'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { colors, typography, spacing, radii } from '@/styles/tokens';

interface MarkAsShippedButtonProps {
  bundleId: string;
}

export default function MarkAsShippedButton({ bundleId }: MarkAsShippedButtonProps) {
  const router = useRouter();
  const [trackingNumber, setTrackingNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleMarkAsShipped = async () => {
    if (!trackingNumber.trim()) {
      alert('Please enter a tracking number');
      return;
    }

    if (!confirm(`Mark this bundle as shipped with tracking number: ${trackingNumber}?`)) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/bundles/mark-shipped', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bundleId,
          trackingNumber,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark bundle as shipped');
      }

      alert('✅ Bundle marked as shipped!');
      router.push('/work/shipping');
      router.refresh();
    } catch (error) {
      console.error('Error marking as shipped:', error);
      alert('❌ Failed to mark bundle as shipped. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: spacing.md }}>
        <label
          htmlFor="tracking-number"
          style={{
            display: 'block',
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.semibold,
            color: colors.text,
            marginBottom: spacing.xs,
          }}
        >
          Tracking Number
        </label>
        <input
          id="tracking-number"
          type="text"
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
          placeholder="Enter tracking number (e.g., 1Z999AA10123456784)"
          disabled={isSubmitting}
          style={{
            width: '100%',
            padding: spacing.md,
            fontSize: typography.fontSize.base,
            border: `2px solid ${colors.border}`,
            borderRadius: radii.sm,
            backgroundColor: isSubmitting ? colors.border : 'white',
          }}
        />
      </div>

      <button
        onClick={handleMarkAsShipped}
        disabled={isSubmitting || !trackingNumber.trim()}
        style={{
          padding: `${spacing.md} ${spacing.xl}`,
          fontSize: typography.fontSize.lg,
          fontWeight: typography.fontWeight.bold,
          color: colors.cream,
          backgroundColor: isSubmitting || !trackingNumber.trim() ? colors.textLight : colors.secondary,
          border: 'none',
          borderRadius: radii.md,
          cursor: isSubmitting || !trackingNumber.trim() ? 'not-allowed' : 'pointer',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          transition: 'all 0.2s ease',
        }}
      >
        {isSubmitting ? '⏳ MARKING AS SHIPPED...' : '✓ MARK AS SHIPPED'}
      </button>
    </div>
  );
}