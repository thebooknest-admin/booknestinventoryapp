async function fetchCoverFromOpenLibrary(isbn: string): Promise<string | null> {
  try {
    const cleanIsbn = isbn.replace(/[-\s]/g, '');
    const response = await fetch(`https://openlibrary.org/isbn/${cleanIsbn}.json`);
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    if (data.covers && data.covers[0]) {
      return `https://covers.openlibrary.org/b/id/${data.covers[0]}-L.jpg`;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

async function fetchCoverFromGoogleBooks(isbn: string): Promise<string | null> {
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
    
    if (book.imageLinks) {
      return book.imageLinks.extraLarge ||
             book.imageLinks.large ||
             book.imageLinks.medium ||
             book.imageLinks.small ||
             book.imageLinks.thumbnail ||
             null;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

async function fetchCoverForISBN(isbn: string): Promise<string | null> {
  // Try Open Library first
  let coverUrl = await fetchCoverFromOpenLibrary(isbn);
  
  // If no cover from Open Library, try Google Books
  if (!coverUrl) {
    coverUrl = await fetchCoverFromGoogleBooks(isbn);
  }
  
  return coverUrl;
}