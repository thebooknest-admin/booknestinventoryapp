import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { easypost } from '@/lib/easypost';

export const dynamic = 'force-dynamic';

const RETURN_ADDRESS = {
  company: 'The Book Nest, LLC',
  street1: 'PO Box 8',
  city: 'Ranson',
  state: 'WV',
  zip: '25438',
  country: 'US',
};

const TIER_WEIGHTS: Record<string, number> = {
  'little-nest': 2.0,
  'cozy-nest': 3.0,
  'story-nest': 4.0,
};

interface ShipmentWithDetails {
  id: string;
  member_id: string;
  order_number: string | null;
  member_name: string;
  member_email: string;
  tier: string;
  address: {
    name: string;
    street1: string;
    street2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  weight: number;
  bookCount: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const shipmentIds: string[] = body.shipmentIds || [];

    if (!shipmentIds.length) {
      return NextResponse.json(
        { error: 'No shipment IDs provided.' },
        { status: 400 },
      );
    }

    const supabase = supabaseServer();

    // Load all selected shipments with member + address info
    const { data: shipments, error: shipError } = await supabase
      .from('shipments')
      .select('id, member_id, order_number, status, address_id')
      .in('id', shipmentIds)
      .neq('status', 'shipped');

    if (shipError || !shipments?.length) {
      return NextResponse.json(
        { error: 'No valid shipments found.' },
        { status: 404 },
      );
    }

    // Get member info for all shipments
    const memberIds = [...new Set(shipments.map((s) => s.member_id).filter(Boolean))];
    const { data: members } = await supabase
      .from('members')
      .select('id, name, email, tier')
      .in('id', memberIds);

    const memberMap = new Map(members?.map((m) => [m.id, m]) || []);

    // Get addresses
    const addressIds = shipments.map((s) => s.address_id).filter(Boolean);
    const { data: addresses } = await supabase
      .from('member_addresses')
      .select('id, member_id, street, street2, city, state, zip, country')
      .in('id', addressIds);

    const addressMap = new Map(addresses?.map((a) => [a.id, a]) || []);

    // Also get default addresses for shipments without address_id
    const membersNeedingDefault = shipments
      .filter((s) => !s.address_id && s.member_id)
      .map((s) => s.member_id);

    let defaultAddressMap = new Map();
    if (membersNeedingDefault.length) {
      const { data: defaultAddrs } = await supabase
        .from('member_addresses')
        .select('id, member_id, street, street2, city, state, zip, country')
        .in('member_id', membersNeedingDefault)
        .eq('is_default', true);

      defaultAddressMap = new Map(defaultAddrs?.map((a) => [a.member_id, a]) || []);
    }

    // Get book counts per shipment
    const { data: bookCounts } = await supabase
      .from('shipment_books')
      .select('shipment_id')
      .in('shipment_id', shipmentIds);

    const countMap = new Map<string, number>();
    bookCounts?.forEach((b) => {
      countMap.set(b.shipment_id, (countMap.get(b.shipment_id) || 0) + 1);
    });

    // Build enriched shipment objects
    const enriched: ShipmentWithDetails[] = [];
    const errors: { shipmentId: string; reason: string }[] = [];

    for (const s of shipments) {
      const member = memberMap.get(s.member_id);
      if (!member) {
        errors.push({ shipmentId: s.id, reason: 'Member not found' });
        continue;
      }

      const addr = s.address_id
        ? addressMap.get(s.address_id)
        : defaultAddressMap.get(s.member_id);

      if (!addr) {
        errors.push({ shipmentId: s.id, reason: 'No shipping address' });
        continue;
      }

      const tier = member.tier || 'little-nest';
      const books = countMap.get(s.id) || 0;
      const weight = TIER_WEIGHTS[tier] || 2.0;

      enriched.push({
        id: s.id,
        member_id: s.member_id,
        order_number: s.order_number,
        member_name: member.name || 'Unknown',
        member_email: member.email || '',
        tier,
        address: {
          name: member.name || 'Member',
          street1: addr.street,
          street2: addr.street2 || undefined,
          city: addr.city,
          state: addr.state,
          zip: addr.zip,
          country: addr.country || 'US',
        },
        weight,
        bookCount: books,
      });
    }

    // Create EasyPost shipments and get rates
    const results = await Promise.allSettled(
      enriched.map(async (item) => {
        const epShipment = await easypost.Shipment.create({
          from_address: RETURN_ADDRESS,
          to_address: item.address,
          parcel: {
            length: 12,
            width: 9,
            height: Math.max(1, Math.ceil(item.bookCount * 0.5)),
            weight: item.weight * 16, // lbs to oz
          },
          options: {
            special_rates_eligibility: 'USPS.MEDIAMAIL',
            label_format: 'PDF',
            label_size: '4x6',
          },
        });

        return {
          shipmentId: item.id,
          easypostShipmentId: epShipment.id,
          memberName: item.member_name,
          orderNumber: item.order_number,
          tier: item.tier,
          bookCount: item.bookCount,
          weight: item.weight,
          rates: (epShipment.rates || []).map((r: { id: string; service: string; carrier: string; rate: string; delivery_days: number | null }) => ({
            id: r.id,
            service: r.service,
            carrier: r.carrier,
            rate: r.rate,
            delivery_days: r.delivery_days,
          })),
        };
      }),
    );

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const successful = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map((r) => r.value);

    const failed = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map((r, i) => ({
        shipmentId: enriched[i]?.id,
        reason: r.reason?.message || 'Failed to create EasyPost shipment',
      }));
    /* eslint-enable @typescript-eslint/no-explicit-any */

    return NextResponse.json({
      shipments: successful,
      errors: [...errors, ...failed],
    });
  } catch (error: unknown) {
    console.error('Batch rates error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get batch rates.' },
      { status: 500 },
    );
  }
}