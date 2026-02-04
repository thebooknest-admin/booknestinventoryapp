import { NextRequest, NextResponse } from 'next/server';

// Define our theme categories
const THEMES = [
  'animals',
  'adventure',
  'fantasy',
  'mystery',
  'science',
  'historical',
  'educational',
  'bedtime',
  'family',
  'friendship',
  'humor',
  'sports',
  'nature',
  'general',
];

function suggestThemeFromKeywords(title: string, description: string): {
  theme: string;
  explanation: string;
} {
  const text = `${title} ${description}`.toLowerCase();

  // Animals
  if (
    text.includes('animal') ||
    text.includes('dog') ||
    text.includes('cat') ||
    text.includes('bear') ||
    text.includes('bird') ||
    text.includes('bunny') ||
    text.includes('rabbit') ||
    text.includes('wildlife') ||
    text.includes('zoo') ||
    text.includes('farm') ||
    text.includes('pet')
  ) {
    return { theme: 'animals', explanation: 'Book features animals or wildlife themes' };
  }

  // Adventure
  if (
    text.includes('adventure') ||
    text.includes('journey') ||
    text.includes('quest') ||
    text.includes('explore') ||
    text.includes('treasure') ||
    text.includes('expedition')
  ) {
    return { theme: 'adventure', explanation: 'Book features adventure and exploration' };
  }

  // Fantasy
  if (
    text.includes('magic') ||
    text.includes('wizard') ||
    text.includes('dragon') ||
    text.includes('fairy') ||
    text.includes('fantasy') ||
    text.includes('enchant') ||
    text.includes('spell') ||
    text.includes('witch')
  ) {
    return { theme: 'fantasy', explanation: 'Book features fantasy and magical elements' };
  }

  // Mystery
  if (
    text.includes('mystery') ||
    text.includes('detective') ||
    text.includes('solve') ||
    text.includes('clue') ||
    text.includes('secret') ||
    text.includes('investigate')
  ) {
    return { theme: 'mystery', explanation: 'Book features mystery and problem-solving' };
  }

  // Science
  if (
    text.includes('science') ||
    text.includes('experiment') ||
    text.includes('space') ||
    text.includes('planet') ||
    text.includes('robot') ||
    text.includes('invention') ||
    text.includes('technology') ||
    text.includes('astronomy')
  ) {
    return { theme: 'science', explanation: 'Book features science and discovery' };
  }

  // Historical
  if (
    text.includes('history') ||
    text.includes('historical') ||
    text.includes('war') ||
    text.includes('ancient') ||
    text.includes('pioneer') ||
    text.includes('colonial') ||
    text.includes('civil war')
  ) {
    return { theme: 'historical', explanation: 'Book features historical themes' };
  }

  // Educational
  if (
    text.includes('learn') ||
    text.includes('alphabet') ||
    text.includes('numbers') ||
    text.includes('colors') ||
    text.includes('shapes') ||
    text.includes('educational') ||
    text.includes('counting')
  ) {
    return { theme: 'educational', explanation: 'Book focuses on learning and education' };
  }

  // Bedtime
  if (
    text.includes('bedtime') ||
    text.includes('sleep') ||
    text.includes('goodnight') ||
    text.includes('night time') ||
    text.includes('dream')
  ) {
    return { theme: 'bedtime', explanation: 'Book suitable for bedtime reading' };
  }

  // Family
  if (
    text.includes('family') ||
    text.includes('mother') ||
    text.includes('father') ||
    text.includes('parent') ||
    text.includes('siblings') ||
    text.includes('brother') ||
    text.includes('sister')
  ) {
    return { theme: 'family', explanation: 'Book focuses on family relationships' };
  }

  // Friendship
  if (
    text.includes('friend') ||
    text.includes('together') ||
    text.includes('kindness') ||
    text.includes('sharing')
  ) {
    return { theme: 'friendship', explanation: 'Book focuses on friendship and relationships' };
  }

  // Humor
  if (
    text.includes('funny') ||
    text.includes('silly') ||
    text.includes('laugh') ||
    text.includes('joke') ||
    text.includes('hilarious')
  ) {
    return { theme: 'humor', explanation: 'Book features humor and comedy' };
  }

  // Sports
  if (
    text.includes('sport') ||
    text.includes('soccer') ||
    text.includes('basketball') ||
    text.includes('baseball') ||
    text.includes('football') ||
    text.includes('game') ||
    text.includes('team')
  ) {
    return { theme: 'sports', explanation: 'Book features sports and athletics' };
  }

  // Nature
  if (
    text.includes('nature') ||
    text.includes('forest') ||
    text.includes('ocean') ||
    text.includes('garden') ||
    text.includes('environment') ||
    text.includes('tree') ||
    text.includes('flower')
  ) {
    return { theme: 'nature', explanation: 'Book features nature and environment' };
  }

  // Default
  return { theme: 'general', explanation: 'General interest book' };
}

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
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
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

    // Get age category suggestion
    const ageSuggestion = suggestAgeCategory(title, author || '', description);

    // Get theme suggestion
    const themeSuggestion = suggestThemeFromKeywords(title, description);

    return NextResponse.json({
      ageGroup: ageSuggestion.category,
      ageExplanation: ageSuggestion.explanation,
      theme: themeSuggestion.theme,
      themeExplanation: themeSuggestion.explanation,
    });
  } catch (error) {
    console.error('Error in suggest-age-theme API:', error);
    return NextResponse.json(
      {
        error: 'Failed to suggest age and theme',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}