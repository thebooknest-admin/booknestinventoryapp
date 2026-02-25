import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { easypost } from '@/lib/easypost';

export const dynamic = 'force-dynamic';

const FROM_ADDRESS = {
  company: 'The Book Nest, LLC',
  street1: 'PO Box 8',
  city: 'Ranson',
  state: 'WV',
  zip: '25438',
  country: 'US',
};

// Approximate weight per book in ounces
const OZ_PER_BOOK = 8;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const shipmentId: string = (body.shipmentId || '').toString().trim();

    if (!shipmentId) {
      return NextResponse.json({ error: 'shipmentId is required.' }, { status: 400 });
    }

    const supabase = supabaseServer();

    // Load shipment
    const { data: shipment, error: shipError } = await supabase
      .from('shipments')
      .select('id, member_id, address_id')
      .eq('id', shipmentId)
      .maybeSingle();

    if (shipError || !shipment) {
      return NextResponse.json({ error: 'Shipment not found.' }, { status: 404 });
    }

    // Load shipping address
    let address = null;

    if (shipment.address_id) {
      const { data } = await supabase
        .from('member_addresses')
        .select('street, street2, city, state, zip, country')
        .eq('id', shipment.address_id)
        .maybeSingle();
      address = data;
    }

    if (!address && shipment.member_id) {
      const { data } = await supabase
        .from('member_addresses')
        .select('street, street2, city, state, zip, country')
        .eq('member_id', shipment.member_id)
        .eq('is_default', true)
        .maybeSingle();
      address = data;
    }

    if (!address) {
      return NextResponse.json({ error: 'No shipping address found.' }, { status: 400 });
    }

    // Load member name
    let memberName = 'Member';
    if (shipment.member_id) {
      const { data: member } = await supabase
        .from('members')
        .select('name')
        .eq('id', shipment.member_id)
        .maybeSingle();
      if (member?.name) memberName = member.name;
    }

    // Count books for weight estimate
    const { count } = await supabase
      .from('shipment_books')
      .select('id', { count: 'exact', head: true })
      .eq('shipment_id', shipmentId);

    const bookCount = count ?? 1;
    const weightOz = bookCount * OZ_PER_BOOK;

    // Create EasyPost shipment to get rates
    const epShipment = await easypost.Shipment.create({
      from_address: FROM_ADDRESS,
      to_address: {
        name: memberName,
        street1: address.street,
        street2: address.street2 || undefined,
        city: address.city,
        state: address.state,
        zip: address.zip,
        country: address.country || 'US',
      },
      parcel: {
        // Standard padded mailer / small box dimensions
        length: 12,
        width: 9,
        height: Math.max(1, Math.ceil(bookCount * 0.5)),
        weight: weightOz,
      },
    });

    // Format rates for the frontend
    const rates = (epShipment.rates || [])
      .map((rate: { id: string; carrier: string; service: string; rate: string; currency: string; delivery_days: number | null; delivery_date: string | null }) => ({
        id: rate.id,
        carrier: rate.carrier,
        service: rate.service,
        rate: rate.rate,
        currency: rate.currency,
        delivery_days: rate.delivery_days,
        est_delivery_date: rate.delivery_date,
      }))
      .sort((a: { rate: string }, b: { rate: string }) => parseFloat(a.rate) - parseFloat(b.rate));

    return NextResponse.json({
      easypost_shipment_id: epShipment.id,
      rates,
      book_count: bookCount,
      weight_oz: weightOz,
    });
  } catch (error: unknown) {
    console.error('Error getting rates:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get shipping rates.' },
      { status: 500 },
    );
  }
}