'use server';

import { supabaseServer } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';

interface BookCopyInfo {
  id: string;
  sku: string;
  isbn: string;
  status: string;
  bin: string;
  ageGroup: string;
  title: string;
  author: string;
  coverUrl: string | null;
}

interface GetBookCopyResult {
  success: boolean;
  bookCopy?: BookCopyInfo;
  error?: string;
}

interface UpdateStatusResult {
  success: boolean;
  error?: string;
}

interface BookTitleRecord {
  title: string;
  author: string;
  cover_url: string | null;
}

interface BookCopyRecord {
  id: string;
  sku: string;
  isbn: string;
  status: string;
  bin_id: string;
  age_group: string;
  book_titles: BookTitleRecord[] | BookTitleRecord | null;
}

export async function getBookCopybySku(sku: string): Promise<GetBookCopyResult> {
  try {
    const supabase = supabaseServer();

    const { data, error } = await supabase
      .from('book_copies')
      .select(`
        id,
        sku,
        isbn,
        status,
        bin_id,
        age_group,
        book_titles (
          title,
          author,
          cover_url
        )
      `)
      .eq('sku', sku.toUpperCase())
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: 'SKU not found' };
      }
      console.error('Error fetching book copy:', error);
      return { success: false, error: 'Database error while fetching book copy' };
    }

    // Type guard to ensure data is correct type
    const bookCopyData = data as BookCopyRecord;

    if (!bookCopyData || !bookCopyData.book_titles) {
      return { success: false, error: 'Book data incomplete' };
    }

    // Handle both array and single object cases
    const bookTitleData = Array.isArray(bookCopyData.book_titles)
      ? bookCopyData.book_titles[0]
      : bookCopyData.book_titles;

    if (!bookTitleData) {
      return { success: false, error: 'Book title data missing' };
    }

    const bookCopy: BookCopyInfo = {
      id: bookCopyData.id,
      sku: bookCopyData.sku,
      isbn: bookCopyData.isbn,
      status: bookCopyData.status,
      bin: bookCopyData.bin_id,
      ageGroup: bookCopyData.age_group,
      title: bookTitleData.title,
      author: bookTitleData.author,
      coverUrl: bookTitleData.cover_url,
    };

    return {
      success: true,
      bookCopy,
    };
  } catch (error) {
    console.error('Unexpected error in getBookCopybySku:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function updateBookCopyStatus(
  bookCopyId: string,
  sku: string,
  oldStatus: string,
  newStatus: string,
  note?: string
): Promise<UpdateStatusResult> {
  try {
    const supabase = supabaseServer();

    // Step 1: Update book_copies status
    const { error: updateError } = await supabase
      .from('book_copies')
      .update({ status: newStatus })
      .eq('id', bookCopyId);

    if (updateError) {
      console.error('Error updating book copy status:', updateError);
      return { success: false, error: 'Failed to update status' };
    }

    // Step 2: Insert into status_history
    const { error: historyError } = await supabase
      .from('status_history')
      .insert({
        book_copy_id: bookCopyId,
        sku: sku,
        old_status: oldStatus,
        new_status: newStatus,
        note: note || null,
      });

    if (historyError) {
      console.error('Error inserting status history:', historyError);
      // Don't fail the whole operation if history insert fails
      // The status was already updated
    }

    // Revalidate relevant pages
    revalidatePath('/returns');
    revalidatePath('/dashboard');

    return { success: true };
  } catch (error) {
    console.error('Unexpected error in updateBookCopyStatus:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}