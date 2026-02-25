import Link from 'next/link';
import { colors, typography, spacing, radii } from '@/styles/tokens';
import { supabaseServer } from '@/lib/supabaseServer';
import MarkAsShippedButton from '@/components/MarkAsShippedButton';
import PrintLabelButton from '@/components/PrintLabelButton';
import HomeButton from '@/components/HomeButton';

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

  // If there is no shipment at all, show a friendly message
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
          <p
            style={{
              margin: 0,
              fontSize: typography.fontSize.sm,
              color: colors.text,
            }}
          >
            This shipment could not be found or loaded. It may be a test row, or it may have
            been removed.
          </p>
        </div>
      </div>
    );
  }

  // Load member
  let memberName = 'Member';
  let memberEmail = '—';

  if (shipment.member_id) {
    const { data: memberData } = await supabase
      .from('members')
      .select('name, email')
      .eq('id', shipment.member_id)
      .maybeSingle();

    if (memberData) {
      memberName = memberData.name || memberName;
      memberEmail = memberData.email || memberEmail;
    }
  }

  // Load shipping address: try shipment.address_id first, fall back to member default
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

  // Fallback: member's default address
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

  // Count books in this shipment
  const { count: bookCount } = await supabase
    .from('shipment_books')
    .select('id', { count: 'exact', head: true })
    .eq('shipment_id', bundleId);

  const books = bookCount ?? 0;
  const totalWeight = (books * 0.5).toFixed(1);

  const isAlreadyShipped = shipment.status === 'shipped';

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
              Review the order, confirm packing, then mark this bundle as shipped.
            </p>
          </div>
          <HomeButton />
        </div>
      </header>

      {/* Order summary + Address — side by side */}
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
                fontSize: typography.fontSize.base,
                fontWeight: typography.fontWeight.semibold,
                color: colors.text,
              }}
            >
              {memberName}
            </div>
            <div
              style={{
                fontSize: typography.fontSize.sm,
                color: colors.textLight,
                marginTop: spacing.xs,
                fontFamily: 'monospace',
              }}
            >
              {memberEmail}
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: spacing.md,
            }}
          >
            <SummaryField label="Order #" value={shipment.order_number || '—'} />
            <SummaryField label="Books" value={`${books}`} emphasize />
            <SummaryField label="Est. weight" value={`${totalWeight} lbs`} />
            <SummaryField label="Status" value={shipment.status} />
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
                fontSize: typography.fontSize.sm,
                color: '#991B1B',
              }}
            >
              No shipping address found for this member. Please add an address before
              shipping.
            </div>
          )}
        </section>
      </div>

      {/* Mark as shipped */}
      <section
        style={{
          backgroundColor: colors.surface,
          border: `2px solid ${colors.border}`,
          borderRadius: radii.md,
          padding: spacing.lg,
          marginBottom: spacing.lg,
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
          Mark as shipped
        </h2>

        {isAlreadyShipped ? (
          <div
            style={{
              padding: `${spacing.sm} ${spacing.md}`,
              borderRadius: radii.sm,
              backgroundColor: '#ECFDF5',
              fontSize: typography.fontSize.sm,
              color: '#065F46',
              fontWeight: typography.fontWeight.medium,
            }}
          >
            ✓ This shipment has been marked as shipped.
            {shipment.tracking_number && (
              <span style={{ fontFamily: 'monospace', marginLeft: spacing.sm }}>
                Tracking: {shipment.tracking_number}
              </span>
            )}
          </div>
        ) : (
          <>
            <p
              style={{
                fontSize: typography.fontSize.sm,
                color: colors.textLight,
                margin: 0,
                marginBottom: spacing.md,
              }}
            >
              Enter the tracking number and mark this bundle as shipped.
            </p>
            <MarkAsShippedButton bundleId={bundleId} />
          </>
        )}
      </section>

      {/* Shipping checklist */}
      <section
        style={{
          backgroundColor: colors.goldenHoney + '20',
          border: `2px solid ${colors.goldenHoney}`,
          borderRadius: radii.md,
          padding: spacing.lg,
        }}
      >
        <h3
          style={{
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.bold,
            color: colors.deepCocoa,
            margin: 0,
            marginBottom: spacing.sm,
          }}
        >
          Shipping checklist
        </h3>
        <ul
          style={{
            margin: 0,
            paddingLeft: spacing.lg,
            color: colors.text,
            fontSize: typography.fontSize.sm,
            lineHeight: typography.lineHeight.relaxed,
          }}
        >
          <li>Verify all books are packed</li>
          <li>Include packing slip</li>
          <li>Seal package securely</li>
          <li>Apply shipping label with correct address</li>
          <li>Enter tracking number above</li>
        </ul>
      </section>
    </div>
  );
}

function SummaryField({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
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
          fontSize: emphasize ? typography.fontSize['2xl'] : typography.fontSize.sm,
          fontWeight: emphasize
            ? typography.fontWeight.bold
            : typography.fontWeight.semibold,
          color: colors.text,
        }}
      >
        {value}
      </div>
    </div>
  );
}