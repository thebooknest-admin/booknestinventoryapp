import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { easypost } from '@/lib/easypost';

export const dynamic = 'force-dynamic';

interface BuyRequest {
  shipmentId: string;
  easypostShipmentId: string;
  rateId: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const purchases: BuyRequest[] = body.purchases || [];

    if (!purchases.length) {
      return NextResponse.json(
        { error: 'No purchases provided.' },
        { status: 400 },
      );
    }

    const supabase = supabaseServer();

    // Process all label purchases in parallel
    const results = await Promise.allSettled(
      purchases.map(async (p) => {
        // Buy the label
        const purchased = await easypost.Shipment.buy(p.easypostShipmentId, p.rateId);

        const trackingNumber = purchased.tracking_code || null;
        const labelUrl = purchased.postage_label?.label_url || null;
        const carrier = purchased.selected_rate?.carrier || null;
        const service = purchased.selected_rate?.service || null;
        const ratePaid = purchased.selected_rate?.rate || null;

        // Update shipment in Supabase
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
          .eq('id', p.shipmentId);

        if (updateError) {
          console.error(`Error updating shipment ${p.shipmentId}:`, updateError);
        }

        return {
          shipmentId: p.shipmentId,
          trackingNumber,
          labelUrl,
          carrier,
          service,
          rate: ratePaid,
        };
      }),
    );

    const successful = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map((r) => r.value);

    const failed = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map((r, i) => ({
        shipmentId: purchases[i]?.shipmentId,
        reason: r.reason?.message || 'Failed to buy label',
      }));

    return NextResponse.json({
      purchased: successful,
      errors: failed,
      labelUrls: successful.map((s) => s.labelUrl).filter(Boolean),
    });
  } catch (error: unknown) {
    console.error('Batch buy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to buy batch labels.' },
      { status: 500 },
    );
  }
}