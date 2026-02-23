import { NextRequest, NextResponse } from 'next/server';

interface BookData {
isbn: string;
title: string;
author: string;
coverUrl: string | null;
description?: string | null;
subjects?: string[];
pageCount?: number | null;
publishedDate?: string | null;
maturityRating?: string | null;
}

async function fetchFromOpenLibrary(isbn: string): Promise<BookData | null> {
  try {
    const cleanIsbn = isbn.replace(/[-\s]/g, '');
    const response = await fetch(`https://openlibrary.org/isbn/${cleanIsbn}.json`);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    let coverUrl: string | null = null;
    if (data.covers && data.covers[0]) {
      coverUrl = `https://covers.openlibrary.org/b/id/${data.covers[0]}-L.jpg`;
    }

    // Get title
    const title = data.title || 'Unknown Title';

    // Get author - handle different formats
    let author = 'Unknown Author';
    if (data.authors && data.authors[0]) {
      const authorKey = data.authors[0].key;
      try {
        const authorResponse = await fetch(`https://openlibrary.org${authorKey}.json`);
        if (authorResponse.ok) {
          const authorData = await authorResponse.json();
          author = authorData.name || 'Unknown Author';
        }
      } catch (err) {
        console.error('Error fetching author:', err);
      }
    }

   return {
isbn: cleanIsbn,
title,
author,
coverUrl,
description: data.description?.value || data.description || null,
subjects: data.subjects || [],
pageCount: data.number_of_pages || null,
publishedDate: data.publish_date || null,
maturityRating: null,
};

  } catch (error) {
    console.error('Error fetching from Open Library:', error);
    return null;
  }
}

async function fetchFromGoogleBooks(isbn: string): Promise<BookData | null> {
  try {
    const cleanIsbn = isbn.replace(/[-\s]/g, '');
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanIsbn}`
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return null;
    }

    const book = data.items[0].volumeInfo;

    let coverUrl: string | null = null;
    if (book.imageLinks) {
      // Try to get the largest available image
      coverUrl = book.imageLinks.extraLarge ||
                 book.imageLinks.large ||
                 book.imageLinks.medium ||
                 book.imageLinks.small ||
                 book.imageLinks.thumbnail ||
                 null;
    }

    return {
isbn: cleanIsbn,
title: book.title || 'Unknown Title',
author: book.authors?.[0] || 'Unknown Author',
coverUrl,
description: book.description || null,
subjects: book.categories || [],
pageCount: book.pageCount || null,
publishedDate: book.publishedDate || null,
maturityRating: book.maturityRating || null,
};
  } catch (error) {
    console.error('Error fetching from Google Books:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const isbn = searchParams.get('isbn');

  if (!isbn) {
    return NextResponse.json(
      { error: 'ISBN is required' },
      { status: 400 }
    );
  }

  // Try Open Library first
  console.log('Trying Open Library...');
  let bookData = await fetchFromOpenLibrary(isbn);

  // If Open Library didn't work or has no cover, try Google Books
  if (!bookData || !bookData.coverUrl) {
    console.log('Trying Google Books...');
    const googleData = await fetchFromGoogleBooks(isbn);

    if (googleData) {
      // If we got data from Open Library but no cover, merge the data
      if (bookData && !bookData.coverUrl) {
        bookData = {
          ...bookData,
          coverUrl: googleData.coverUrl,
        };
      } else {
        bookData = googleData;
      }
    }
  }

if (!bookData) {
  // Fail soft: respond 200 with empty fields so the UI can still proceed
  return NextResponse.json(
    {
      isbn,
      title: '',
      author: '',
      coverUrl: null,
      description: null,
      subjects: [],
      pageCount: null,
      publishedDate: null,
      maturityRating: null,
    },
    { status: 200 }
  );
}

return NextResponse.json(bookData);
}