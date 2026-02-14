import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

type Context = {
params: Promise<{ batchID: string }>;
};

export async function POST(_req: Request, { params }: Context) {
try {
const { batchID } = await params;

if (!batchID) {
return NextResponse.json({ error: 'batchID is required' }, { status: 400 });
}

const supabase = supabaseServer();
const { data, error } = await supabase.rpc('commit_intake_batch', {
p_batch_id: batchID,
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