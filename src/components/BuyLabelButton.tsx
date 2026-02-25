'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Truck, Loader2, Printer, ExternalLink } from 'lucide-react';
import { colors, typography, spacing, radii } from '@/styles/tokens';

interface Rate {
  id: string;
  carrier: string;
  service: string;
  rate: string;
  currency: string;
  delivery_days: number | null;
  est_delivery_date: string | null;
}

interface BuyLabelButtonProps {
  shipmentId: string;
}

export default function BuyLabelButton({ shipmentId }: BuyLabelButtonProps) {
  const router = useRouter();
  const [step, setStep] = useState<'idle' | 'loading-rates' | 'picking' | 'buying' | 'done'>('idle');
  const [rates, setRates] = useState<Rate[]>([]);
  const [selectedRate, setSelectedRate] = useState<string>('');
  const [easypostShipmentId, setEasypostShipmentId] = useState('');
  const [result, setResult] = useState<{
    tracking_number: string | null;
    label_url: string | null;
    carrier: string | null;
    service: string | null;
    rate: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bookCount, setBookCount] = useState(0);
  const [weightOz, setWeightOz] = useState(0);

  async function handleGetRates() {
    setStep('loading-rates');
    setError(null);

    try {
      const res = await fetch('/api/shipping/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipmentId }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Failed to get rates.');
      }

      const data = await res.json();
      setRates(data.rates || []);
      setEasypostShipmentId(data.easypost_shipment_id);
      setBookCount(data.book_count || 0);
      setWeightOz(data.weight_oz || 0);

      // Auto-select cheapest
      if (data.rates?.length) {
        setSelectedRate(data.rates[0].id);
      }

      setStep('picking');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setStep('idle');
    }
  }

  async function handleBuyLabel() {
    if (!selectedRate || !easypostShipmentId) return;

    setStep('buying');
    setError(null);

    try {
      const res = await fetch('/api/shipping/buy-label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipmentId,
          easypostShipmentId,
          rateId: selectedRate,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Failed to buy label.');
      }

      const data = await res.json();
      setResult(data);
      setStep('done');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setStep('picking');
    }
  }

  function formatService(carrier: string, service: string): string {
    const name = service
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (s) => s.toUpperCase())
      .replace('Usps', 'USPS')
      .replace('Ups', 'UPS')
      .replace('Fedex', 'FedEx');
    return `${carrier} ${name}`.trim();
  }

  // ---- Idle state ----
  if (step === 'idle') {
    return (
      <div>
        <button
          type="button"
          onClick={handleGetRates}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: spacing.xs,
            padding: `${spacing.sm} ${spacing.lg}`,
            backgroundColor: colors.primary,
            color: colors.cream,
            border: 'none',
            borderRadius: radii.sm,
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.bold,
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
            cursor: 'pointer',
          }}
        >
          <Package size={16} />
          Get shipping rates
        </button>

        {error && (
          <div
            style={{
              marginTop: spacing.sm,
              padding: `${spacing.sm} ${spacing.md}`,
              borderRadius: radii.sm,
              backgroundColor: '#FEF2F2',
              fontSize: typography.fontSize.sm,
              color: '#991B1B',
            }}
          >
            {error}
          </div>
        )}
      </div>
    );
  }

  // ---- Loading rates ----
  if (step === 'loading-rates') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.sm,
          fontSize: typography.fontSize.sm,
          color: colors.textLight,
        }}
      >
        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
        Getting USPS rates…
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ---- Rate selection ----
  if (step === 'picking') {
    return (
      <div>
        <div
          style={{
            fontSize: typography.fontSize.xs,
            color: colors.textMuted,
            marginBottom: spacing.sm,
          }}
        >
          {bookCount} book{bookCount !== 1 ? 's' : ''} · {(weightOz / 16).toFixed(1)} lbs estimated
        </div>

        {rates.length === 0 ? (
          <div
            style={{
              padding: spacing.md,
              borderRadius: radii.sm,
              backgroundColor: '#FEF2F2',
              fontSize: typography.fontSize.sm,
              color: '#991B1B',
            }}
          >
            No rates returned. Check the shipping address is valid.
          </div>
        ) : (
          <>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: spacing.xs,
                marginBottom: spacing.md,
              }}
            >
              {rates.map((rate) => (
                <label
                  key={rate.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.sm,
                    padding: spacing.sm,
                    borderRadius: radii.sm,
                    border: `2px solid ${selectedRate === rate.id ? colors.primary : colors.border}`,
                    backgroundColor: selectedRate === rate.id ? colors.cream : colors.surface,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    type="radio"
                    name="rate"
                    value={rate.id}
                    checked={selectedRate === rate.id}
                    onChange={() => setSelectedRate(rate.id)}
                    style={{ accentColor: colors.primary }}
                  />
                  <Truck size={16} style={{ color: colors.textLight, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.semibold,
                        color: colors.text,
                      }}
                    >
                      {formatService(rate.carrier, rate.service)}
                    </div>
                    {rate.delivery_days && (
                      <div
                        style={{
                          fontSize: typography.fontSize.xs,
                          color: colors.textMuted,
                        }}
                      >
                        {rate.delivery_days} business day{rate.delivery_days !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: typography.fontSize.base,
                      fontWeight: typography.fontWeight.bold,
                      color: colors.text,
                      fontFamily: 'monospace',
                    }}
                  >
                    ${parseFloat(rate.rate).toFixed(2)}
                  </div>
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', gap: spacing.sm, alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleBuyLabel}
                disabled={!selectedRate}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: spacing.xs,
                  padding: `${spacing.sm} ${spacing.lg}`,
                  backgroundColor: selectedRate ? colors.secondary : colors.border,
                  color: selectedRate ? colors.cream : colors.textMuted,
                  border: 'none',
                  borderRadius: radii.sm,
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.bold,
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  cursor: selectedRate ? 'pointer' : 'not-allowed',
                }}
              >
                Buy label
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('idle');
                  setRates([]);
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

            {error && (
              <div
                style={{
                  marginTop: spacing.sm,
                  padding: `${spacing.sm} ${spacing.md}`,
                  borderRadius: radii.sm,
                  backgroundColor: '#FEF2F2',
                  fontSize: typography.fontSize.sm,
                  color: '#991B1B',
                }}
              >
                {error}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // ---- Buying ----
  if (step === 'buying') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.sm,
          fontSize: typography.fontSize.sm,
          color: colors.textLight,
        }}
      >
        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
        Purchasing label…
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ---- Done ----
  if (step === 'done' && result) {
    return (
      <div>
        <div
          style={{
            padding: spacing.md,
            borderRadius: radii.sm,
            backgroundColor: '#ECFDF5',
            marginBottom: spacing.md,
          }}
        >
          <div
            style={{
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.semibold,
              color: '#065F46',
              marginBottom: spacing.xs,
            }}
          >
            ✓ Label purchased!
          </div>
          <div
            style={{
              fontSize: typography.fontSize.sm,
              color: '#065F46',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}
          >
            {result.carrier && (
              <span>
                {result.carrier} {result.service} — ${parseFloat(result.rate || '0').toFixed(2)}
              </span>
            )}
            {result.tracking_number && (
              <span style={{ fontFamily: 'monospace' }}>
                Tracking: {result.tracking_number}
              </span>
            )}
          </div>
        </div>

        {result.label_url && (
          <div style={{ display: 'flex', gap: spacing.sm }}>
            <a
              href={result.label_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: spacing.xs,
                padding: `${spacing.sm} ${spacing.md}`,
                backgroundColor: colors.primary,
                color: colors.cream,
                border: 'none',
                borderRadius: radii.sm,
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.bold,
                textTransform: 'uppercase',
                textDecoration: 'none',
                cursor: 'pointer',
              }}
            >
              <Printer size={16} />
              Print label
            </a>
            <a
              href={result.label_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: spacing.xs,
                padding: `${spacing.sm} ${spacing.md}`,
                backgroundColor: 'transparent',
                color: colors.textLight,
                border: `1px solid ${colors.border}`,
                borderRadius: radii.sm,
                fontSize: typography.fontSize.sm,
                textDecoration: 'none',
                cursor: 'pointer',
              }}
            >
              <ExternalLink size={14} />
              Open label
            </a>
          </div>
        )}
      </div>
    );
  }

  return null;
}