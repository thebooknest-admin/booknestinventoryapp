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
    
    const { data, error } = await supabase.rpc('get_shipment_pick_list', {
      p_shipment_id: params.id
    });
    
    if (error) {
      console.error('Error fetching pick list:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const pickList = (data || []) as Array<{
      book_title_id: string;
      bin_id: string | null;
      bin_label: string | null;
      instruction: string | null;
      book_to_find: string | null;
      status: string | null;
      scanned_at: string | null;
    }>;

    const bookTitleIds = pickList.map((item) => item.book_title_id).filter(Boolean);
    const { data: books, error: booksError } = await supabase
      .from('book_titles')
      .select('id, sku')
      .in('id', bookTitleIds);

    if (booksError) {
      console.error('Error fetching book SKUs:', booksError);
      return NextResponse.json({ error: booksError.message }, { status: 500 });
    }

    const skuById = new Map((books || []).map((book: { id: string; sku: string | null }) => [book.id, book.sku]));

    const isUuid = (value: string | null) =>
      Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));

    const enriched = pickList.map((item) => ({
      ...item,
      book_sku: skuById.get(item.book_title_id) || null,
      bin_code: isUuid(item.bin_id) ? item.bin_label : item.bin_id || item.bin_label || null,
    }));

    return NextResponse.json(enriched);
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}