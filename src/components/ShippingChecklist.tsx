'use client';

import { useState } from 'react';
import { colors, typography, spacing, radii } from '@/styles/tokens';

interface ShippingChecklistProps {
  isAlreadyShipped: boolean;
}

const CHECKLIST_ITEMS = [
  { id: 'verify', label: 'Verify all books are packed', detail: 'Double-check the pick list matches what\'s in the box' },
  { id: 'slip', label: 'Include packing slip', detail: 'Print from the pick slip page if needed' },
  { id: 'seal', label: 'Seal package securely', detail: 'Tape all seams — books are heavy!' },
  { id: 'label', label: 'Buy label and print it', detail: 'Use the label section above' },
  { id: 'apply', label: 'Apply label to package', detail: 'Stick it flat on the largest side' },
  { id: 'dropoff', label: 'Drop off at USPS or schedule pickup', detail: 'Schedule at usps.com/pickup if needed' },
];

export default function ShippingChecklist({ isAlreadyShipped }: ShippingChecklistProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const toggleItem = (id: string) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const completedCount = Object.values(checked).filter(Boolean).length;
  const totalCount = CHECKLIST_ITEMS.length;
  const allDone = completedCount === totalCount;

  if (isAlreadyShipped) {
    return (
      <section
        style={{
          backgroundColor: '#ECFDF5',
          border: '2px solid #A7F3D0',
          borderRadius: radii.md,
          padding: spacing.lg,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
          <span style={{ fontSize: '1.25rem' }}>✓</span>
          <h3
            style={{
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.bold,
              color: '#065F46',
              margin: 0,
            }}
          >
            Shipment complete — all steps done!
          </h3>
        </div>
      </section>
    );
  }

  return (
    <section
      style={{
        backgroundColor: allDone ? '#ECFDF5' : colors.goldenHoney + '15',
        border: `2px solid ${allDone ? '#A7F3D0' : colors.goldenHoney}`,
        borderRadius: radii.md,
        padding: spacing.lg,
        transition: 'all 0.3s ease',
      }}
    >
      {/* Header with progress */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.md,
        }}
      >
        <h3
          style={{
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.bold,
            color: allDone ? '#065F46' : colors.deepCocoa,
            margin: 0,
          }}
        >
          {allDone ? '✓ Ready to go!' : 'Shipping checklist'}
        </h3>
        <span
          style={{
            fontSize: typography.fontSize.xs,
            fontWeight: typography.fontWeight.semibold,
            color: allDone ? '#065F46' : colors.textLight,
          }}
        >
          {completedCount}/{totalCount}
        </span>
      </div>

      {/* Progress bar */}
      <div
        style={{
          width: '100%',
          height: '4px',
          backgroundColor: allDone ? '#A7F3D0' : '#E5E7EB',
          borderRadius: radii.full,
          marginBottom: spacing.md,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${(completedCount / totalCount) * 100}%`,
            height: '100%',
            backgroundColor: allDone ? '#065F46' : colors.secondary,
            borderRadius: radii.full,
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      {/* Checklist items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
        {CHECKLIST_ITEMS.map((item) => {
          const isChecked = checked[item.id] || false;

          return (
            <label
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: spacing.sm,
                padding: `${spacing.sm} ${spacing.sm}`,
                borderRadius: radii.sm,
                cursor: 'pointer',
                backgroundColor: isChecked ? (allDone ? '#D1FAE5' : '#FFFBEB') : 'transparent',
                transition: 'background-color 0.15s ease',
              }}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => toggleItem(item.id)}
                style={{
                  marginTop: '2px',
                  width: '16px',
                  height: '16px',
                  accentColor: allDone ? '#065F46' : colors.secondary,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              />
              <div>
                <div
                  style={{
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.medium,
                    color: isChecked ? colors.textLight : colors.text,
                    textDecoration: isChecked ? 'line-through' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {item.label}
                </div>
                <div
                  style={{
                    fontSize: typography.fontSize.xs,
                    color: colors.textLight,
                    marginTop: '1px',
                    opacity: isChecked ? 0.5 : 0.8,
                  }}
                >
                  {item.detail}
                </div>
              </div>
            </label>
          );
        })}
      </div>
    </section>
  );
}