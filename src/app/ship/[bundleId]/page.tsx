import Link from 'next/link';
import { colors, typography, spacing, radii, shadows } from '@/styles/tokens';
import { supabaseServer } from '@/lib/supabaseServer';
import { getTierDisplayName, getTierBookCount } from '@/lib/types';
import BuyLabelButton from '@/components/BuyLabelButton';
import PrintLabelButton from '@/components/PrintLabelButton';
import HomeButton from '@/components/HomeButton';
import ShippingChecklist from '@/components/ShippingChecklist';
import GenerateReturnLabel from '@/components/GenerateReturnLabel';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface ShipPageProps {
  params: Promise<{
    bundleId: string;
  }>;
}

export interface ShippingAddress {
  name: string;
  street: string;
  street2?: string | null;
  city: string;
  state: string;
  zip: string;
  country?: string | null;
}

const RETURN_ADDRESS: ShippingAddress = {
  name: 'The Book Nest, LLC',
  street: 'PO Box 8',
  city: 'Ranson',
  state: 'WV',
  zip: '25438',
  country: 'US',
};

// ── Known tiers for badge detection ────────────────────────────────
const KNOWN_TIERS = [
  'little-nest', 'cozy-nest', 'story-nest',
  'growing-nest', 'family-nest',
  'little_nest', 'cozy_nest', 'story_nest',
  'growing_nest', 'family_nest',
];

function hasTier(tier: string | null | undefined): boolean {
  if (!tier || !tier.trim()) return false;
  return KNOWN_TIERS.includes(tier.toLowerCase().replace(/\s+/g, '-'));
}

// ── Progress step helper ───────────────────────────────────────────
type ShipStep = 'picked' | 'pack' | 'label' | 'shipped';

function getCurrentStep(status: string, hasLabel: boolean): ShipStep {
  if (status === 'shipped') return 'shipped';
  if (hasLabel) return 'label';
  // Status is 'shipping' which means picked & ready to pack
  return 'pack';
}

export default async function ShipBundle({ params }: ShipPageProps) {
  const { bundleId } = await params;
  const supabase = supabaseServer();

  // Load shipment row
  const { data: shipment, error: shipmentError } = await supabase
    .from('shipments')
    .select('*')
    .eq('id', bundleId)
    .maybeSingle();

  if (shipmentError) {
    console.error('Error loading shipment:', shipmentError);
  }

  if (!shipment) {
    return (
      <div
        style={{
          minHeight: '100vh',
          padding: spacing.xl,
          maxWidth: '800px',
          margin: '0 auto',
        }}
      >
        <header
          style={{
            marginBottom: spacing.lg,
            paddingBottom: spacing.sm,
            borderBottom: `3px solid ${colors.secondary}`,
          }}
        >
          <Link
            href="/work/shipping"
            style={{
              display: 'inline-block',
              color: colors.secondary,
              textDecoration: 'none',
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.semibold,
              marginBottom: spacing.sm,
            }}
          >
            ← Back to shipping queue
          </Link>
          <h1
            style={{
              fontFamily: typography.fontFamily.heading,
              fontSize: typography.fontSize['2xl'],
              fontWeight: typography.fontWeight.bold,
              color: colors.secondary,
              margin: 0,
            }}
          >
            Shipment not available
          </h1>
        </header>

        <div
          style={{
            backgroundColor: colors.surface,
            borderRadius: radii.md,
            border: `2px solid ${colors.border}`,
            padding: spacing.lg,
          }}
        >
          <p style={{ margin: 0, fontSize: typography.fontSize.sm, color: colors.text }}>
            This shipment could not be found or loaded. It may be a test row, or it may have
            been removed.
          </p>
        </div>
      </div>
    );
  }

  // Load member (now including tier)
  let memberName = 'Member';
  let memberEmail = '—';
  let memberTier: string | null = null;

  if (shipment.member_id) {
    const { data: memberData } = await supabase
      .from('members')
      .select('name, email, tier')
      .eq('id', shipment.member_id)
      .maybeSingle();

    if (memberData) {
      memberName = memberData.name || memberName;
      memberEmail = memberData.email || memberEmail;
      memberTier = memberData.tier || null;
    }
  }

  // Load shipping address
  let shippingAddress: ShippingAddress | null = null;

  if (shipment.address_id) {
    const { data: addr } = await supabase
      .from('member_addresses')
      .select('street, street2, city, state, zip, country')
      .eq('id', shipment.address_id)
      .maybeSingle();

    if (addr) {
      shippingAddress = { name: memberName, ...addr };
    }
  }

  if (!shippingAddress && shipment.member_id) {
    const { data: addr } = await supabase
      .from('member_addresses')
      .select('street, street2, city, state, zip, country')
      .eq('member_id', shipment.member_id)
      .eq('is_default', true)
      .maybeSingle();

    if (addr) {
      shippingAddress = { name: memberName, ...addr };
    }
  }

  // Count books (picked)
  const { count: bookCount } = await supabase
    .from('shipment_books')
    .select('id', { count: 'exact', head: true })
    .eq('shipment_id', bundleId);

  const pickedBooks = bookCount ?? 0;
  const expectedBooks = memberTier ? getTierBookCount(memberTier) : pickedBooks;
  const isFull = pickedBooks >= expectedBooks;
  const isUnderfilled = pickedBooks > 0 && pickedBooks < expectedBooks;
  const totalWeight = (pickedBooks * 0.5).toFixed(1);

  const isAlreadyShipped = shipment.status === 'shipped';
  const hasLabel = !!shipment.label_url || !!shipment.tracking_number;
  const currentStep = getCurrentStep(shipment.status, hasLabel);

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: spacing.xl,
        maxWidth: '1000px',
        margin: '0 auto',
      }}
    >
      {/* Header */}
      <header
        style={{
          marginBottom: spacing.xl,
          paddingBottom: spacing.lg,
          borderBottom: `3px solid ${colors.secondary}`,
        }}
      >
        <Link
          href="/work/shipping"
          style={{
            display: 'inline-block',
            color: colors.secondary,
            textDecoration: 'none',
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.semibold,
            marginBottom: spacing.sm,
          }}
        >
          ← Back to shipping queue
        </Link>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: spacing.md,
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: typography.fontFamily.heading,
                fontSize: typography.fontSize['3xl'],
                fontWeight: typography.fontWeight.bold,
                color: colors.secondary,
                margin: 0,
              }}
            >
              Ship bundle
            </h1>
            <p
              style={{
                margin: 0,
                marginTop: spacing.xs,
                fontSize: typography.fontSize.sm,
                color: colors.textLight,
              }}
            >
              Review the order, buy a shipping label, and pack it up.
            </p>
          </div>
          <HomeButton />
        </div>
      </header>

      {/* ── Progress Stepper ──────────────────────────────────── */}
      <ProgressStepper currentStep={currentStep} />

      {/* Order summary + Address */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: spacing.lg,
          marginBottom: spacing.xl,
        }}
      >
        {/* Order summary */}
        <section
          style={{
            backgroundColor: colors.surface,
            border: `2px solid ${colors.border}`,
            borderRadius: radii.md,
            padding: spacing.lg,
            boxShadow: shadows.sm,
          }}
        >
          <h2
            style={{
              fontSize: typography.fontSize.lg,
              fontWeight: typography.fontWeight.bold,
              color: colors.text,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginTop: 0,
              marginBottom: spacing.md,
            }}
          >
            Order summary
          </h2>

          {/* Member info */}
          <div style={{ marginBottom: spacing.lg }}>
            <div
              style={{
                fontSize: typography.fontSize.xs,
                fontWeight: typography.fontWeight.semibold,
                color: colors.textLight,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: spacing.xs,
              }}
            >
              Member
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm,
                marginBottom: spacing.xs,
              }}
            >
              <span
                style={{
                  fontSize: typography.fontSize.base,
                  fontWeight: typography.fontWeight.semibold,
                  color: colors.text,
                }}
              >
                {memberName}
              </span>
              {/* Tier badge */}
              {hasTier(memberTier) ? (
                <span
                  style={{
                    display: 'inline-block',
                    padding: `2px ${spacing.sm}`,
                    backgroundColor: colors.sageMist,
                    color: colors.deepCocoa,
                    fontSize: '0.65rem',
                    fontWeight: typography.fontWeight.bold,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderRadius: radii.sm,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {getTierDisplayName(memberTier!)}
                </span>
              ) : (
                <span
                  style={{
                    display: 'inline-block',
                    padding: `2px ${spacing.sm}`,
                    backgroundColor: '#F3F4F6',
                    color: '#9CA3AF',
                    fontSize: '0.65rem',
                    fontWeight: typography.fontWeight.bold,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderRadius: radii.sm,
                    border: '1px dashed #D1D5DB',
                    whiteSpace: 'nowrap',
                  }}
                >
                  No tier
                </span>
              )}
            </div>
            <div
              style={{
                fontSize: typography.fontSize.sm,
                color: colors.textLight,
                fontFamily: 'monospace',
              }}
            >
              {memberEmail}
            </div>
          </div>

          {/* Summary grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md }}>
            <SummaryField label="Order #" value={shipment.order_number || '—'} />

            {/* Books picked / expected */}
            <div>
              <div
                style={{
                  fontSize: typography.fontSize.xs,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: colors.textLight,
                  marginBottom: spacing.xs,
                  fontWeight: typography.fontWeight.semibold,
                }}
              >
                Books
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: typography.fontSize['2xl'],
                  fontWeight: typography.fontWeight.bold,
                  color: isUnderfilled
                    ? '#B45309'
                    : isFull
                      ? '#065F46'
                      : colors.text,
                }}
              >
                {isUnderfilled && (
                  <span style={{ fontSize: typography.fontSize.sm }} title="Bundle is underfilled">
                    ⚠️
                  </span>
                )}
                {isFull && (
                  <span style={{ fontSize: typography.fontSize.sm, color: '#065F46' }} title="Bundle is complete">
                    ✓
                  </span>
                )}
                {pickedBooks}/{expectedBooks}
              </div>
              {isUnderfilled && (
                <div
                  style={{
                    fontSize: typography.fontSize.xs,
                    color: '#B45309',
                    marginTop: '2px',
                  }}
                >
                  Bundle is short {expectedBooks - pickedBooks} book{expectedBooks - pickedBooks !== 1 ? 's' : ''}
                </div>
              )}
            </div>

            <SummaryField label="Est. weight" value={`${totalWeight} lbs`} />

            {/* Styled status badge */}
            <div>
              <div
                style={{
                  fontSize: typography.fontSize.xs,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: colors.textLight,
                  marginBottom: spacing.xs,
                  fontWeight: typography.fontWeight.semibold,
                }}
              >
                Status
              </div>
              <StatusBadge status={shipment.status} />
            </div>
          </div>
        </section>

        {/* Shipping address */}
        <section
          style={{
            backgroundColor: colors.surface,
            border: `2px solid ${colors.border}`,
            borderRadius: radii.md,
            padding: spacing.lg,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: shadows.sm,
          }}
        >
          <h2
            style={{
              fontSize: typography.fontSize.lg,
              fontWeight: typography.fontWeight.bold,
              color: colors.text,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginTop: 0,
              marginBottom: spacing.md,
            }}
          >
            Ship to
          </h2>

          {shippingAddress ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div
                style={{
                  fontSize: typography.fontSize.base,
                  lineHeight: typography.lineHeight.relaxed,
                  color: colors.text,
                }}
              >
                <div style={{ fontWeight: typography.fontWeight.semibold }}>
                  {shippingAddress.name}
                </div>
                <div>{shippingAddress.street}</div>
                {shippingAddress.street2 && <div>{shippingAddress.street2}</div>}
                <div>
                  {shippingAddress.city}, {shippingAddress.state} {shippingAddress.zip}
                </div>
                {shippingAddress.country && shippingAddress.country !== 'US' && (
                  <div>{shippingAddress.country}</div>
                )}
              </div>

              <div style={{ marginTop: spacing.lg }}>
                <PrintLabelButton
                  fromAddress={RETURN_ADDRESS}
                  toAddress={shippingAddress}
                  orderNumber={shipment.order_number || bundleId.slice(0, 8)}
                />
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: spacing.md,
                borderRadius: radii.sm,
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
              }}
            >
              <div
                style={{
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.semibold,
                  color: '#991B1B',
                  marginBottom: spacing.xs,
                }}
              >
                No shipping address found
              </div>
              <div
                style={{
                  fontSize: typography.fontSize.xs,
                  color: '#B91C1C',
                  lineHeight: typography.lineHeight.normal,
                }}
              >
                This member doesn&apos;t have a shipping address on file. Add one in the Members
                page before shipping this order.
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Buy label / Already shipped */}
      <section
        style={{
          backgroundColor: colors.surface,
          border: `2px solid ${colors.border}`,
          borderRadius: radii.md,
          padding: spacing.lg,
          marginBottom: spacing.lg,
          boxShadow: shadows.sm,
        }}
      >
        <h2
          style={{
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.bold,
            color: colors.text,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginTop: 0,
            marginBottom: spacing.sm,
          }}
        >
          {isAlreadyShipped ? 'Shipment complete' : 'Buy shipping label'}
        </h2>

        {isAlreadyShipped ? (
          <div>
            <div
              style={{
                padding: `${spacing.sm} ${spacing.md}`,
                borderRadius: radii.sm,
                backgroundColor: '#ECFDF5',
                border: '1px solid #A7F3D0',
                fontSize: typography.fontSize.sm,
                color: '#065F46',
                fontWeight: typography.fontWeight.medium,
                marginBottom: spacing.md,
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm,
              }}
            >
              <span style={{ fontSize: typography.fontSize.base }}>✓</span>
              <span>
                This shipment has been shipped.
                {shipment.tracking_number && (
                  <span style={{ fontFamily: 'monospace', marginLeft: spacing.sm }}>
                    Tracking: {shipment.tracking_number}
                  </span>
                )}
                {shipment.carrier && (
                  <span style={{ marginLeft: spacing.sm }}>
                    via {shipment.carrier}
                  </span>
                )}
              </span>
            </div>

            {shipment.label_url && (
              <a
                href={shipment.label_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: spacing.xs,
                  padding: `${spacing.sm} ${spacing.md}`,
                  backgroundColor: colors.surface,
                  color: colors.primary,
                  border: `2px solid ${colors.primary}`,
                  borderRadius: radii.sm,
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.bold,
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                  cursor: 'pointer',
                }}
              >
                Reprint label ↗
              </a>
            )}
          </div>
        ) : shippingAddress ? (
          <>
            <p
              style={{
                fontSize: typography.fontSize.sm,
                color: colors.textLight,
                margin: 0,
                marginBottom: spacing.md,
              }}
            >
              Get USPS rates and purchase a shipping label. The tracking number and label will be saved automatically.
            </p>
            <BuyLabelButton shipmentId={bundleId} />
          </>
        ) : (
          <p
            style={{
              fontSize: typography.fontSize.sm,
              color: colors.textLight,
              margin: 0,
            }}
          >
            Add a shipping address above before buying a label.
          </p>
        )}
      </section>

      {/* ── Interactive Shipping Checklist ─────────────────────── */}
      <ShippingChecklist isAlreadyShipped={isAlreadyShipped} />

      {/* ── Generate Return Label ─────────────────────────────── */}
      {isAlreadyShipped && shipment.member_id && (
        <section
          style={{
            backgroundColor: colors.surface,
            border: `2px solid ${colors.border}`,
            borderRadius: radii.md,
            padding: spacing.lg,
            marginTop: spacing.lg,
            boxShadow: shadows.sm,
          }}
        >
          <h2
            style={{
              fontSize: typography.fontSize.lg,
              fontWeight: typography.fontWeight.bold,
              color: colors.text,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginTop: 0,
              marginBottom: spacing.sm,
            }}
          >
            Return label
          </h2>
          <p
            style={{
              fontSize: typography.fontSize.sm,
              color: colors.textLight,
              margin: 0,
              marginBottom: spacing.md,
            }}
          >
            Generate a prepaid Media Mail return label for this member to send their books back.
          </p>
          <GenerateReturnLabel
            memberId={shipment.member_id}
            shipmentId={bundleId}
            memberName={memberName}
          />
        </section>
      )}
    </div>
  );
}

// ── Progress Stepper ───────────────────────────────────────────────

const STEPS: { key: ShipStep; label: string }[] = [
  { key: 'picked', label: 'Picked' },
  { key: 'pack', label: 'Pack' },
  { key: 'label', label: 'Label' },
  { key: 'shipped', label: 'Shipped' },
];

function ProgressStepper({ currentStep }: { currentStep: ShipStep }) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: spacing.xl,
        padding: `${spacing.md} ${spacing.lg}`,
        backgroundColor: colors.surface,
        border: `2px solid ${colors.border}`,
        borderRadius: radii.md,
        boxShadow: shadows.sm,
      }}
    >
      {STEPS.map((step, i) => {
        const isComplete = i < currentIndex;
        const isCurrent = i === currentIndex;
        const isLast = i === STEPS.length - 1;

        return (
          <div
            key={step.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              flex: isLast ? '0 0 auto' : 1,
            }}
          >
            {/* Step circle + label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: typography.fontSize.xs,
                  fontWeight: typography.fontWeight.bold,
                  flexShrink: 0,
                  backgroundColor: isComplete
                    ? '#065F46'
                    : isCurrent
                      ? colors.secondary
                      : '#F3F4F6',
                  color: isComplete || isCurrent ? '#FFFFFF' : '#9CA3AF',
                  border: isCurrent ? `2px solid ${colors.secondary}` : 'none',
                }}
              >
                {isComplete ? '✓' : i + 1}
              </div>
              <span
                style={{
                  fontSize: typography.fontSize.xs,
                  fontWeight: isCurrent
                    ? typography.fontWeight.bold
                    : typography.fontWeight.medium,
                  color: isComplete
                    ? '#065F46'
                    : isCurrent
                      ? colors.secondary
                      : '#9CA3AF',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  whiteSpace: 'nowrap',
                }}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div
                style={{
                  flex: 1,
                  height: '2px',
                  backgroundColor: isComplete ? '#065F46' : '#E5E7EB',
                  margin: `0 ${spacing.sm}`,
                  minWidth: '20px',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Status Badge ───────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { bg: string; color: string; border: string; label: string }> = {
    picking: {
      bg: '#EFF6FF',
      color: '#1E40AF',
      border: '#BFDBFE',
      label: 'Picking',
    },
    shipping: {
      bg: '#FFFBEB',
      color: '#92400E',
      border: '#FDE68A',
      label: 'Ready to ship',
    },
    shipped: {
      bg: '#ECFDF5',
      color: '#065F46',
      border: '#A7F3D0',
      label: 'Shipped',
    },
  };

  const config = statusConfig[status] || {
    bg: '#F3F4F6',
    color: '#6B7280',
    border: '#D1D5DB',
    label: status,
  };

  return (
    <span
      style={{
        display: 'inline-block',
        padding: `${spacing.xs} ${spacing.sm}`,
        backgroundColor: config.bg,
        color: config.color,
        border: `1px solid ${config.border}`,
        borderRadius: radii.sm,
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.bold,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}
    >
      {config.label}
    </span>
  );
}

// ── Summary Field ──────────────────────────────────────────────────

function SummaryField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: typography.fontSize.xs,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: colors.textLight,
          marginBottom: spacing.xs,
          fontWeight: typography.fontWeight.semibold,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: typography.fontSize.sm,
          fontWeight: typography.fontWeight.semibold,
          color: colors.text,
        }}
      >
        {value}
      </div>
    </div>
  );
}