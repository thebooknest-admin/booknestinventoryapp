import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

type Context = {
params: { batchID?: string; batchId?: string };
};

export async function POST(_req: Request, context: Context) {
try {
const batchId = context.params.batchID ?? context.params.batchId;

if (!batchId) {
return NextResponse.json({ error: 'batchId is required' }, { status: 400 });
}

const supabase = supabaseServer();
const { data, error } = await supabase.rpc('commit_intake_batch', {
p_batch_id: batchId,
});

if (error) {
return NextResponse.json({ error: error.message }, { status: 500 });
}

return NextResponse.json({ ok: true, summary: data });
} catch (error) {
return NextResponse.json(
{ error: error instanceof Error ? error.message : 'Unknown error' },
{ status: 500 }
);
}
}