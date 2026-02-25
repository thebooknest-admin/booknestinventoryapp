import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { easypost } from '@/lib/easypost';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const shipmentId: string = (body.shipmentId || '').toString().trim();
    const easypostShipmentId: string = (body.easypostShipmentId || '').toString().trim();
    const rateId: string = (body.rateId || '').toString().trim();

    if (!shipmentId || !easypostShipmentId || !rateId) {
      return NextResponse.json(
        { error: 'shipmentId, easypostShipmentId, and rateId are required.' },
        { status: 400 },
      );
    }

    const supabase = supabaseServer();

    // Verify shipment exists and isn't already shipped
    const { data: shipment, error: shipError } = await supabase
      .from('shipments')
      .select('id, status')
      .eq('id', shipmentId)
      .maybeSingle();

    if (shipError || !shipment) {
      return NextResponse.json({ error: 'Shipment not found.' }, { status: 404 });
    }

    if (shipment.status === 'shipped') {
      return NextResponse.json({ error: 'Shipment already shipped.' }, { status: 400 });
    }

    // Buy the label through EasyPost
    const purchased = await easypost.Shipment.buy(easypostShipmentId, rateId);

    const trackingNumber = purchased.tracking_code || null;
    const labelUrl = purchased.postage_label?.label_url || null;
    const carrier = purchased.selected_rate?.carrier || null;
    const service = purchased.selected_rate?.service || null;
    const ratePaid = purchased.selected_rate?.rate || null;

    // Update our shipment record
    const { error: updateError } = await supabase
      .from('shipments')
      .update({
        status: 'shipped',
        tracking_number: trackingNumber,
        label_url: labelUrl,
        carrier: carrier ? `${carrier} ${service || ''}`.trim() : null,
        actual_ship_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      })
      .eq('id', shipmentId);

    if (updateError) {
      console.error('Error updating shipment:', updateError);
      // Label was still purchased — log but don't fail
    }

    return NextResponse.json({
      success: true,
      tracking_number: trackingNumber,
      label_url: labelUrl,
      carrier,
      service,
      rate: ratePaid,
    });
  } catch (error: unknown) {
    console.error('Error buying label:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to buy shipping label.' },
      { status: 500 },
    );
  }
}