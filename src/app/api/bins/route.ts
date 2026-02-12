import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function GET(request: NextRequest) {
    try {
const ageGroup = request.nextUrl.searchParams.get('ageGroup');

const supabase = supabaseServer();

let query = supabase
.from('bins')
.select('bin_code, display_name, age_group, theme')
.eq('is_active', true)
.order('display_name', { ascending: true });

if (ageGroup) {
query = query.eq('age_group', ageGroup);
}
const { data, error } = await query;

if (error) {
return NextResponse.json({ error: error.message }, { status: 500 });
}

return NextResponse.json({ bins: data || [] });
} catch (error) {
return NextResponse.json(
{ error: error instanceof Error ? error.message : 'Unknown error' },
{ status: 500 }
);
}
}