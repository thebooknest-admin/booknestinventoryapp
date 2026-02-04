'use server';

import { supabaseServer } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';

interface InventoryItem {
  id: string;
  sku: string;
  isbn: string;
  title: string;
  author: string;
  ageGroup: string;
  bin: string;
  status: string;
  receivedAt: string;
  coverUrl: string | null;
}

interface GetInventoryResult {
  success: boolean;
  inventory?: InventoryItem[];
  error?: string;
}

interface UpdateBookCopyResult {
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
  age_group: string;
  bin: string;
  status: string;
  received_at: string;
  book_titles: BookTitleRecord[] | BookTitleRecord | null;
}

export async function getInventory(): Promise<GetInventoryResult> {
  try {
    const supabase = supabaseServer();

    const { data, error } = await supabase
  .from('book_copies')
  .select(`
    id,
    sku,
    isbn,
    age_group,
    bin,
    status,
    received_at,
    book_titles (
      title,
      author,
      cover_url
    )
  `)
  .order('received_at', { ascending: false });

    if (error) {
      console.error('Error fetching inventory:', error);
      return { success: false, error: 'Failed to load inventory' };
    }

    if (!data) {
      return { success: true, inventory: [] };
    }

    const inventory: InventoryItem[] = data
      .map((record: BookCopyRecord) => {
        const bookTitleData = Array.isArray(record.book_titles)
          ? record.book_titles[0]
          : record.book_titles;

        if (!bookTitleData) {
          return null;
        }

        return {
          id: record.id,
          sku: record.sku,
          isbn: record.isbn,
          title: bookTitleData.title,
          author: bookTitleData.author,
          ageGroup: record.age_group,
          bin: record.bin,
          status: record.status,
          receivedAt: record.received_at,
          coverUrl: bookTitleData.cover_url || null,
        };
      })
      .filter((item): item is InventoryItem => item !== null);

    return {
      success: true,
      inventory,
    };
  } catch (error) {
    console.error('Unexpected error in getInventory:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function updateBookCopy(
  id: string,
  updates: {
    isbn?: string;
    title?: string;
    author?: string;
    ageGroup?: string;
    bin?: string;
    status?: string;
    coverUrl?: string; // ADD THIS
  }
): Promise<UpdateBookCopyResult> {
  try {
    const supabase = supabaseServer();

    // Build update object for book_copies table
    const bookCopyUpdates: any = {};
    
    if (updates.isbn !== undefined) {
      bookCopyUpdates.isbn = updates.isbn.trim();
    }
    if (updates.ageGroup !== undefined) {
      bookCopyUpdates.age_group = updates.ageGroup.trim();
    }
    if (updates.bin !== undefined) {
      bookCopyUpdates.bin = updates.bin.trim();
    }
    if (updates.status !== undefined) {
      bookCopyUpdates.status = updates.status.trim();
    }

    // Update book_copies if there are any changes
    if (Object.keys(bookCopyUpdates).length > 0) {
      const { error: copyError } = await supabase
        .from('book_copies')
        .update(bookCopyUpdates)
        .eq('id', id);

      if (copyError) {
        console.error('Error updating book copy:', copyError);
        return { success: false, error: 'Failed to update book copy' };
      }
    }

    // Update book_titles if title, author, or coverUrl changed
    if (updates.title !== undefined || updates.author !== undefined || updates.coverUrl !== undefined) {
      // Get the book_title_id from the book_copy
      const { data: copyData, error: fetchError } = await supabase
        .from('book_copies')
        .select('book_title_id')
        .eq('id', id)
        .single();

      if (fetchError || !copyData?.book_title_id) {
        console.error('Error fetching book_title_id:', fetchError);
        return { success: false, error: 'Failed to find related book title' };
      }

      // Build update object for book_titles
      const bookTitleUpdates: any = {};
      if (updates.title !== undefined) {
        bookTitleUpdates.title = updates.title.trim();
      }
      if (updates.author !== undefined) {
        bookTitleUpdates.author = updates.author.trim();
      }
      if (updates.coverUrl !== undefined) {
        bookTitleUpdates.cover_url = updates.coverUrl.trim() || null; // ADD THIS
      }

      // Update book_titles
      const { error: titleError } = await supabase
        .from('book_titles')
        .update(bookTitleUpdates)
        .eq('id', copyData.book_title_id);

      if (titleError) {
        console.error('Error updating book title:', titleError);
        // Don't fail the whole operation if title update fails
        // The book_copy was already updated successfully
      }
    }

    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Unexpected error in updateBookCopy:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}