// src/lib/isbnMetadata.js

import axios from 'axios';

// Clean ISBN (remove dashes, spaces)
function cleanISBN(isbn) {
  return isbn?.replace(/[-\s]/g, '') || '';
}

// Fetch from Google Books API
export async function fetchGoogleBooksMetadata(isbn) {
  const cleanedISBN = cleanISBN(isbn);
  
  if (!cleanedISBN) {
    throw new Error('Invalid ISBN');
  }
  
  try {
    const response = await axios.get(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanedISBN}`
    );
    
    if (!response.data.items || response.data.items.length === 0) {
      return null; // No data found
    }
    
    const book = response.data.items[0].volumeInfo;
    
    return {
      title: book.title || '',
      subtitle: book.subtitle || '',
      description: book.description || '',
      subjects: book.categories || [],
      publisher: book.publisher || '',
      published_date: book.publishedDate || '',
      page_count: book.pageCount || null,
      authors: book.authors || [],
      cover_url: book.imageLinks?.thumbnail || '',
      metadata_source: 'google_books'
    };
    
  } catch (error) {
    console.error(`Error fetching ISBN ${cleanedISBN}:`, error.message);
    return null;
  }
}

// Optional: Fetch from Open Library as backup
export async function fetchOpenLibraryMetadata(isbn) {
  const cleanedISBN = cleanISBN(isbn);
  
  try {
    const response = await axios.get(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${cleanedISBN}&format=json&jscmd=data`
    );
    
    const bookKey = `ISBN:${cleanedISBN}`;
    const book = response.data[bookKey];
    
    if (!book) return null;
    
    return {
      title: book.title || '',
      subtitle: book.subtitle || '',
      description: book.notes || book.excerpts?.[0]?.text || '',
      subjects: book.subjects?.map(s => s.name) || [],
      publisher: book.publishers?.[0]?.name || '',
      published_date: book.publish_date || '',
      page_count: book.number_of_pages || null,
      authors: book.authors?.map(a => a.name) || [],
      cover_url: book.cover?.large || book.cover?.medium || '',
      metadata_source: 'open_library'
    };
    
  } catch (error) {
    console.error(`Error fetching from Open Library:`, error.message);
    return null;
  }
}

// Try Google Books, fall back to Open Library
export async function fetchBookMetadata(isbn) {
  let metadata = await fetchGoogleBooksMetadata(isbn);
  
  if (!metadata) {
    console.log(`  ⚠️  No Google Books data, trying Open Library...`);
    metadata = await fetchOpenLibraryMetadata(isbn);
  }
  
  return metadata;
}