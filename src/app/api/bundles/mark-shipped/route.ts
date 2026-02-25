import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const bundleId: string = (body.bundleId || '').toString().trim();
    const trackingNumber: string = (body.trackingNumber || '').toString().trim();

    if (!bundleId) {
      return NextResponse.json({ error: 'bundleId is required.' }, { status: 400 });
    }

    if (!trackingNumber) {
      return NextResponse.json({ error: 'Tracking number is required.' }, { status: 400 });
    }

    const supabase = supabaseServer();

    // Verify the shipment exists and is in a shippable state
    const { data: shipment, error: fetchError } = await supabase
      .from('shipments')
      .select('id, status')
      .eq('id', bundleId)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching shipment:', fetchError);
      return NextResponse.json({ error: 'Failed to load shipment.' }, { status: 500 });
    }

    if (!shipment) {
      return NextResponse.json({ error: 'Shipment not found.' }, { status: 404 });
    }

    if (shipment.status === 'shipped') {
      return NextResponse.json({ error: 'Shipment is already marked as shipped.' }, { status: 400 });
    }

    // Update the shipment
    const { error: updateError } = await supabase
      .from('shipments')
      .update({
        status: 'shipped',
        tracking_number: trackingNumber,
        actual_ship_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        updated_at: new Date().toISOString(),
      })
      .eq('id', bundleId);

    if (updateError) {
      console.error('Error updating shipment:', updateError);
      return NextResponse.json({ error: 'Failed to update shipment.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Shipment marked as shipped.',
      shipment_id: bundleId,
      tracking_number: trackingNumber,
    });
  } catch (error) {
    console.error('Error in mark-shipped:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 },
    );
  }
}