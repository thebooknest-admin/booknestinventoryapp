import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { easypost } from '@/lib/easypost';

export const dynamic = 'force-dynamic';

const RETURN_TO_ADDRESS = {
  company: 'The Book Nest, LLC',
  street1: 'PO Box 8',
  city: 'Ranson',
  state: 'WV',
  zip: '25438',
  country: 'US',
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const memberId: string = (body.memberId || '').toString().trim();
    const shipmentId: string = (body.shipmentId || '').toString().trim();

    if (!memberId) {
      return NextResponse.json({ error: 'memberId is required.' }, { status: 400 });
    }

    const supabase = supabaseServer();

    // Load member info
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id, name, email, tier')
      .eq('id', memberId)
      .maybeSingle();

    if (memberError || !member) {
      return NextResponse.json({ error: 'Member not found.' }, { status: 404 });
    }

    // Load member's address
    let address = null;

    if (shipmentId) {
      // Try to get address from the original shipment
      const { data: shipment } = await supabase
        .from('shipments')
        .select('address_id')
        .eq('id', shipmentId)
        .maybeSingle();

      if (shipment?.address_id) {
        const { data: addr } = await supabase
          .from('member_addresses')
          .select('street, street2, city, state, zip, country')
          .eq('id', shipment.address_id)
          .maybeSingle();
        address = addr;
      }
    }

    // Fall back to default address
    if (!address) {
      const { data: addr } = await supabase
        .from('member_addresses')
        .select('street, street2, city, state, zip, country')
        .eq('member_id', memberId)
        .eq('is_default', true)
        .maybeSingle();
      address = addr;
    }

    if (!address) {
      return NextResponse.json(
        { error: 'No shipping address found for this member.' },
        { status: 400 }
      );
    }

    // Count books for weight estimate (if shipmentId provided)
    let bookCount = 4; // default estimate
    if (shipmentId) {
      const { count } = await supabase
        .from('shipment_books')
        .select('id', { count: 'exact', head: true })
        .eq('shipment_id', shipmentId);
      if (count) bookCount = count;
    }

    const weightOz = bookCount * 8; // ~8oz per book

    // Create EasyPost shipment (member → Book Nest)
    const epShipment = await easypost.Shipment.create({
      from_address: {
        name: member.name || 'Member',
        street1: address.street,
        street2: address.street2 || undefined,
        city: address.city,
        state: address.state,
        zip: address.zip,
        country: address.country || 'US',
      },
      to_address: RETURN_TO_ADDRESS,
      parcel: {
        length: 12,
        width: 9,
        height: Math.max(1, Math.ceil(bookCount * 0.5)),
        weight: weightOz,
      },
      options: {
        special_rates_eligibility: 'USPS.MEDIAMAIL',
        label_format: 'PDF',
        label_size: '4x6',
      },
    });

    // Find Media Mail rate
    const mediaRate = (epShipment.rates || []).find(
      (r: { service: string }) => r.service === 'MediaMail'
    );

    if (!mediaRate) {
      // Fall back to cheapest rate
      const cheapestRate = (epShipment.rates || []).sort(
        (a: { rate: string }, b: { rate: string }) =>
          parseFloat(a.rate) - parseFloat(b.rate)
      )[0];

      if (!cheapestRate) {
        return NextResponse.json(
          { error: 'No shipping rates available for this return.' },
          { status: 400 }
        );
      }

      // Buy cheapest rate
      const purchased = await easypost.Shipment.buy(epShipment.id, cheapestRate.id);
      const result = await saveReturn(supabase, {
        memberId,
        shipmentId: shipmentId || null,
        trackingNumber: purchased.tracking_code || null,
        labelUrl: purchased.postage_label?.label_url || null,
        carrier: `${purchased.selected_rate?.carrier || ''} ${purchased.selected_rate?.service || ''}`.trim(),
        cost: purchased.selected_rate?.rate || null,
      });

      return NextResponse.json(result);
    }

    // Buy Media Mail
    const purchased = await easypost.Shipment.buy(epShipment.id, mediaRate.id);

    const result = await saveReturn(supabase, {
      memberId,
      shipmentId: shipmentId || null,
      trackingNumber: purchased.tracking_code || null,
      labelUrl: purchased.postage_label?.label_url || null,
      carrier: `${purchased.selected_rate?.carrier || ''} ${purchased.selected_rate?.service || ''}`.trim(),
      cost: purchased.selected_rate?.rate || null,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Return label error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate return label.' },
      { status: 500 }
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function saveReturn(supabase: any, data: {
  memberId: string;
  shipmentId: string | null;
  trackingNumber: string | null;
  labelUrl: string | null;
  carrier: string;
  cost: string | null;
}) {
  // Generate return number
  const returnNumber = `RET-${Date.now().toString(36).toUpperCase()}`;

  const { data: returnRow, error: insertError } = await supabase
    .from('returns')
    .insert({
      member_id: data.memberId,
      original_shipment_id: data.shipmentId,
      return_number: returnNumber,
      status: 'label_created',
      return_type: 'swap',
      return_tracking_number: data.trackingNumber,
      return_label_url: data.labelUrl,
      return_label_generated_at: new Date().toISOString(),
      shipping_cost: data.cost ? parseFloat(data.cost) : null,
      expected_return_date: new Date(
        Date.now() + 14 * 24 * 60 * 60 * 1000
      ).toISOString().split('T')[0], // ~2 weeks for Media Mail
      notes: `Return label generated. ${data.carrier} — $${data.cost || '0.00'}`,
    })
    .select('id, return_number')
    .single();

  if (insertError) {
    console.error('Error saving return:', insertError);
  }

  return {
    success: true,
    returnId: returnRow?.id || null,
    returnNumber: returnRow?.return_number || returnNumber,
    trackingNumber: data.trackingNumber,
    labelUrl: data.labelUrl,
    carrier: data.carrier,
    cost: data.cost,
  };
}