'use client';

import { useState, useMemo } from 'react';
import { colors, typography, spacing, radii } from '@/styles/tokens';

interface QueueItem {
  bundleId: string;
  memberName: string;
  hasAddress: boolean;
  booksFull: boolean;
  hasTier: boolean;
}

interface PurchaseResult {
  shipmentId: string;
  trackingNumber: string | null;
  labelUrl: string | null;
  carrier: string | null;
  service: string | null;
  rate: string | null;
}

type Step = 'idle' | 'loading-rates' | 'confirm' | 'buying' | 'done';

const MEDIA_MAIL_SERVICE = 'MediaMail';

export default function BatchBuyButton({ items }: { items: QueueItem[] }) {
  const [step, setStep] = useState<Step>('idle');
  const [error, setError] = useState<string | null>(null);

  // Rate state
  const [shipmentsWithRates, setShipmentsWithRates] = useState<
    Array<{
      shipmentId: string;
      easypostShipmentId: string;
      memberName: string;
      rates: Array<{ id: string; service: string; carrier: string; rate: string }>;
    }>
  >([]);
  const [totalCost, setTotalCost] = useState('0.00');
  const [perLabel, setPerLabel] = useState('0.00');
  const [missingMediaMail, setMissingMediaMail] = useState<string[]>([]);

  // Purchase state
  const [results, setResults] = useState<PurchaseResult[]>([]);
  const [purchaseErrors, setPurchaseErrors] = useState<{ shipmentId: string; reason: string }[]>(
    []
  );

  const readyItems = useMemo(
    () => items.filter((i) => i.hasAddress && i.booksFull && i.hasTier),
    [items]
  );

  const issueItems = useMemo(
    () => items.filter((i) => !i.hasAddress || !i.booksFull || !i.hasTier),
    [items]
  );

  const readyIds = useMemo(() => readyItems.map((i) => i.bundleId), [readyItems]);

  async function handleGetRates() {
    if (!readyIds.length) return;

    setStep('loading-rates');
    setError(null);
    setMissingMediaMail([]);

    try {
      const res = await fetch('/api/shipping/rates/batch-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipmentIds: readyIds }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to fetch rates.');
        setStep('idle');
        return;
      }

      if (!data.shipments?.length) {
        setError('No rates returned. Check that shipments have valid addresses.');
        setStep('idle');
        return;
      }

      // Check which shipments have Media Mail available
      interface RateItem { id: string; service: string; carrier: string; rate: string }
      interface ShipmentWithRatesResponse {
        shipmentId: string;
        easypostShipmentId: string;
        memberName: string;
        rates: RateItem[];
      }

      const withMediaMail: ShipmentWithRatesResponse[] = [];
      const withoutMediaMail: string[] = [];

      for (const s of data.shipments as ShipmentWithRatesResponse[]) {
        const hasMedia = s.rates.some((r) => r.service === MEDIA_MAIL_SERVICE);
        if (hasMedia) {
          withMediaMail.push(s);
        } else {
          withoutMediaMail.push(s.memberName || s.shipmentId);
        }
      }

      if (withMediaMail.length === 0) {
        setError(
          'USPS Media Mail is not available for any of these shipments. This may be a test API limitation — try with your live key.'
        );
        setStep('idle');
        return;
      }

      // Calculate total Media Mail cost
      const total = withMediaMail.reduce((sum: number, s) => {
        const mediaRate = s.rates.find((r) => r.service === MEDIA_MAIL_SERVICE);
        return sum + (mediaRate ? parseFloat(mediaRate.rate) : 0);
      }, 0);

      setShipmentsWithRates(withMediaMail);
      setTotalCost(total.toFixed(2));
      setPerLabel((total / withMediaMail.length).toFixed(2));
      setMissingMediaMail(withoutMediaMail);
      setStep('confirm');

      if (data.errors?.length) {
        console.warn('Some shipments had errors:', data.errors);
      }
    } catch {
      setError('Network error fetching rates.');
      setStep('idle');
    }
  }

  async function handleBuyLabels() {
    if (!shipmentsWithRates.length) return;

    setStep('buying');
    setError(null);

    const purchases = shipmentsWithRates
      .map((s) => {
        const mediaRate = s.rates.find((r) => r.service === MEDIA_MAIL_SERVICE);
        if (!mediaRate) return null;
        return {
          shipmentId: s.shipmentId,
          easypostShipmentId: s.easypostShipmentId,
          rateId: mediaRate.id,
        };
      })
      .filter(Boolean);

    try {
      const res = await fetch('/api/shipping/batch-buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchases }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPurchaseErrors([{ shipmentId: 'batch', reason: data.error || 'Batch purchase failed.' }]);
        setStep('done');
        return;
      }

      setResults(data.purchased || []);
      setPurchaseErrors(data.errors || []);
      setStep('done');
    } catch {
      setPurchaseErrors([{ shipmentId: 'batch', reason: 'Network error during purchase.' }]);
      setStep('done');
    }
  }

  function handleReset() {
    setStep('idle');
    setError(null);
    setShipmentsWithRates([]);
    setTotalCost('0.00');
    setPerLabel('0.00');
    setMissingMediaMail([]);
    setResults([]);
    setPurchaseErrors([]);
  }

  // ── Idle: show pre-flight + buy button ──────────────────────────

  if (step === 'idle') {
    return (
      <div
        style={{
          backgroundColor: colors.surface,
          border: `2px solid ${colors.border}`,
          borderRadius: radii.md,
          padding: spacing.lg,
          marginBottom: spacing.lg,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: issueItems.length > 0 ? spacing.md : 0,
          }}
        >
          <div>
            <h2
              style={{
                fontSize: typography.fontSize.lg,
                fontWeight: typography.fontWeight.bold,
                color: colors.text,
                margin: 0,
              }}
            >
              Buy labels — USPS Media Mail
            </h2>
            <p
              style={{
                fontSize: typography.fontSize.xs,
                color: colors.textLight,
                margin: 0,
                marginTop: spacing.xs,
              }}
            >
              {readyItems.length} of {items.length} orders ready
              {issueItems.length > 0 && ` · ${issueItems.length} with issues`}
            </p>
          </div>

          <button
            onClick={handleGetRates}
            disabled={readyItems.length === 0}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: spacing.xs,
              padding: `${spacing.sm} ${spacing.lg}`,
              backgroundColor: readyItems.length > 0 ? colors.secondary : colors.border,
              color: readyItems.length > 0 ? colors.cream : colors.textLight,
              border: 'none',
              borderRadius: radii.sm,
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.bold,
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
              cursor: readyItems.length > 0 ? 'pointer' : 'not-allowed',
            }}
          >
            Get rates for {readyItems.length} orders →
          </button>
        </div>

        {/* Issue warnings */}
        {issueItems.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
            {issueItems.map((item) => {
              const issues: string[] = [];
              if (!item.hasAddress) issues.push('no address');
              if (!item.booksFull) issues.push('books incomplete');
              if (!item.hasTier) issues.push('no tier');

              return (
                <div
                  key={item.bundleId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.sm,
                    padding: `${spacing.xs} ${spacing.sm}`,
                    backgroundColor: '#FEF2F2',
                    borderRadius: radii.sm,
                    fontSize: typography.fontSize.xs,
                    color: '#991B1B',
                  }}
                >
                  <span>✕</span>
                  <span style={{ fontWeight: typography.fontWeight.semibold }}>
                    {item.memberName}
                  </span>
                  <span>— {issues.join(', ')}</span>
                </div>
              );
            })}
          </div>
        )}

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

  // ── Loading rates ───────────────────────────────────────────────

  if (step === 'loading-rates') {
    return (
      <div
        style={{
          backgroundColor: colors.surface,
          border: `2px solid ${colors.border}`,
          borderRadius: radii.md,
          padding: spacing.lg,
          marginBottom: spacing.lg,
          display: 'flex',
          alignItems: 'center',
          gap: spacing.sm,
        }}
      >
        <div
          style={{
            width: '20px',
            height: '20px',
            border: `3px solid ${colors.border}`,
            borderTopColor: colors.secondary,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <span style={{ fontSize: typography.fontSize.sm, color: colors.textLight }}>
          Getting USPS Media Mail rates for {readyItems.length} orders…
        </span>
      </div>
    );
  }

  // ── Confirm Media Mail ──────────────────────────────────────────

  if (step === 'confirm') {
    return (
      <div
        style={{
          backgroundColor: colors.surface,
          border: `2px solid ${colors.secondary}`,
          borderRadius: radii.md,
          padding: spacing.lg,
          marginBottom: spacing.lg,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: spacing.md,
          }}
        >
          <div>
            <h2
              style={{
                fontSize: typography.fontSize.lg,
                fontWeight: typography.fontWeight.bold,
                color: colors.text,
                margin: 0,
              }}
            >
              USPS Media Mail
            </h2>
            <p
              style={{
                fontSize: typography.fontSize.xs,
                color: colors.textLight,
                margin: 0,
                marginTop: spacing.xs,
              }}
            >
              {shipmentsWithRates.length} labels · ~${perLabel}/label
            </p>
          </div>
          <button
            onClick={handleReset}
            style={{
              padding: `${spacing.xs} ${spacing.sm}`,
              backgroundColor: 'transparent',
              color: colors.textLight,
              border: `1px solid ${colors.border}`,
              borderRadius: radii.sm,
              fontSize: typography.fontSize.xs,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>

        {/* Cost summary */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: spacing.sm,
            marginBottom: spacing.md,
            padding: spacing.md,
            backgroundColor: colors.cream,
            borderRadius: radii.sm,
          }}
        >
          <span
            style={{
              fontSize: typography.fontSize['2xl'],
              fontWeight: typography.fontWeight.bold,
              color: colors.text,
              fontFamily: 'monospace',
            }}
          >
            ${totalCost}
          </span>
          <span style={{ fontSize: typography.fontSize.sm, color: colors.textLight }}>
            total for {shipmentsWithRates.length} labels
          </span>
        </div>

        {/* Warning for shipments without Media Mail */}
        {missingMediaMail.length > 0 && (
          <div
            style={{
              padding: spacing.sm,
              backgroundColor: '#FFFBEB',
              border: '1px solid #FDE68A',
              borderRadius: radii.sm,
              marginBottom: spacing.md,
              fontSize: typography.fontSize.xs,
              color: '#92400E',
            }}
          >
            <span style={{ fontWeight: typography.fontWeight.bold }}>Note:</span>{' '}
            Media Mail not available for: {missingMediaMail.join(', ')}.
            These will be skipped. Use View → to ship them individually.
          </div>
        )}

        <button
          onClick={handleBuyLabels}
          style={{
            width: '100%',
            padding: `${spacing.sm} ${spacing.lg}`,
            backgroundColor: colors.secondary,
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
          Buy {shipmentsWithRates.length} Media Mail labels — ${totalCost}
        </button>
      </div>
    );
  }

  // ── Buying ──────────────────────────────────────────────────────

  if (step === 'buying') {
    return (
      <div
        style={{
          backgroundColor: colors.surface,
          border: `2px solid ${colors.border}`,
          borderRadius: radii.md,
          padding: spacing.lg,
          marginBottom: spacing.lg,
          display: 'flex',
          alignItems: 'center',
          gap: spacing.sm,
        }}
      >
        <div
          style={{
            width: '20px',
            height: '20px',
            border: `3px solid ${colors.border}`,
            borderTopColor: colors.secondary,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <span style={{ fontSize: typography.fontSize.sm, color: colors.textLight }}>
          Purchasing {shipmentsWithRates.length} Media Mail labels… this may take a moment.
        </span>
      </div>
    );
  }

  // ── Done ────────────────────────────────────────────────────────

  if (step === 'done') {
    const allLabelUrls = results.map((r) => r.labelUrl).filter(Boolean) as string[];

    return (
      <div
        style={{
          backgroundColor: colors.surface,
          border: `2px solid ${purchaseErrors.length > 0 ? '#FECACA' : '#A7F3D0'}`,
          borderRadius: radii.md,
          padding: spacing.lg,
          marginBottom: spacing.lg,
        }}
      >
        <h2
          style={{
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.bold,
            color: purchaseErrors.length === 0 ? '#065F46' : colors.text,
            margin: 0,
            marginBottom: spacing.md,
          }}
        >
          {purchaseErrors.length === 0
            ? `✓ ${results.length} Media Mail labels purchased!`
            : `${results.length} purchased, ${purchaseErrors.length} failed`}
        </h2>

        {purchaseErrors.length > 0 && (
          <div
            style={{
              padding: spacing.sm,
              backgroundColor: '#FEF2F2',
              borderRadius: radii.sm,
              marginBottom: spacing.md,
              fontSize: typography.fontSize.xs,
              color: '#991B1B',
            }}
          >
            {purchaseErrors.map((e, i) => (
              <div key={i}>{e.reason}</div>
            ))}
          </div>
        )}

        {results.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs, marginBottom: spacing.md }}>
            {results.map((r) => (
              <div
                key={r.shipmentId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: spacing.sm,
                  backgroundColor: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  borderRadius: radii.sm,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.semibold,
                      color: '#065F46',
                    }}
                  >
                    ✓ Media Mail · ${r.rate}
                  </div>
                  <div
                    style={{
                      fontSize: typography.fontSize.xs,
                      color: colors.textLight,
                      fontFamily: 'monospace',
                    }}
                  >
                    {r.trackingNumber || 'No tracking'}
                  </div>
                </div>
                {r.labelUrl && (
                  <a
                    href={r.labelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: typography.fontSize.xs,
                      fontWeight: typography.fontWeight.bold,
                      color: colors.primary,
                      textDecoration: 'none',
                      textTransform: 'uppercase',
                    }}
                  >
                    Print ↗
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: spacing.sm }}>
          {allLabelUrls.length > 1 && (
            <button
              onClick={() => allLabelUrls.forEach((url) => window.open(url, '_blank'))}
              style={{
                padding: `${spacing.sm} ${spacing.lg}`,
                backgroundColor: colors.primary,
                color: colors.cream,
                border: 'none',
                borderRadius: radii.sm,
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.bold,
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              Open all {allLabelUrls.length} labels
            </button>
          )}
          {allLabelUrls.length === 1 && (
            <a
              href={allLabelUrls[0]}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: `${spacing.sm} ${spacing.lg}`,
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
              Print label
            </a>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: `${spacing.sm} ${spacing.lg}`,
              backgroundColor: colors.surface,
              color: colors.text,
              border: `2px solid ${colors.border}`,
              borderRadius: radii.sm,
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.bold,
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Refresh queue
          </button>
        </div>
      </div>
    );
  }

  return null;
}