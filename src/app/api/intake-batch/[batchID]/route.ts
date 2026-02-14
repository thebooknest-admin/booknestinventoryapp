import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { normalizeIsbn } from '@/lib/intakeBatch';

type Params = { params: Promise<{ batchID: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const { batchID } = await params;
    const supabase = supabaseServer();

    const { data: batch, error: batchErr } = await supabase
      .from('intake_batches')
      .select('*')
      .eq('id', batchID)
      .maybeSingle();

    if (batchErr) return NextResponse.json({ error: batchErr.message }, { status: 500 });
    if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 });

    const { data: items, error: itemsErr } = await supabase
      .from('intake_batch_items')
      .select('*')
      .eq('batch_id', batchID)
      .order('created_at', { ascending: true });

    if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, batch, items: items || [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { batchID } = await params;
    const body = await request.json();
    const itemId = String(body?.itemId || '');

    if (!itemId) return NextResponse.json({ error: 'itemId is required' }, { status: 400 });

    const patch: Record<string, unknown> = {};
    if (typeof body.final_age_tier === 'string') patch.final_age_tier = body.final_age_tier;
    if (typeof body.final_bin === 'string') patch.final_bin = body.final_bin;
    if (typeof body.action === 'string') patch.action = body.action;
    if (typeof body.qty === 'number') patch.qty = body.qty;
    if (typeof body.isbn === 'string') patch.isbn = normalizeIsbn(body.isbn);

    const supabase = supabaseServer();
    const { data, error } = await supabase
      .from('intake_batch_items')
      .update(patch)
      .eq('id', itemId)
      .eq('batch_id', batchID)
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, item: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    const { batchID } = await params;
    const supabase = supabaseServer();

    const { error } = await supabase
      .from('intake_batches')
      .update({ status: 'cancelled' })
      .eq('id', batchID)
      .eq('status', 'open');

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
