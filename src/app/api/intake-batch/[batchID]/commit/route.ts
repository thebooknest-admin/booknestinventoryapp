import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

type Params = { params: Promise<{ batchId: string }> };

export async function POST(_: Request, { params }: Params) {
  try {
    const { batchId } = await params;
    const supabase = supabaseServer();

    const { data, error } = await supabase.rpc('commit_intake_batch', {
      p_batch_id: batchId,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, summary: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
