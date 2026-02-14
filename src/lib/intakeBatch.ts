export type AgeTier = 'HATCH' | 'FLED' | 'SOAR' | 'SKY';

export type IntakeMetadata = {
  isbn: string;
  title: string;
  author: string;
  summary: string | null;
  readingAge: string | null;
  coverUrl: string | null;
};

export function normalizeIsbn(raw: string): string {
  return (raw || '').replace(/[-\s]/g, '').trim();
}

export function isValidIsbn(raw: string): boolean {
  const isbn = normalizeIsbn(raw);
  return /^\d{10}(\d{3})?$/.test(isbn);
}

export async function fetchBookMetadata(isbnRaw: string): Promise<IntakeMetadata> {
  const isbn = normalizeIsbn(isbnRaw);

  try {
    const olRes = await fetch(`https://openlibrary.org/isbn/${isbn}.json`, { cache: 'no-store' });
    if (olRes.ok) {
      const ol = await olRes.json();

      let author = 'Unknown Author';
      if (Array.isArray(ol.authors) && ol.authors[0]?.key) {
        const aRes = await fetch(`https://openlibrary.org${ol.authors[0].key}.json`, { cache: 'no-store' });
        if (aRes.ok) {
          const a = await aRes.json();
          author = a?.name || author;
        }
      }

      const coverUrl =
        Array.isArray(ol.covers) && ol.covers[0]
          ? `https://covers.openlibrary.org/b/id/${ol.covers[0]}-L.jpg`
          : null;

      return {
        isbn,
        title: ol?.title || 'Unknown Title',
        author,
        summary: typeof ol?.description === 'string' ? ol.description : ol?.description?.value || null,
        readingAge: ol?.reading_level || null,
        coverUrl,
      };
    }
  } catch {
    // fallback below
  }

  try {
    const gRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`, { cache: 'no-store' });
    if (gRes.ok) {
      const g = await gRes.json();
      const v = g?.items?.[0]?.volumeInfo;
      if (v) {
        return {
          isbn,
          title: v.title || 'Unknown Title',
          author: v.authors?.[0] || 'Unknown Author',
          summary: v.description || null,
          readingAge: v.maturityRating || null,
          coverUrl:
            v?.imageLinks?.extraLarge ||
            v?.imageLinks?.large ||
            v?.imageLinks?.medium ||
            v?.imageLinks?.small ||
            v?.imageLinks?.thumbnail ||
            null,
        };
      }
    }
  } catch {
    // fallback below
  }

  return {
    isbn,
    title: 'Unknown Title',
    author: 'Unknown Author',
    summary: null,
    readingAge: null,
    coverUrl: null,
  };
}

export function suggestAgeTier(meta: IntakeMetadata): AgeTier | null {
  const hay = `${meta.title} ${meta.summary || ''}`.toLowerCase();

  if (hay.includes('chapter') || hay.includes('middle grade')) return 'SKY';
  if (hay.includes('learn') || hay.includes('science') || hay.includes('history')) return 'SOAR';
  if (hay.includes('board book') || hay.includes('toddler') || hay.includes('baby')) return 'HATCH';
  return 'FLED';
}
