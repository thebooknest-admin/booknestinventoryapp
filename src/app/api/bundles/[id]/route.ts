import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type BookQueryResult = {
  book_id: string;
  books: {
    sku: string;
    title: string;
    author: string;
    bin: string;
  };
};

type BundleQueryResult = {
  bundle_id: string;
  order_number: string;
  books_to_pick: number;
  created_at: string;
  members: {
    name: string;
    tier: string;
  }[];
  bundle_books: BookQueryResult[];
};

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;

    const { data, error } = await supabase
      .from('bundles')
      .select(`
        bundle_id,
        order_number,
        books_to_pick,
        created_at,
        members (
          name,
          tier
        ),
        bundle_books (
          book_id,
          books (
            sku,
            title,
            author,
            bin
          )
        )
      `)
      .eq('bundle_id', params.id)
      .single();

    if (error) {
      console.error('Error fetching bundle:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const typedData = data as unknown as BundleQueryResult;
    const member = Array.isArray(typedData.members) ? typedData.members[0] : typedData.members;

    // Transform the data to match what the frontend expects
    const books = typedData.bundle_books.map(bb => ({
      book_id: bb.book_id,
      book_sku: bb.books.sku,
      title: bb.books.title,
      author: bb.books.author,
      bin: bb.books.bin,
      instruction: `Go to Fledglings shelf → BIN ${bb.books.bin}`,
    }));

    return NextResponse.json({
      bundle_id: typedData.bundle_id,
      order_number: typedData.order_number,
      member_name: member?.name || 'Unknown',
      tier: member?.tier || '',
      books_to_pick: typedData.books_to_pick,
      created_at: typedData.created_at,
      books: books,
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}