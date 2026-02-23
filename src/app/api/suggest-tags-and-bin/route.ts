import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

/**
 * Map frontend age-group labels to the DB column values in `bins.age_group`.
 */
const AGE_GROUP_TO_DB: Record<string, string> = {
  Hatchlings: 'hatchlings',
  Fledglings: 'fledglings',
  Soarers: 'soarers',
  'Sky Readers': 'sky_readers',
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const summary: string = (body.summary || '').toString();
    const ageGroup: string = (body.ageGroup || '').toString();

    if (!summary.trim()) {
      return NextResponse.json(
        { error: 'Summary is required for suggestions.' },
        { status: 400 },
      );
    }

    const supabase = supabaseServer();

    // 1. Load active classification keywords
    const { data: keywords, error: kwError } = await supabase
      .from('classification_keywords')
      .select('bin, keyword, weight')
      .eq('active', true);

    if (kwError) {
      console.error('Error loading classification_keywords:', kwError);
      return NextResponse.json({ error: 'Failed to load keywords.' }, { status: 500 });
    }

    // 2. Score each keyword against the summary
    const normalizedSummary = summary.toLowerCase();

    // theme -> total score
    const themeScores = new Map<string, { score: number; matchedKeywords: string[] }>();

    for (const kw of keywords || []) {
      const word = (kw.keyword || '').toLowerCase();
      if (!word || !normalizedSummary.includes(word)) continue;

      const theme = (kw.bin || '').toUpperCase();
      const existing = themeScores.get(theme) || { score: 0, matchedKeywords: [] };
      existing.score += kw.weight || 1;
      existing.matchedKeywords.push(word);
      themeScores.set(theme, existing);
    }

    // No matches — return empty
    if (themeScores.size === 0) {
      return NextResponse.json({
        age_group: ageGroup || null,
        suggested_tags: [],
        suggested_bins: [],
      });
    }

    // 3. Rank themes by score
    const rankedThemes = Array.from(themeScores.entries())
      .map(([theme, data]) => ({ theme, ...data }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    // Collect unique matched keywords as suggested tags
    const suggestedTags = [
      ...new Set(rankedThemes.flatMap((t) => t.matchedKeywords)),
    ].slice(0, 8);

    // 4. Look up real bins for the top themes
    const dbAgeGroup = ageGroup ? AGE_GROUP_TO_DB[ageGroup] || ageGroup.toLowerCase() : null;
    const themeNames = rankedThemes.map((t) => t.theme.toLowerCase());

    let binsQuery = supabase
      .from('bins')
      .select('bin_code, display_name, age_group, theme')
      .eq('is_active', true)
      .in('theme', themeNames);

    if (dbAgeGroup) {
      binsQuery = binsQuery.eq('age_group', dbAgeGroup);
    }

    const { data: matchedBins, error: binsError } = await binsQuery;

    if (binsError) {
      console.error('Error loading bins:', binsError);
      return NextResponse.json({ error: 'Failed to load bins.' }, { status: 500 });
    }

    // 5. Build suggested bins, sorted by theme score
    const suggestedBins = (matchedBins || [])
      .map((b) => {
        const themeKey = (b.theme || '').toUpperCase();
        const themeData = themeScores.get(themeKey);
        return {
          bin_code: b.bin_code as string,
          display_name: (b.display_name as string) || null,
          age_group: (b.age_group as string) || null,
          tag_names: themeData?.matchedKeywords || [],
          reason: themeData
            ? [
                dbAgeGroup ? `age group ${ageGroup}` : null,
                `keywords [${themeData.matchedKeywords.join(', ')}]`,
              ]
                .filter(Boolean)
                .join(' + ')
            : null,
          _score: themeData?.score || 0,
        };
      })
      .sort((a, b) => b._score - a._score)
      .slice(0, 5)
      .map(({ _score, ...rest }) => rest); // strip internal score

    return NextResponse.json({
      age_group: ageGroup || null,
      suggested_tags: suggestedTags,
      suggested_bins: suggestedBins,
    });
  } catch (error) {
    console.error('Error in suggest-tags-and-bin:', error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}