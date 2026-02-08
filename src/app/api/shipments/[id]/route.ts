import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const selectWithOrderNumber = `
      id,
      created_at,
      order_number,
      members (
        name,
        tier
      )
    `;

    const selectWithoutOrderNumber = `
      id,
      created_at,
      members (
        name,
        tier
      )
    `;

    const { data: initialData, error: initialError } = await supabase
      .from('shipments')
      .select(selectWithOrderNumber)
      .eq('id', params.id)
      .single();

    let data = initialData as typeof initialData & { order_number?: number | string | null };
    let error = initialError;

    if (error && error.message?.includes('order_number')) {
      const fallback = await supabase
        .from('shipments')
        .select(selectWithoutOrderNumber)
        .eq('id', params.id)
        .single();
      data = fallback.data as typeof data;
      error = fallback.error;
    }

    if (error || !data) {
      console.error('Error fetching shipment:', error);
      return NextResponse.json({ error: error?.message || 'Shipment not found' }, { status: 500 });
    }

    const member = Array.isArray(data.members) ? data.members[0] : data.members;
    const orderNumber = data.order_number ?? null;

    return NextResponse.json({
      id: data.id,
      orderNumber,
      memberName: member?.name || 'Unknown',
      tier: member?.tier || '',
      createdAt: data.created_at,
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}