// src/app/api/books/lookup/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { isbn } = await request.json();
    
    // Call your book lookup service (Google Books API, Open Library, etc.)
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`
    );
    
    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      );
    }
    
    const book = data.items[0].volumeInfo;
    
    return NextResponse.json({
      isbn,
      title: book.title,
      author: book.authors?.[0] || 'Unknown',
      coverUrl: book.imageLinks?.thumbnail || null,
    });
  } catch (error) {
    console.error('Book lookup error:', error);
    return NextResponse.json(
      { error: 'Failed to lookup book' },
      { status: 500 }
    );
  }
}