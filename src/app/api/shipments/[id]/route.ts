import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Define the type for the query result
type ShipmentQueryResult = {
  id: string;
  created_at: string;
  members: {
    name: string;
    tier: string;
  }[];
};

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;

    const { data, error } = await supabase
      .from('shipments')
      .select(
        `
        id,
        created_at,
        members (
          name,
          tier
        )
      `
      )
      .eq('id', params.id)
      .single();

    if (error) {
      console.error('Error fetching shipment:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const typedData = data as unknown as ShipmentQueryResult;
    const member = Array.isArray(typedData.members) ? typedData.members[0] : typedData.members;

    return NextResponse.json({
      id: typedData.id,
      memberName: member?.name || 'Unknown',
      tier: member?.tier || '',
      createdAt: typedData.created_at,
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}