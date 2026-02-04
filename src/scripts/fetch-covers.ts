import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fetchCoverForISBN(isbn: string): Promise<string | null> {
  try {
    const cleanIsbn = isbn.replace(/[-\s]/g, '');
    const response = await fetch(`https://openlibrary.org/isbn/${cleanIsbn}.json`);
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    if (data.covers && data.covers[0]) {
      return `https://covers.openlibrary.org/b/id/${data.covers[0]}-M.jpg`;
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching cover for ISBN ${isbn}:`, error);
    return null;
  }
}

async function updateCovers() {
  console.log('Fetching books without covers...');
  
  // Get all book_titles that have ISBNs but no cover_url
  const { data: books, error } = await supabase
    .from('book_titles')
    .select('id, isbn, title')
    .not('isbn', 'is', null)
    .is('cover_url', null);
  
  if (error) {
    console.error('Error fetching books:', error);
    return;
  }
  
  console.log(`Found ${books?.length || 0} books without covers`);
  
  if (!books || books.length === 0) {
    console.log('No books to update!');
    return;
  }
  
  let updated = 0;
  let failed = 0;
  
  for (const book of books) {
    console.log(`Fetching cover for: ${book.title} (ISBN: ${book.isbn})`);
    
    const coverUrl = await fetchCoverForISBN(book.isbn);
    
    if (coverUrl) {
      const { error: updateError } = await supabase
        .from('book_titles')
        .update({ cover_url: coverUrl })
        .eq('id', book.id);
      
      if (updateError) {
        console.error(`Failed to update ${book.title}:`, updateError);
        failed++;
      } else {
        console.log(`✓ Updated ${book.title}`);
        updated++;
      }
    } else {
      console.log(`✗ No cover found for ${book.title}`);
      failed++;
    }
    
    // Rate limit: wait 500ms between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`\nDone! Updated: ${updated}, Failed: ${failed}`);
}

updateCovers();