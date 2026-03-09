'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { colors, typography, spacing, radii } from '@/styles/tokens';
import type { BatchShipment } from '@/app/work/shipping/batch/page';

interface TierGroup {
  key: string;
  label: string;
  books: number;
  weight: number;
  readyCount: number;
  shippedCount: number;
  shipments: BatchShipment[];
}

interface RateOption {
  id: string;
  service: string;
  carrier: string;
  rate: string;
  delivery_days: number | null;
}

interface ShipmentWithRates {
  shipmentId: string;
  easypostShipmentId: string;
  memberName: string;
  orderNumber: string | null;
  tier: string;
  bookCount: number;
  weight: number;
  rates: RateOption[];
}

interface PurchaseResult {
  shipmentId: string;
  trackingNumber: string | null;
  labelUrl: string | null;
  carrier: string | null;
  service: string | null;
  rate: string | null;
}

type ViewMode = 'tiers' | 'selection' | 'rates' | 'buying' | 'done';

export default function BatchShippingClient({ tiers }: { tiers: TierGroup[] }) {
  const [activeTier, setActiveTier] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('tiers');
  const [showShipped, setShowShipped] = useState(false);

  // Rate fetching state
  const [shipmentsWithRates, setShipmentsWithRates] = useState<ShipmentWithRates[]>([]);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);

  // Purchase state
  const [buyProgress, setBuyProgress] = useState(0);
  const [buyTotal, setBuyTotal] = useState(0);
  const [purchaseResults, setPurchaseResults] = useState<PurchaseResult[]>([]);
  const [purchaseErrors, setPurchaseErrors] = useState<{ shipmentId: string; reason: string }[]>([]);

  const currentTier = tiers.find((t) => t.key === activeTier);

  const readyShipments = useMemo(
    () => currentTier?.shipments.filter((s) => s.status !== 'shipped') || [],
    [currentTier],
  );

  const shippedShipments = useMemo(
    () => currentTier?.shipments.filter((s) => s.status === 'shipped') || [],
    [currentTier],
  );

  // Get available services from rates (common across all shipments)
  const availableServices = useMemo(() => {
    if (!shipmentsWithRates.length) return [];

    // Find services available across ALL shipments
    const serviceSets = shipmentsWithRates.map(
      (s) => new Set(s.rates.map((r) => r.service)),
    );
    const commonServices = [...serviceSets[0]].filter((service) =>
      serviceSets.every((set) => set.has(service)),
    );

    // Get representative rate info for each service
    return commonServices.map((service) => {
      const sampleRate = shipmentsWithRates[0].rates.find((r) => r.service === service)!;
      const totalCost = shipmentsWithRates.reduce((sum, s) => {
        const rate = s.rates.find((r) => r.service === service);
        return sum + (rate ? parseFloat(rate.rate) : 0);
      }, 0);

      return {
        service,
        carrier: sampleRate.carrier,
        deliveryDays: sampleRate.delivery_days,
        totalCost: totalCost.toFixed(2),
        perLabel: (totalCost / shipmentsWithRates.length).toFixed(2),
      };
    });
  }, [shipmentsWithRates]);

  // --- Handlers ---

  function handleSelectTier(tierKey: string) {
    setActiveTier(tierKey);
    const tier = tiers.find((t) => t.key === tierKey);
    const readyIds = (tier?.shipments || [])
      .filter((s) => s.status !== 'shipped' && s.hasAddress)
      .map((s) => s.id);
    setSelectedIds(new Set(readyIds));
    setViewMode('selection');
    setShipmentsWithRates([]);
    setSelectedService(null);
    setRatesError(null);
    setPurchaseResults([]);
    setPurchaseErrors([]);
  }

  function handleToggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSelectAll() {
    const readyIds = readyShipments.filter((s) => s.hasAddress).map((s) => s.id);
    setSelectedIds(new Set(readyIds));
  }

  function handleDeselectAll() {
    setSelectedIds(new Set());
  }

  async function handleGetRates() {
    if (!selectedIds.size) return;

    setRatesLoading(true);
    setRatesError(null);

    try {
      const res = await fetch('/api/shipping/batch-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipmentIds: [...selectedIds] }),
      });

      const data = await res.json();

      if (!res.ok) {
        setRatesError(data.error || 'Failed to fetch rates.');
        return;
      }

      if (data.shipments?.length) {
        setShipmentsWithRates(data.shipments);
        setViewMode('rates');
      } else {
        setRatesError('No rates returned. Check that shipments have valid addresses.');
      }

      if (data.errors?.length) {
        console.warn('Some shipments had errors:', data.errors);
      }
    } catch (err) {
      setRatesError('Network error fetching rates.');
    } finally {
      setRatesLoading(false);
    }
  }

  async function handleBuyLabels() {
    if (!selectedService || !shipmentsWithRates.length) return;

    setViewMode('buying');
    setBuyProgress(0);
    setBuyTotal(shipmentsWithRates.length);

    // Build purchase requests — pick the rate matching the selected service for each shipment
    const purchases = shipmentsWithRates
      .map((s) => {
        const rate = s.rates.find((r) => r.service === selectedService);
        if (!rate) return null;
        return {
          shipmentId: s.shipmentId,
          easypostShipmentId: s.easypostShipmentId,
          rateId: rate.id,
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
        setViewMode('done');
        return;
      }

      setPurchaseResults(data.purchased || []);
      setPurchaseErrors(data.errors || []);
      setBuyProgress(shipmentsWithRates.length);
      setViewMode('done');
    } catch (err) {
      setPurchaseErrors([{ shipmentId: 'batch', reason: 'Network error during purchase.' }]);
      setViewMode('done');
    }
  }

  function handleBackToTiers() {
    setActiveTier(null);
    setViewMode('tiers');
    setSelectedIds(new Set());
    setShipmentsWithRates([]);
    setSelectedService(null);
    setRatesError(null);
    setPurchaseResults([]);
    setPurchaseErrors([]);
  }

  // --- Render ---

  // Tier overview cards
  if (viewMode === 'tiers') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
        {tiers.map((tier) => (
          <div
            key={tier.key}
            style={{
              backgroundColor: colors.surface,
              border: `2px solid ${colors.border}`,
              borderRadius: radii.md,
              padding: spacing.lg,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <h2
                style={{
                  fontFamily: typography.fontFamily.heading,
                  fontSize: typography.fontSize.xl,
                  fontWeight: typography.fontWeight.bold,
                  color: colors.text,
                  margin: 0,
                  marginBottom: spacing.xs,
                }}
              >
                {tier.label}
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: typography.fontSize.sm,
                  color: colors.textLight,
                }}
              >
                {tier.books} books · {tier.weight} lbs per package
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.lg }}>
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontSize: typography.fontSize['2xl'],
                    fontWeight: typography.fontWeight.bold,
                    color: tier.readyCount > 0 ? colors.primary : colors.textLight,
                  }}
                >
                  {tier.readyCount}
                </div>
                <div
                  style={{
                    fontSize: typography.fontSize.xs,
                    color: colors.textLight,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Ready to ship
                </div>
              </div>

              {tier.shippedCount > 0 && (
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      fontSize: typography.fontSize['2xl'],
                      fontWeight: typography.fontWeight.bold,
                      color: '#065F46',
                    }}
                  >
                    {tier.shippedCount}
                  </div>
                  <div
                    style={{
                      fontSize: typography.fontSize.xs,
                      color: colors.textLight,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}
                  >
                    Shipped
                  </div>
                </div>
              )}

              <button
                onClick={() => handleSelectTier(tier.key)}
                disabled={tier.readyCount === 0 && tier.shippedCount === 0}
                style={{
                  padding: `${spacing.sm} ${spacing.lg}`,
                  backgroundColor:
                    tier.readyCount > 0 ? colors.primary : colors.surface,
                  color: tier.readyCount > 0 ? '#fff' : colors.textLight,
                  border: tier.readyCount > 0 ? 'none' : `2px solid ${colors.border}`,
                  borderRadius: radii.sm,
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.bold,
                  textTransform: 'uppercase',
                  cursor:
                    tier.readyCount === 0 && tier.shippedCount === 0
                      ? 'not-allowed'
                      : 'pointer',
                  opacity: tier.readyCount === 0 && tier.shippedCount === 0 ? 0.5 : 1,
                }}
              >
                {tier.readyCount > 0 ? 'Ship batch' : tier.shippedCount > 0 ? 'View' : 'No orders'}
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Selection view — pick orders within a tier
  if (viewMode === 'selection') {
    return (
      <div>
        {/* Tier header with back button */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: spacing.lg,
          }}
        >
          <div>
            <button
              onClick={handleBackToTiers}
              style={{
                background: 'none',
                border: 'none',
                color: colors.secondary,
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.semibold,
                cursor: 'pointer',
                padding: 0,
                marginBottom: spacing.xs,
              }}
            >
              ← All tiers
            </button>
            <h2
              style={{
                fontFamily: typography.fontFamily.heading,
                fontSize: typography.fontSize['2xl'],
                fontWeight: typography.fontWeight.bold,
                color: colors.text,
                margin: 0,
              }}
            >
              {currentTier?.label}
            </h2>
          </div>

          <div style={{ display: 'flex', gap: spacing.sm }}>
            <button
              onClick={handleSelectAll}
              style={{
                padding: `${spacing.xs} ${spacing.md}`,
                background: 'none',
                border: `1px solid ${colors.border}`,
                borderRadius: radii.sm,
                fontSize: typography.fontSize.xs,
                color: colors.text,
                cursor: 'pointer',
              }}
            >
              Select all
            </button>
            <button
              onClick={handleDeselectAll}
              style={{
                padding: `${spacing.xs} ${spacing.md}`,
                background: 'none',
                border: `1px solid ${colors.border}`,
                borderRadius: radii.sm,
                fontSize: typography.fontSize.xs,
                color: colors.text,
                cursor: 'pointer',
              }}
            >
              Deselect all
            </button>
          </div>
        </div>

        {/* Ready to ship */}
        {readyShipments.length > 0 && (
          <div style={{ marginBottom: spacing.lg }}>
            <h3
              style={{
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.bold,
                color: colors.textLight,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                margin: 0,
                marginBottom: spacing.sm,
              }}
            >
              Ready to ship ({readyShipments.length})
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
              {readyShipments.map((s) => (
                <label
                  key={s.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.md,
                    padding: spacing.md,
                    backgroundColor: selectedIds.has(s.id) ? colors.surface : '#fff',
                    border: `2px solid ${selectedIds.has(s.id) ? colors.primary : colors.border}`,
                    borderRadius: radii.sm,
                    cursor: s.hasAddress ? 'pointer' : 'not-allowed',
                    opacity: s.hasAddress ? 1 : 0.6,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(s.id)}
                    onChange={() => handleToggle(s.id)}
                    disabled={!s.hasAddress}
                    style={{
                      width: '18px',
                      height: '18px',
                      accentColor: colors.primary,
                      cursor: s.hasAddress ? 'pointer' : 'not-allowed',
                    }}
                  />

                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontWeight: typography.fontWeight.semibold,
                        fontSize: typography.fontSize.base,
                        color: colors.text,
                      }}
                    >
                      {s.memberName}
                    </div>
                    <div
                      style={{
                        fontSize: typography.fontSize.xs,
                        color: colors.textLight,
                      }}
                    >
                      {s.orderNumber || s.id.slice(0, 8)} · {s.bookCount} books · {s.weight} lbs
                    </div>
                  </div>

                  {!s.hasAddress && (
                    <span
                      style={{
                        fontSize: typography.fontSize.xs,
                        color: '#991B1B',
                        backgroundColor: '#FEF2F2',
                        padding: `2px ${spacing.sm}`,
                        borderRadius: radii.sm,
                      }}
                    >
                      No address
                    </span>
                  )}

                  <Link
                    href={`/ship/${s.id}`}
                    style={{
                      fontSize: typography.fontSize.xs,
                      color: colors.secondary,
                      textDecoration: 'none',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    View →
                  </Link>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Shipped orders (collapsible) */}
        {shippedShipments.length > 0 && (
          <div style={{ marginBottom: spacing.lg }}>
            <button
              onClick={() => setShowShipped(!showShipped)}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: spacing.xs,
                marginBottom: spacing.sm,
              }}
            >
              <h3
                style={{
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.bold,
                  color: '#065F46',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  margin: 0,
                }}
              >
                Shipped ({shippedShipments.length})
              </h3>
              <span style={{ fontSize: typography.fontSize.xs, color: colors.textLight }}>
                {showShipped ? '▾' : '▸'}
              </span>
            </button>

            {showShipped && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
                {shippedShipments.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing.md,
                      padding: spacing.md,
                      backgroundColor: '#ECFDF5',
                      border: `2px solid #A7F3D0`,
                      borderRadius: radii.sm,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontWeight: typography.fontWeight.semibold,
                          fontSize: typography.fontSize.base,
                          color: colors.text,
                        }}
                      >
                        {s.memberName}
                      </div>
                      <div
                        style={{
                          fontSize: typography.fontSize.xs,
                          color: colors.textLight,
                        }}
                      >
                        {s.orderNumber || s.id.slice(0, 8)}
                        {s.trackingNumber && (
                          <span style={{ fontFamily: 'monospace', marginLeft: spacing.sm }}>
                            {s.trackingNumber}
                          </span>
                        )}
                        {s.carrier && <span> · {s.carrier}</span>}
                      </div>
                    </div>

                    {s.labelUrl && (
                      <a
                        href={s.labelUrl}
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
                        Reprint ↗
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Get rates button */}
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            backgroundColor: '#fff',
            padding: `${spacing.md} 0`,
            borderTop: `2px solid ${colors.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontSize: typography.fontSize.sm,
              color: colors.textLight,
            }}
          >
            {selectedIds.size} shipment{selectedIds.size !== 1 ? 's' : ''} selected
          </span>

          <button
            onClick={handleGetRates}
            disabled={selectedIds.size === 0 || ratesLoading}
            style={{
              padding: `${spacing.sm} ${spacing.xl}`,
              backgroundColor: selectedIds.size > 0 ? colors.goldenHoney : colors.border,
              color: selectedIds.size > 0 ? '#fff' : colors.textLight,
              border: 'none',
              borderRadius: radii.sm,
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.bold,
              textTransform: 'uppercase',
              cursor: selectedIds.size > 0 ? 'pointer' : 'not-allowed',
            }}
          >
            {ratesLoading ? 'Fetching rates...' : 'Get rates →'}
          </button>
        </div>

        {ratesError && (
          <div
            style={{
              marginTop: spacing.sm,
              padding: spacing.md,
              backgroundColor: '#FEF2F2',
              borderRadius: radii.sm,
              color: '#991B1B',
              fontSize: typography.fontSize.sm,
            }}
          >
            {ratesError}
          </div>
        )}
      </div>
    );
  }

  // Rate selection view
  if (viewMode === 'rates') {
    return (
      <div>
        <button
          onClick={() => setViewMode('selection')}
          style={{
            background: 'none',
            border: 'none',
            color: colors.secondary,
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.semibold,
            cursor: 'pointer',
            padding: 0,
            marginBottom: spacing.md,
          }}
        >
          ← Back to selection
        </button>

        <h2
          style={{
            fontFamily: typography.fontFamily.heading,
            fontSize: typography.fontSize['2xl'],
            fontWeight: typography.fontWeight.bold,
            color: colors.text,
            margin: 0,
            marginBottom: spacing.xs,
          }}
        >
          Choose shipping service
        </h2>
        <p
          style={{
            margin: 0,
            marginBottom: spacing.lg,
            fontSize: typography.fontSize.sm,
            color: colors.textLight,
          }}
        >
          {shipmentsWithRates.length} label{shipmentsWithRates.length !== 1 ? 's' : ''} ·{' '}
          {currentTier?.label}
        </p>

        {/* Service options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm, marginBottom: spacing.xl }}>
          {availableServices.map((svc) => (
            <label
              key={svc.service}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.md,
                padding: spacing.md,
                backgroundColor:
                  selectedService === svc.service ? colors.surface : '#fff',
                border: `2px solid ${
                  selectedService === svc.service ? colors.primary : colors.border
                }`,
                borderRadius: radii.sm,
                cursor: 'pointer',
              }}
            >
              <input
                type="radio"
                name="service"
                value={svc.service}
                checked={selectedService === svc.service}
                onChange={() => setSelectedService(svc.service)}
                style={{ accentColor: colors.primary }}
              />

              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontWeight: typography.fontWeight.semibold,
                    fontSize: typography.fontSize.base,
                    color: colors.text,
                  }}
                >
                  {svc.carrier} {svc.service}
                </div>
                <div
                  style={{
                    fontSize: typography.fontSize.xs,
                    color: colors.textLight,
                  }}
                >
                  {svc.deliveryDays
                    ? `${svc.deliveryDays} business day${svc.deliveryDays !== 1 ? 's' : ''}`
                    : 'Estimated delivery varies'}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    fontWeight: typography.fontWeight.bold,
                    fontSize: typography.fontSize.lg,
                    color: colors.text,
                    fontFamily: 'monospace',
                  }}
                >
                  ${svc.totalCost}
                </div>
                <div
                  style={{
                    fontSize: typography.fontSize.xs,
                    color: colors.textLight,
                  }}
                >
                  ~${svc.perLabel}/label
                </div>
              </div>
            </label>
          ))}
        </div>

        {/* Buy button */}
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            backgroundColor: '#fff',
            padding: `${spacing.md} 0`,
            borderTop: `2px solid ${colors.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontSize: typography.fontSize.sm,
              color: colors.textLight,
            }}
          >
            {shipmentsWithRates.length} labels ·{' '}
            {selectedService
              ? `$${availableServices.find((s) => s.service === selectedService)?.totalCost}`
              : 'Select a service'}
          </span>

          <button
            onClick={handleBuyLabels}
            disabled={!selectedService}
            style={{
              padding: `${spacing.sm} ${spacing.xl}`,
              backgroundColor: selectedService ? colors.goldenHoney : colors.border,
              color: selectedService ? '#fff' : colors.textLight,
              border: 'none',
              borderRadius: radii.sm,
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.bold,
              textTransform: 'uppercase',
              cursor: selectedService ? 'pointer' : 'not-allowed',
            }}
          >
            Buy {shipmentsWithRates.length} labels
          </button>
        </div>
      </div>
    );
  }

  // Buying in progress
  if (viewMode === 'buying') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '300px',
          gap: spacing.lg,
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            border: `4px solid ${colors.border}`,
            borderTopColor: colors.primary,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ textAlign: 'center' }}>
          <h2
            style={{
              fontFamily: typography.fontFamily.heading,
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.bold,
              color: colors.text,
              margin: 0,
              marginBottom: spacing.xs,
            }}
          >
            Buying labels...
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: typography.fontSize.sm,
              color: colors.textLight,
            }}
          >
            Purchasing {buyTotal} shipping labels. This may take a moment.
          </p>
        </div>
      </div>
    );
  }

  // Done — show results
  if (viewMode === 'done') {
    const allLabelUrls = purchaseResults.map((r) => r.labelUrl).filter(Boolean);

    return (
      <div>
        <h2
          style={{
            fontFamily: typography.fontFamily.heading,
            fontSize: typography.fontSize['2xl'],
            fontWeight: typography.fontWeight.bold,
            color: colors.text,
            margin: 0,
            marginBottom: spacing.md,
          }}
        >
          {purchaseErrors.length === 0
            ? `✓ ${purchaseResults.length} labels purchased`
            : `${purchaseResults.length} purchased, ${purchaseErrors.length} failed`}
        </h2>

        {/* Errors */}
        {purchaseErrors.length > 0 && (
          <div
            style={{
              padding: spacing.md,
              backgroundColor: '#FEF2F2',
              borderRadius: radii.sm,
              marginBottom: spacing.lg,
              fontSize: typography.fontSize.sm,
              color: '#991B1B',
            }}
          >
            <strong>Errors:</strong>
            <ul style={{ margin: `${spacing.xs} 0 0`, paddingLeft: spacing.md }}>
              {purchaseErrors.map((e, i) => (
                <li key={i}>{e.reason}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Success list */}
        {purchaseResults.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs, marginBottom: spacing.lg }}>
            {purchaseResults.map((r) => (
              <div
                key={r.shipmentId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.md,
                  padding: spacing.md,
                  backgroundColor: '#ECFDF5',
                  border: `2px solid #A7F3D0`,
                  borderRadius: radii.sm,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontWeight: typography.fontWeight.semibold,
                      fontSize: typography.fontSize.sm,
                      color: colors.text,
                    }}
                  >
                    {r.carrier} {r.service} · ${r.rate}
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

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: spacing.md }}>
          {allLabelUrls.length > 1 && (
            <button
              onClick={() => allLabelUrls.forEach((url) => window.open(url, '_blank'))}
              style={{
                padding: `${spacing.sm} ${spacing.lg}`,
                backgroundColor: colors.primary,
                color: '#fff',
                border: 'none',
                borderRadius: radii.sm,
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.bold,
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              Open all labels ({allLabelUrls.length})
            </button>
          )}

          <button
            onClick={handleBackToTiers}
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
            Back to tiers
          </button>
        </div>
      </div>
    );
  }

  return null;
}