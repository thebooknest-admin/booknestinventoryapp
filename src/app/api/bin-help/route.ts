import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function GET(request: NextRequest) {
  try {
    const binCode = request.nextUrl.searchParams.get('binCode');

    if (!binCode) {
      return NextResponse.json({ error: 'binCode is required' }, { status: 400 });
    }

    // Expected format: SOAR-ADVENTURE-01
    const parts = binCode.toUpperCase().split('-');
    const binTheme = parts[1]; // ADVENTURE, LIFE, etc.

    if (!binTheme) {
      return NextResponse.json({ error: 'Invalid bin code format' }, { status: 400 });
    }

    const supabase = supabaseServer();
    const { data: keywords, error } = await supabase
      .from('classification_keywords')
      .select('keyword, weight')
      .eq('active', true)
      .eq('bin', binTheme)
      .order('weight', { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      bin_code: binCode,
      display_name: binTheme.charAt(0) + binTheme.slice(1).toLowerCase(),
      description: `This bin is best suited for ${binTheme.toLowerCase()} books.`,
      tags: (keywords || []).map((k) => k.keyword),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}