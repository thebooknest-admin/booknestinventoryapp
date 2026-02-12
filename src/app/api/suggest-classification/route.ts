import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

type AgeTier = 'HATCH' | 'FLED' | 'SOAR' | 'SKY';
type BinType =
| 'LIFE'
| 'NATURE'
| 'LEARN'
| 'ADVENTURE'
| 'HUMOR'
| 'CLASSICS'
| 'IDENTITY'
| 'SEASONAL';

const VERSION = 'v1.0-rules';

const TIER_RANGES: Record<AgeTier, [number, number]> = {
HATCH: [0, 2],
FLED: [3, 5],
SOAR: [6, 8],
SKY: [9, 12],
};

function normalizeText(input?: string | null) {
return (input || '')
.toLowerCase()
.replace(/[^\w\s-]/g, ' ')
.replace(/\s+/g, ' ')
.trim();
}

function parseReadingAge(text?: string | null): { min: number; max: number } | null {
if (!text) return null;
const t = normalizeText(text);
// matches "7-9", "ages 7 to 9", etc.
const m = t.match(/(\d{1,2})\s*(?:-|to)\s*(\d{1,2})/);
if (m) {
const min = Number(m[1]);
const max = Number(m[2]);
if (!Number.isNaN(min) && !Number.isNaN(max) && min <= max) return { min, max };
}

// single age like "age 6"
const single = t.match(/age\s*(\d{1,2})/);
if (single) {
const n = Number(single[1]);
if (!Number.isNaN(n)) return { min: n, max: n };
}
return null;
}

function overlapScore(candidate: { min: number; max: number }, tier: [number, number]) {
const start = Math.max(candidate.min, tier[0]);
const end = Math.min(candidate.max, tier[1]);
const overlap = Math.max(0, end - start + 1);
const length = Math.max(1, candidate.max - candidate.min + 1);
return overlap / length;
}

function inferAgeFromFormat(format?: string | null): { tier: AgeTier; confidence: number; reason: string } | null {
const f = normalizeText(format);
if (!f) return null;
if (f.includes('board')) return { tier: 'HATCH', confidence: 0.72, reason: 'Format indicates board book.' };
if (f.includes('picture')) return { tier: 'FLED', confidence: 0.7, reason: 'Format indicates picture book.' };
if (f.includes('chapter')) return { tier: 'SOAR', confidence: 0.72, reason: 'Format indicates chapter book.' };
if (f.includes('graphic')) return { tier: 'SOAR', confidence: 0.66, reason: 'Format indicates graphic format.' };
return null;
}

function clamp01(n: number) {
return Math.max(0, Math.min(1, n));
}

export async function POST(req: NextRequest) {
try {
const body = await req.json();

const title = normalizeText(body.title);
const subtitle = normalizeText(body.subtitle);
const description = normalizeText(body.description || body.summary);
const subjects: string[] = Array.isArray(body.subjects) ? body.subjects.map((s: string) => normalizeText(s)) : [];
const readingAgeText = body.reading_age_text as string | undefined;
const publisherAgeMin = body.publisher_age_min as number | undefined;
const publisherAgeMax = body.publisher_age_max as number | undefined;
const format = body.format as string | undefined;
const isbn = (body.isbn || '').toString().trim();

if (!title && !description && subjects.length === 0) {
return NextResponse.json({ error: 'At least one metadata field is required' }, { status: 400 });
}

const supabase = supabaseServer();
// 1) Overrides first
if (isbn) {
const { data: ageOverride } = await supabase
.from('age_overrides')
.select('forced_age_tier')
.eq('isbn', isbn)
.eq('active', true)
.maybeSingle();

const { data: classicOverride } = await supabase
.from('classic_title_overrides')
.select('forced_bin, forced_age_tier')
.eq('active', true)
.or(`isbn.eq.${isbn},title_pattern.ilike.%${title.replace(/'/g, "''")}%`)
.limit(1)
.maybeSingle();

if (classicOverride?.forced_bin) {
const age = (ageOverride?.forced_age_tier || classicOverride.forced_age_tier || 'FLED') as AgeTier;
return NextResponse.json({
suggested_age_tier: age,
suggested_bin: classicOverride.forced_bin as BinType,
confidence: 0.9,
reason: 'Matched classic override rule.',
version: VERSION,
engine: 'rules',
needs_review: false,
});
}
}
// 2) Age scoring
let ageTier: AgeTier = 'SOAR';
let ageReason = 'Defaulted due to limited age metadata.';
let ageConfidence = 0.45;

const explicitRange =
typeof publisherAgeMin === 'number' && typeof publisherAgeMax === 'number'
? { min: publisherAgeMin, max: publisherAgeMax }
: parseReadingAge(readingAgeText);

if (explicitRange) {
const scored = (Object.keys(TIER_RANGES) as AgeTier[]).map((tier) => ({
tier,
score: overlapScore(explicitRange, TIER_RANGES[tier]),
}));
scored.sort((a, b) => b.score - a.score);

ageTier = scored[0].tier;
ageConfidence = clamp01(0.6 + scored[0].score * 0.35);
ageReason = `Age range ${explicitRange.min}-${explicitRange.max} maps best to ${ageTier}.`;
} else {
const formatInference = inferAgeFromFormat(format);
if (formatInference) {
ageTier = formatInference.tier;
ageConfidence = formatInference.confidence;
ageReason = formatInference.reason;
}
}
// 3) Bin scoring
const { data: keywords, error: kwErr } = await supabase
.from('classification_keywords')
.select('bin, keyword, weight, source_priority')
.eq('active', true);

if (kwErr) {
return NextResponse.json({ error: kwErr.message }, { status: 500 });
}

const titleText = `${title} ${subtitle}`.trim();
const summaryText = description;
const subjectText = subjects.join(' ');

const binScores: Record<string, number> = {};
for (const row of keywords || []) {
const bin = row.bin as BinType;
const keyword = normalizeText(row.keyword);
const weight = Number(row.weight || 1);

let source = '';
let multiplier = 1;

if (row.source_priority === 'title') {
source = titleText;
multiplier = 3;
} else if (row.source_priority === 'subject') {
source = subjectText;
multiplier = 2;
} else {
source = summaryText;
multiplier = 1;
}

if (!source || !keyword) continue;

if (source.includes(keyword)) {
const exactPhraseBoost = source.includes(` ${keyword} `) || source.startsWith(keyword) ? 2 : 0;
binScores[bin] = (binScores[bin] || 0) + weight * multiplier + exactPhraseBoost;
}
}

const sortedBins = Object.entries(binScores).sort((a, b) => b[1] - a[1]);
const topBin = (sortedBins[0]?.[0] as BinType) || 'LIFE';
const topScore = sortedBins[0]?.[1] || 0;
const second = sortedBins[1];

const maxPossible = 40; // pragmatic cap for confidence normalization
const binConfidence = clamp01(topScore / maxPossible);

const combinedConfidence = clamp01(ageConfidence * 0.45 + binConfidence * 0.55);
const needsReview = combinedConfidence < 0.65;

const reasonParts = [
ageReason,
topScore > 0
? `Top bin signal: ${topBin} (${topScore}${second ? `, next ${second[0]} ${second[1]}` : ''}).`
: 'No strong bin keyword signals found.',
];
return NextResponse.json({
suggested_age_tier: ageTier,
suggested_bin: topBin,
confidence: Number(combinedConfidence.toFixed(3)),
reason: reasonParts.join(' '),
version: VERSION,
engine: 'rules',
needs_review: needsReview,
});
} catch (error) {
console.error('suggest-classification error:', error);
return NextResponse.json(
{ error: error instanceof Error ? error.message : 'Unknown error' },
{ status: 500 }
);
}
}