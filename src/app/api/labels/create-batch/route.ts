import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

type LabelRow = {
  id: string;
  title: string;
  sku: string;
  bin_code: string;
  qr_value: string;
  batch_id: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const limitCount = Number(body?.limitCount ?? 20);

    const supabase = supabaseServer();
    const { data, error } = await supabase.rpc('create_label_batch', {
      limit_count: Number.isFinite(limitCount) ? limitCount : 20,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = (data || []) as LabelRow[];
    const batchId = rows[0]?.batch_id || null;

    return NextResponse.json({ ok: true, batchId, rows, count: rows.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
