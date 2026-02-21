import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

// Define keyword mappings for common tag patterns
const TAG_KEYWORD_MAP: Record<string, string[]> = {
  // Animals
  'dogs': ['dog', 'puppy', 'puppies', 'canine'],
  'cats': ['cat', 'kitten', 'kitty', 'feline'],
  'bears': ['bear', 'teddy', 'grizzly', 'polar bear'],
  'birds': ['bird', 'parrot', 'owl', 'eagle', 'chicken', 'duck', 'penguin'],
  'rabbits': ['rabbit', 'bunny', 'hare'],
  'horses': ['horse', 'pony', 'stallion', 'mare'],
  'dinosaurs': ['dinosaur', 'dino', 't-rex', 'triceratops', 'prehistoric'],
  'farm-animals': ['farm', 'barn', 'cow', 'pig', 'sheep', 'goat', 'rooster'],
  'zoo-animals': ['zoo', 'safari', 'elephant', 'giraffe', 'lion', 'tiger', 'monkey'],
  'ocean-animals': ['ocean', 'sea', 'fish', 'whale', 'dolphin', 'shark', 'crab', 'octopus'],
  
  // Themes & Topics
  'space-planets': ['space', 'planet', 'astronaut', 'rocket', 'moon', 'stars', 'galaxy', 'solar system'],
  'science': ['science', 'experiment', 'laboratory', 'discovery', 'scientist'],
  'nature': ['nature', 'forest', 'woods', 'wilderness', 'environment', 'tree', 'plants'],
  'seasons': ['spring', 'summer', 'fall', 'autumn', 'winter', 'season'],
  'weather': ['rain', 'snow', 'sunshine', 'storm', 'cloud', 'thunder', 'wind'],
  
  // Activities
  'outdoor-adventures': ['adventure', 'explore', 'hiking', 'camping', 'outdoor', 'journey'],
  'sports': ['sport', 'soccer', 'basketball', 'baseball', 'football', 'tennis', 'game'],
  'dancing': ['dance', 'ballet', 'dancing', 'twirl', 'pirouette'],
  'music': ['music', 'song', 'singing', 'instrument', 'piano', 'guitar', 'band'],
  'crafts-making': ['craft', 'art', 'making', 'create', 'build', 'draw', 'paint'],
  
  // Vehicles
  'cars': ['car', 'automobile', 'vehicle', 'drive', 'racing'],
  'trucks': ['truck', 'pickup', 'dump truck', 'fire truck'],
  'trains': ['train', 'locomotive', 'railroad', 'railway', 'choo choo'],
  'planes': ['plane', 'airplane', 'aircraft', 'jet', 'flying'],
  'boats': ['boat', 'ship', 'sail', 'yacht', 'canoe'],
  
  // Fantasy & Imagination
  'fairies': ['fairy', 'fairies', 'pixie', 'sprite', 'magical creature'],
  'dragons': ['dragon', 'fire-breathing'],
  'magic': ['magic', 'magical', 'spell', 'wizard', 'witch', 'enchanted'],
  'imagination-pretend-play': ['imagination', 'pretend', 'make-believe', 'fantasy', 'dream'],
  'monsters': ['monster', 'creature', 'beast'],
  
  // Emotions & Social
  'friendship': ['friend', 'friendship', 'together', 'pal', 'buddy'],
  'family': ['family', 'mother', 'father', 'parent', 'mom', 'dad', 'sibling', 'brother', 'sister', 'grandma', 'grandpa'],
  'feelings-emotions': ['feeling', 'emotion', 'happy', 'sad', 'angry', 'scared', 'brave', 'proud'],
  'love-belonging': ['love', 'belong', 'home', 'caring', 'kindness', 'hug'],
  'sharing-helping': ['share', 'sharing', 'help', 'helping', 'generous', 'give'],
  
  // Humor
  'silly': ['silly', 'goofy', 'wacky', 'ridiculous', 'absurd'],
  'funny': ['funny', 'hilarious', 'laugh', 'giggle', 'humorous', 'comedy'],
  'jokes': ['joke', 'pun', 'riddle'],
  
  // Educational
  'alphabet-letters': ['alphabet', 'letter', 'abc', 'spelling'],
  'numbers-counting': ['number', 'counting', 'count', 'math', 'addition'],
  'colors': ['color', 'colours', 'red', 'blue', 'rainbow'],
  'shapes': ['shape', 'circle', 'square', 'triangle'],
  
  // Daily Life
  'bedtime': ['bedtime', 'sleep', 'goodnight', 'pajamas', 'dream'],
  'food': ['food', 'eat', 'hungry', 'snack', 'meal', 'cooking', 'baking'],
  'school': ['school', 'classroom', 'teacher', 'student', 'learning'],
  'holidays-celebrations': ['holiday', 'birthday', 'party', 'celebrate', 'christmas', 'halloween', 'thanksgiving'],
};

function scoreTagMatch(tag: string, text: string, availableTags: string[]): number {
  // Only score if this tag exists in the database
  if (!availableTags.includes(tag)) return 0;
  
  const lowerText = text.toLowerCase();
  const keywords = TAG_KEYWORD_MAP[tag] || [];
  
  let score = 0;
  
  // Check if tag name itself appears in text
  if (lowerText.includes(tag.toLowerCase())) {
    score += 10;
  }
  
  // Check keywords
  for (const keyword of keywords) {
    if (lowerText.includes(keyword)) {
      score += 5;
    }
  }
  
  return score;
}

function suggestTagsFromKeywords(
  title: string,
  description: string,
  availableTags: string[]
): { tags: string[]; explanation: string } {
  const text = `${title} ${description}`;
  
  // Score all tags
  const tagScores: Array<{ tag: string; score: number }> = [];
  
  // Score known tag patterns
  for (const tag of Object.keys(TAG_KEYWORD_MAP)) {
    const score = scoreTagMatch(tag, text, availableTags);
    if (score > 0) {
      tagScores.push({ tag, score });
    }
  }
  
  // Also check if any available tags match directly in the text
  for (const tag of availableTags) {
    if (!tagScores.find(t => t.tag === tag)) {
      const lowerText = text.toLowerCase();
      const lowerTag = tag.toLowerCase();
      
      // Direct match
      if (lowerText.includes(lowerTag)) {
        tagScores.push({ tag, score: 8 });
      }
      
      // Partial word match (for compound tags like "outdoor-adventures")
      const tagWords = tag.split('-');
      let partialScore = 0;
      for (const word of tagWords) {
        if (lowerText.includes(word)) {
          partialScore += 3;
        }
      }
      if (partialScore > 0) {
        tagScores.push({ tag, score: partialScore });
      }
    }
  }
  
  // Sort by score and take top 3
  tagScores.sort((a, b) => b.score - a.score);
  const topTags = tagScores.slice(0, 3).map(t => t.tag);
  
  if (topTags.length === 0) {
    return {
      tags: [],
      explanation: 'No specific tags matched',
    };
  }
  
  return {
    tags: topTags,
    explanation: `Matched based on book content: ${topTags.join(', ')}`,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { title, author, isbn } = await request.json();

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Fetch available tags from database
    const { data: tagsData, error: tagsError } = await supabase
      .from('tags')
      .select('name')
      .order('name');

    if (tagsError) {
      console.error('Error fetching tags:', tagsError);
    }

    const availableTags = tagsData?.map((t) => t.name) || [];

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

    // Get tag suggestions using keyword matching
    const tagSuggestion = suggestTagsFromKeywords(
      title,
      description,
      availableTags
    );

    return NextResponse.json({
      ageGroup: ageSuggestion.category,
      ageExplanation: ageSuggestion.explanation,
      theme: tagSuggestion.tags.join(', '), // Join multiple tags with comma
      themeExplanation: tagSuggestion.explanation,
      tags: tagSuggestion.tags, // Also return as array for flexibility
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