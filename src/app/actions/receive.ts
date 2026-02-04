'use server';

import { supabaseServer } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';

interface ReceiveBookResult {
  success: boolean;
  sku?: string;
  error?: string;
}

export async function receiveBook(
  bookInfo: {
    isbn: string;
    title: string;
    author: string;
    coverUrl: string | null;
    theme?: string | null;
  },
  copyInfo: {
    isbn: string;
    ageGroup: string;
    bin: string;
  }
): Promise<ReceiveBookResult> {
  try {
    const supabase = supabaseServer();

    const cleanIsbn = bookInfo.isbn.replace(/[-\s]/g, '');

    // Check if book title already exists
    const { data: existingTitle, error: titleLookupError } = await supabase
      .from('book_titles')
      .select('id, theme')
      .eq('isbn', cleanIsbn)
      .maybeSingle();

    if (titleLookupError) {
      console.error('Error looking up book title:', titleLookupError);
      return { success: false, error: 'Failed to look up book title' };
    }

    let bookTitleId: string;

    if (!existingTitle) {
      // Create new book title with theme
      const { data: newTitle, error: titleError } = await supabase
        .from('book_titles')
        .insert({
          isbn: cleanIsbn,
          title: bookInfo.title,
          author: bookInfo.author,
          cover_url: bookInfo.coverUrl,
          theme: bookInfo.theme || null,
        })
        .select('id')
        .single();

      if (titleError || !newTitle) {
        console.error('Error creating book title:', titleError);
        return { success: false, error: 'Failed to create book title' };
      }

      bookTitleId = newTitle.id;
    } else {
      bookTitleId = existingTitle.id;

      // If updating existing book title and it doesn't have a theme, add it
      if (bookInfo.theme && !existingTitle.theme) {
        await supabase
          .from('book_titles')
          .update({ theme: bookInfo.theme })
          .eq('id', bookTitleId);
      }
    }

    // Create new book copy
    const { data: newCopy, error: copyError } = await supabase
      .from('book_copies')
      .insert({
        book_title_id: bookTitleId,
        isbn: copyInfo.isbn,
        age_group: copyInfo.ageGroup,
        bin: copyInfo.bin,
        status: 'in_house',
      })
      .select('sku')
      .single();

    if (copyError || !newCopy) {
      console.error('Error creating book copy:', copyError);
      return { success: false, error: 'Failed to create book copy' };
    }

    revalidatePath('/dashboard');
    revalidatePath('/receive');

    return {
      success: true,
      sku: newCopy.sku,
    };
  } catch (error) {
    console.error('Unexpected error in receiveBook:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}