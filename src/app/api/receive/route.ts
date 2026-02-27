import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

const AGE_TO_PREFIX: Record<string, string> = {
  Hatchlings: 'HATCH',
  Fledglings: 'FLED',
  Soarers: 'SOAR',
  'Sky Readers': 'SKY',
};

const AGE_TO_DB: Record<string, string> = {
  Hatchlings: 'hatchlings',
  Fledglings: 'fledglings',
  Soarers: 'soarers',
  'Sky Readers': 'sky_readers',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { isbn, title, author, age_group, bin_code } = body as {
      isbn?: string;
      title?: string;
      author?: string;
      age_group?: string;
      bin_code?: string;
    };

    if (!isbn || !title || !age_group || !bin_code) {
      return NextResponse.json(
        { error: 'isbn, title, age_group, and bin_code are required.' },
        { status: 400 },
      );
    }

    const prefix = AGE_TO_PREFIX[age_group];
    if (!prefix) {
      return NextResponse.json(
        { error: `Invalid age_group: ${age_group}` },
        { status: 400 },
      );
    }

    const supabase = supabaseServer();

    /* ---- 1. Upsert book_titles by ISBN ---- */
    const { data: existingTitle } = await supabase
      .from('book_titles')
      .select('id, age_group')
      .eq('isbn', isbn)
      .maybeSingle();

    let bookTitleId: string;

    if (existingTitle) {
      bookTitleId = existingTitle.id;

      // Back-fill age_group on the title if it's not set yet
      if (!existingTitle.age_group) {
        await supabase
          .from('book_titles')
          .update({ age_group, updated_at: new Date().toISOString() })
          .eq('id', bookTitleId);
      }
    } else {
      // Create a new book_titles row
      const { data: newTitle, error: titleErr } = await supabase
        .from('book_titles')
        .insert({
          isbn,
          title,
          author: author || null,
          age_group,
        })
        .select('id')
        .single();

      if (titleErr) {
        return NextResponse.json({ error: titleErr.message }, { status: 500 });
      }
      bookTitleId = newTitle.id;
    }

    /* ---- 2. Generate SKU from sku_counters ---- */
    // Atomically grab the next number
    const { data: counter, error: counterErr } = await supabase
      .from('sku_counters')
      .select('next_number')
      .eq('age_group', age_group)
      .single();

    if (counterErr || !counter) {
      return NextResponse.json(
        { error: `Could not read SKU counter for ${age_group}` },
        { status: 500 },
      );
    }

    const skuNumber = counter.next_number;
    const sku = `BN-${prefix}-${String(skuNumber).padStart(4, '0')}`;

    // Increment the counter
    const { error: incErr } = await supabase
      .from('sku_counters')
      .update({ next_number: skuNumber + 1 })
      .eq('age_group', age_group)
      .eq('next_number', skuNumber); // optimistic lock

    if (incErr) {
      return NextResponse.json(
        { error: 'SKU counter conflict — please try again.' },
        { status: 409 },
      );
    }

    /* ---- 3. Insert book_copies row ---- */
    const dbAgeGroup = AGE_TO_DB[age_group];
    const { data: copy, error: copyErr } = await supabase
      .from('book_copies')
      .insert({
        sku,
        book_title_id: bookTitleId,
        isbn,
        age_group: dbAgeGroup,
        bin: bin_code,
        bin_id: bin_code,
        status: 'in_house',
      })
      .select('id, sku, bin, status')
      .single();

    if (copyErr) {
      return NextResponse.json({ error: copyErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      copy,
      message: `Received ${title} → ${sku} → ${bin_code}`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}