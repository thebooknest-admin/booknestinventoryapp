import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function POST(request: NextRequest) {
  try {
    const { ageGroup, theme } = await request.json();

    if (!ageGroup) {
      return NextResponse.json({ error: 'Age group is required' }, { status: 400 });
    }

    const supabase = supabaseServer();

    // get suggested *bin_code*
    const { data: binCode, error } = await supabase.rpc('get_suggested_bin', {
      p_age_group: ageGroup,
      p_theme: theme || null,
    });

    if (error) {
      console.error('Error getting bin suggestion:', error);
      return NextResponse.json({ error: 'Failed to get bin suggestion' }, { status: 500 });
    }

    if (!binCode) {
      return NextResponse.json({
        suggestedBin: null,
        suggestedBinCode: null,
        suggestedBinDisplay: null,
        message: `No available bins for ${ageGroup}${theme ? ` - ${theme}` : ''}.`,
      });
    }

    // look up display_name for the UI
    const { data: binRow, error: binErr } = await supabase
      .from('bins')
      .select('bin_code, display_name')
      .eq('bin_code', binCode)
      .maybeSingle();

    if (binErr) {
      console.error('Error fetching bin display name:', binErr);
      // still return binCode so you’re not dead in the water
      return NextResponse.json({
        suggestedBin: binCode,
        suggestedBinCode: binCode,
        suggestedBinDisplay: null,
        message: `Suggested bin based on age group${theme ? ` and ${theme} theme` : ''}`,
      });
    }

    return NextResponse.json({
      // keep backward compatibility (suggestedBin used by existing UI)
      suggestedBin: binRow?.display_name ?? binCode,
      suggestedBinCode: binCode,
      suggestedBinDisplay: binRow?.display_name ?? null,
      message: `Suggested bin based on age group${theme ? ` and ${theme} theme` : ''}`,
    });
  } catch (error) {
    console.error('Error in suggest-bin API:', error);
    return NextResponse.json({ error: 'Failed to suggest bin' }, { status: 500 });
  }
}
