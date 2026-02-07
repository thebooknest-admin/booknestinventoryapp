import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    
    // Check if all books are picked
    const { data: books, error: booksError } = await supabase
      .from('shipment_books')
      .select('scanned_at')
      .eq('shipment_id', params.id);

    if (booksError) {
      return NextResponse.json({ error: booksError.message }, { status: 500 });
    }

    const allPicked = books?.every(book => book.scanned_at !== null);

    if (!allPicked) {
      return NextResponse.json(
        { error: 'Not all books have been picked yet' },
        { status: 400 }
      );
    }

    // Update shipment status to shipping
    const { data, error } = await supabase
      .from('shipments')
      .update({
        status: 'shipping',
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select();

    if (error) {
      console.error('Error completing shipment:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Shipment moved to shipping queue',
      data: data[0]
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}