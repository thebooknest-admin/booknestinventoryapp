import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import {
  fetchBookMetadata,
  isValidIsbn,
  normalizeIsbn,
  suggestAgeTier,
} from '@/lib/intakeBatch';

type Params = { params: Promise<{ batchId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { batchId } = await params;
    const supabase = supabaseServer();
    const body = await request.json();
    const rawIsbn = String(body?.isbn || '');
    const isbn = normalizeIsbn(rawIsbn);

    if (!isValidIsbn(isbn)) {
      return NextResponse.json(
        { error: 'Invalid ISBN format. Use 10 or 13 digits.' },
        { status: 400 }
      );
    }

    const { data: batch, error: batchErr } = await supabase
      .from('intake_batches')
      .select('id, status')
      .eq('id', batchId)
      .maybeSingle();

    if (batchErr) return NextResponse.json({ error: batchErr.message }, { status: 500 });
    if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    if (batch.status !== 'open') {
      return NextResponse.json({ error: 'Batch is not open' }, { status: 400 });
    }

    const { data: dup, error: dupErr } = await supabase
      .from('intake_batch_items')
      .select('id')
      .eq('batch_id', batchId)
      .eq('isbn', isbn)
      .maybeSingle();

    if (dupErr) return NextResponse.json({ error: dupErr.message }, { status: 500 });
    if (dup) {
      return NextResponse.json(
        { error: 'Duplicate in batch', code: 'DUPLICATE_IN_BATCH' },
        { status: 409 }
      );
    }

    const meta = await fetchBookMetadata(isbn);

    const { data: existingTitle, error: existingErr } = await supabase
      .from('book_titles')
      .select('id')
      .eq('isbn', isbn)
      .maybeSingle();

    if (existingErr) return NextResponse.json({ error: existingErr.message }, { status: 500 });

    const suggestedAge = suggestAgeTier(meta);
    const action = existingTitle ? 'increase_qty' : 'create';

    const { data: inserted, error: insertErr } = await supabase
      .from('intake_batch_items')
      .insert({
        batch_id: batchId,
        isbn,
        metadata: meta,
        suggested_age_tier: suggestedAge,
        final_age_tier: suggestedAge,
        action,
        existing_book_id: existingTitle?.id || null,
      })
      .select('*')
      .single();

    if (insertErr) {
      if ((insertErr as { code?: string }).code === '23505') {
        return NextResponse.json(
          { error: 'Duplicate in batch', code: 'DUPLICATE_IN_BATCH' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, item: inserted });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
