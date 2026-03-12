'use client';

import { useState } from 'react';
import { colors, typography, spacing, radii } from '@/styles/tokens';

interface GenerateReturnLabelProps {
  memberId: string;
  shipmentId: string;
  memberName: string;
}

export default function GenerateReturnLabel({
  memberId,
  shipmentId,
  memberName,
}: GenerateReturnLabelProps) {
  const [step, setStep] = useState<'idle' | 'confirming' | 'generating' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    labelUrl: string | null;
    trackingNumber: string | null;
    cost: string | null;
    returnNumber: string | null;
  } | null>(null);

  async function handleGenerate() {
    setStep('generating');
    setError(null);

    try {
      const res = await fetch('/api/shipping/return-label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, shipmentId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to generate return label.');
        setStep('idle');
        return;
      }

      setResult({
        labelUrl: data.labelUrl,
        trackingNumber: data.trackingNumber,
        cost: data.cost,
        returnNumber: data.returnNumber,
      });
      setStep('done');
    } catch {
      setError('Network error generating return label.');
      setStep('idle');
    }
  }

  if (step === 'idle') {
    return (
      <div>
        <button
          onClick={() => setStep('confirming')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: spacing.xs,
            padding: `${spacing.sm} ${spacing.md}`,
            backgroundColor: colors.surface,
            color: colors.secondary,
            border: `2px solid ${colors.secondary}`,
            borderRadius: radii.sm,
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.bold,
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
            cursor: 'pointer',
          }}
        >
          Generate return label
        </button>
        {error && (
          <div
            style={{
              marginTop: spacing.sm,
              fontSize: typography.fontSize.xs,
              color: '#991B1B',
            }}
          >
            {error}
          </div>
        )}
      </div>
    );
  }

  if (step === 'confirming') {
    return (
      <div
        style={{
          padding: spacing.md,
          backgroundColor: '#FFFBEB',
          border: '2px solid #FDE68A',
          borderRadius: radii.sm,
        }}
      >
        <div
          style={{
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.semibold,
            color: '#92400E',
            marginBottom: spacing.sm,
          }}
        >
          Generate a prepaid Media Mail return label for {memberName}?
        </div>
        <div
          style={{
            fontSize: typography.fontSize.xs,
            color: '#B45309',
            marginBottom: spacing.md,
          }}
        >
          This will purchase a USPS label and charge your EasyPost account.
        </div>
        <div style={{ display: 'flex', gap: spacing.sm }}>
          <button
            onClick={handleGenerate}
            style={{
              padding: `${spacing.sm} ${spacing.md}`,
              backgroundColor: colors.secondary,
              color: colors.cream,
              border: 'none',
              borderRadius: radii.sm,
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.bold,
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Yes, buy label
          </button>
          <button
            onClick={() => {
              setStep('idle');
              setError(null);
            }}
            style={{
              padding: `${spacing.sm} ${spacing.md}`,
              backgroundColor: 'transparent',
              color: colors.textLight,
              border: `1px solid ${colors.border}`,
              borderRadius: radii.sm,
              fontSize: typography.fontSize.sm,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (step === 'generating') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.sm,
          padding: spacing.md,
          fontSize: typography.fontSize.sm,
          color: colors.textLight,
        }}
      >
        <div
          style={{
            width: '18px',
            height: '18px',
            border: `3px solid ${colors.border}`,
            borderTopColor: colors.secondary,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        Generating return label…
      </div>
    );
  }

  if (step === 'done' && result) {
    return (
      <div
        style={{
          padding: spacing.md,
          backgroundColor: '#ECFDF5',
          border: '2px solid #A7F3D0',
          borderRadius: radii.sm,
        }}
      >
        <div
          style={{
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.semibold,
            color: '#065F46',
            marginBottom: spacing.sm,
          }}
        >
          ✓ Return label generated!
        </div>
        <div
          style={{
            fontSize: typography.fontSize.xs,
            color: '#065F46',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            marginBottom: spacing.md,
          }}
        >
          {result.returnNumber && <span>Return #: {result.returnNumber}</span>}
          {result.trackingNumber && (
            <span style={{ fontFamily: 'monospace' }}>
              Tracking: {result.trackingNumber}
            </span>
          )}
          {result.cost && <span>Cost: ${parseFloat(result.cost).toFixed(2)}</span>}
        </div>
        <div style={{ display: 'flex', gap: spacing.sm }}>
          {result.labelUrl && (
            <a
              href={result.labelUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: spacing.xs,
                padding: `${spacing.sm} ${spacing.md}`,
                backgroundColor: colors.primary,
                color: colors.cream,
                borderRadius: radii.sm,
                fontSize: typography.fontSize.xs,
                fontWeight: typography.fontWeight.bold,
                textTransform: 'uppercase',
                textDecoration: 'none',
              }}
            >
              Download label ↗
            </a>
          )}
        </div>
      </div>
    );
  }

  return null;
}