import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const summary: string = (body.summary || '').toString();
    const ageGroup: string = (body.ageGroup || '').toString();

    if (!summary.trim()) {
      return NextResponse.json(
        { error: 'Summary is required for suggestions.' },
        { status: 400 }
      );
    }

    const supabase = supabaseServer();

    // Load all tags
    const { data: tags, error: tagsError } = await supabase
      .from('tags')
      .select('id, name');

    if (tagsError) {
      console.error('Error loading tags:', tagsError);
      return NextResponse.json({ error: 'Failed to load tags.' }, { status: 500 });
    }

    // Load mapping for bins
    const { data: mappings, error: mapError } = await supabase
      .from('archive_tag_bin_map')
      .select('tag_id, age_group, bin_id, priority');

    if (mapError) {
      console.error('Error loading tag/bin map:', mapError);
      return NextResponse.json(
        { error: 'Failed to load tag/bin mapping.' },
        { status: 500 }
      );
    }

    // Load bins for display names
    const { data: bins, error: binsError } = await supabase
      .from('bins')
      .select('bin_code, display_name');

    if (binsError) {
      console.error('Error loading bins:', binsError);
      return NextResponse.json({ error: 'Failed to load bins.' }, { status: 500 });
    }

    const normalizedSummary = summary.toLowerCase();

    // Score tags based on naive keyword match of tag name in the summary.
    const scoredTags = (tags || [])
      .map((tag) => {
        const name = (tag.name || '').toString();
        const words = name.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
        let score = 0;
        for (const w of words) {
          if (!w) continue;
          if (normalizedSummary.includes(w)) {
            score += 1;
          }
        }
        return { id: tag.id as string, name, score };
      })
      .filter((t) => t.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8); // keep top few

    // If nothing matched, just bail with empty suggestions
    if (scoredTags.length === 0) {
      return NextResponse.json({
        age_group: ageGroup || null,
        suggested_tags: [],
        suggested_bins: [],
      });
    }

    const tagIds = scoredTags.map((t) => t.id);

    // Filter mappings for these tags and (optionally) this age group
    const relevantMappings = (mappings || []).filter((m) => {
      const tagMatch = tagIds.includes(m.tag_id as string);
      const ageMatch = ageGroup ? m.age_group === ageGroup : true;
      return tagMatch && ageMatch;
    });

    // Map bin_id -> list of contributing tags
    const binToTags = new Map<
      string,
      { binCode: string; age_group: string | null; tagNames: string[]; score: number }
    >();

    for (const m of relevantMappings) {
      const binCode = (m.bin_id || '').toString();
      if (!binCode) continue;
      const age = (m.age_group as string) || null;
      const tag = scoredTags.find((t) => t.id === m.tag_id);
      const existing = binToTags.get(binCode) || {
        binCode,
        age_group: age,
        tagNames: [] as string[],
        score: 0,
      };
      if (tag) {
        existing.tagNames.push(tag.name);
        existing.score += tag.score;
      }
      binToTags.set(binCode, existing);
    }

    const binArray = Array.from(binToTags.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const binCodeToDisplay = new Map<string, string | null>();
    for (const b of bins || []) {
      binCodeToDisplay.set(b.bin_code as string, (b.display_name as string) || null);
    }

    const suggestedBins = binArray.map((b) => {
      const displayName = binCodeToDisplay.get(b.binCode) || null;
      const reasonParts = [] as string[];
      if (ageGroup) reasonParts.push(`age group ${ageGroup}`);
      if (b.tagNames.length) reasonParts.push(`tags [${b.tagNames.join(', ')}]`);
      return {
        bin_code: b.binCode,
        display_name: displayName,
        age_group: b.age_group,
        tag_names: b.tagNames,
        reason: reasonParts.length ? reasonParts.join(' + ') : null,
      };
    });

    const suggestedTags = scoredTags.map((t) => t.name);

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
