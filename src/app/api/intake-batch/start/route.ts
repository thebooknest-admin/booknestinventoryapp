import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function POST() {
  try {
    const supabase = supabaseServer();

    const { data: existing, error: existingErr } = await supabase
      .from('intake_batches')
      .select('id, status, created_at')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingErr) return NextResponse.json({ error: existingErr.message }, { status: 500 });

    if (existing) {
      return NextResponse.json({ ok: true, batch: existing, reused: true });
    }

    const { data: created, error: createErr } = await supabase
      .from('intake_batches')
      .insert({ status: 'open' })
      .select('id, status, created_at')
      .single();

    if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, batch: created, reused: false });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
