import Link from 'next/link';
import { colors, typography, spacing, radii } from '@/styles/tokens';
import { supabaseServer } from '@/lib/supabaseServer';
import HomeButton from '@/components/HomeButton';
import BatchShippingClient from '@/components/BatchShippingClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const TIER_CONFIG: Record<string, { label: string; books: number; weight: number; order: number }> = {
  'little-nest': { label: 'Little Nest', books: 4, weight: 2.0, order: 1 },
  'cozy-nest': { label: 'Cozy Nest', books: 6, weight: 3.0, order: 2 },
  'story-nest': { label: 'Story Nest', books: 8, weight: 4.0, order: 3 },
};

export interface BatchShipment {
  id: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  orderNumber: string | null;
  tier: string;
  tierLabel: string;
  status: string;
  bookCount: number;
  weight: number;
  addressId: string | null;
  hasAddress: boolean;
  trackingNumber: string | null;
  labelUrl: string | null;
  carrier: string | null;
  scheduledShipDate: string | null;
}

export default async function BatchShippingPage() {
  const supabase = supabaseServer();

  // Load all shipments that are ready to ship OR recently shipped
  const { data: shipments, error: shipError } = await supabase
    .from('shipments')
    .select('id, member_id, order_number, status, address_id, tracking_number, label_url, carrier, scheduled_ship_date')
    .in('status', ['pending', 'picking', 'packing', 'ready', 'shipping', 'shipped'])
    .order('created_at', { ascending: true });

  if (shipError) {
    console.error('Error loading shipments:', shipError);
  }

  const allShipments = shipments || [];

  // Get member info
  const memberIds = [...new Set(allShipments.map((s) => s.member_id).filter(Boolean))];
  const { data: members } = await supabase
    .from('members')
    .select('id, name, email, tier')
    .in('id', memberIds.length ? memberIds : ['__none__']);

  const memberMap = new Map(members?.map((m) => [m.id, m]) || []);

  // Check which shipments have addresses
  const addressIds = allShipments.map((s) => s.address_id).filter(Boolean);
  const { data: addressCheck } = await supabase
    .from('member_addresses')
    .select('id')
    .in('id', addressIds.length ? addressIds : ['__none__']);

  const validAddressIds = new Set(addressCheck?.map((a) => a.id) || []);

  // Check for default addresses for shipments without address_id
  const membersNeedingDefault = allShipments
    .filter((s) => !s.address_id && s.member_id)
    .map((s) => s.member_id);

  let defaultAddressMembers = new Set<string>();
  if (membersNeedingDefault.length) {
    const { data: defaultAddrs } = await supabase
      .from('member_addresses')
      .select('member_id')
      .in('member_id', membersNeedingDefault)
      .eq('is_default', true);

    defaultAddressMembers = new Set(defaultAddrs?.map((a) => a.member_id) || []);
  }

  // Get book counts
  const shipmentIds = allShipments.map((s) => s.id);
  const { data: bookRows } = await supabase
    .from('shipment_books')
    .select('shipment_id')
    .in('shipment_id', shipmentIds.length ? shipmentIds : ['__none__']);

  const bookCountMap = new Map<string, number>();
  bookRows?.forEach((b) => {
    bookCountMap.set(b.shipment_id, (bookCountMap.get(b.shipment_id) || 0) + 1);
  });

  // Build enriched shipments
  const enriched: BatchShipment[] = allShipments.map((s) => {
    const member = memberMap.get(s.member_id);
    const tier = member?.tier || 'little-nest';
    const tierConfig = TIER_CONFIG[tier] || TIER_CONFIG['little-nest'];
    const hasAddress = s.address_id
      ? validAddressIds.has(s.address_id)
      : defaultAddressMembers.has(s.member_id);

    return {
      id: s.id,
      memberId: s.member_id,
      memberName: member?.name || 'Unknown',
      memberEmail: member?.email || '',
      orderNumber: s.order_number,
      tier,
      tierLabel: tierConfig.label,
      status: s.status || 'pending',
      bookCount: bookCountMap.get(s.id) || 0,
      weight: tierConfig.weight,
      addressId: s.address_id,
      hasAddress,
      trackingNumber: s.tracking_number,
      labelUrl: s.label_url,
      carrier: s.carrier,
      scheduledShipDate: s.scheduled_ship_date,
    };
  });

  // Group by tier
  const tiers = Object.entries(TIER_CONFIG)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([key, config]) => {
      const tierShipments = enriched.filter((s) => s.tier === key);
      const readyToShip = tierShipments.filter((s) => s.status !== 'shipped');
      const shipped = tierShipments.filter((s) => s.status === 'shipped');

      return {
        key,
        label: config.label,
        books: config.books,
        weight: config.weight,
        readyCount: readyToShip.length,
        shippedCount: shipped.length,
        shipments: tierShipments,
      };
    });

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: spacing.xl,
        maxWidth: '1200px',
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
              Batch shipping
            </h1>
            <p
              style={{
                margin: 0,
                marginTop: spacing.xs,
                fontSize: typography.fontSize.sm,
                color: colors.textLight,
              }}
            >
              Select a tier, choose a shipping service, and buy all labels at once.
            </p>
          </div>
          <HomeButton />
        </div>
      </header>

      <BatchShippingClient tiers={tiers} />
    </div>
  );
}