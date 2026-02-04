import { NextRequest, NextResponse } from 'next/server';

function suggestAgeCategory(title: string, author: string, description: string): {
  category: string;
  explanation: string;
} {
  const text = `${title} ${author} ${description}`.toLowerCase();
  
  // Board book / Baby keywords
  if (
    text.includes('board book') ||
    text.includes('baby') ||
    text.includes('toddler') ||
    text.includes('touch and feel') ||
    text.includes('lift the flap') ||
    text.includes('ages 0-2') ||
    text.includes('ages 0-3') ||
    title.toLowerCase().includes('baby') ||
    author.toLowerCase().includes('baby')
  ) {
    return {
      category: 'hatchlings',
      explanation: 'Suggested for ages 0-2 based on keywords like baby, toddler, or board book',
    };
  }
  
  // Picture book keywords
  if (
    text.includes('picture book') ||
    text.includes('preschool') ||
    text.includes('kindergarten') ||
    text.includes('ages 3-5') ||
    text.includes('ages 4-6') ||
    text.includes('bedtime story') ||
    text.includes('read aloud')
  ) {
    return {
      category: 'fledglings',
      explanation: 'Suggested for ages 3-5 based on picture book or preschool themes',
    };
  }
  
  // Early reader / Chapter book keywords
  if (
    text.includes('early reader') ||
    text.includes('chapter book') ||
    text.includes('grade 1') ||
    text.includes('grade 2') ||
    text.includes('grades 1-3') ||
    text.includes('ages 6-8') ||
    text.includes('ages 5-7') ||
    text.includes('beginning reader')
  ) {
    return {
      category: 'soarers',
      explanation: 'Suggested for ages 6-8 based on early reader or chapter book indicators',
    };
  }
  
  // Middle grade keywords
  if (
    text.includes('middle grade') ||
    text.includes('grade 3') ||
    text.includes('grade 4') ||
    text.includes('grade 5') ||
    text.includes('grades 3-5') ||
    text.includes('ages 8-12') ||
    text.includes('ages 9-12') ||
    text.includes('tween')
  ) {
    return {
      category: 'sky_readers',
      explanation: 'Suggested for ages 9-12 based on middle grade themes',
    };
  }
  
  // Default: try to guess from title length and complexity
  // Shorter titles with simpler words = younger
  const words = title.split(' ');
  if (words.length <= 3 && title.length < 20) {
    return {
      category: 'fledglings',
      explanation: 'Suggested for ages 3-5 based on simple title structure',
    };
  }
  
  // Default to middle if we can't determine
  return {
    category: 'soarers',
    explanation: 'Suggested for ages 6-8 (default suggestion)',
  };
}

export async function POST(request: NextRequest) {
  try {
    const { title, author, isbn } = await request.json();

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Fetch book description from Google Books
    let description = '';
    if (isbn) {
      try {
        const cleanIsbn = isbn.replace(/[-\s]/g, '');
        const response = await fetch(
          `https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanIsbn}`
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.items?.[0]?.volumeInfo?.description) {
            description = data.items[0].volumeInfo.description;
          }
        }
      } catch (err) {
        console.error('Error fetching description:', err);
      }
    }

    const suggestion = suggestAgeCategory(title, author || '', description);

    return NextResponse.json(suggestion);
  } catch (error) {
    console.error('Error in suggest-age API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to suggest age category',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}