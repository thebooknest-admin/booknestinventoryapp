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
    const body = await request.json();
    const { book_title_id } = body;

    if (!book_title_id) {
      return NextResponse.json(
        { error: 'book_title_id is required' },
        { status: 400 }
      );
    }

    // Mark the book as scanned
    const { data, error } = await supabase
      .from('shipment_books')
      .update({
        scanned_at: new Date().toISOString(),
        picked_at: new Date().toISOString()
      })
      .eq('shipment_id', params.id)
      .eq('book_title_id', book_title_id)
      .select();

    if (error) {
      console.error('Error scanning book:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Book not found in this shipment' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Book marked as picked',
      data: data[0]
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}