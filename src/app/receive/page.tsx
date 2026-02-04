'use client';

import { useState } from 'react';
import Link from 'next/link';
import { colors, typography, spacing, radii } from '@/styles/tokens';
import { receiveBook } from '@/app/actions/receive';

interface BookData {
  isbn: string;
  title: string;
  author: string;
  coverUrl: string | null;
}

const AGE_GROUP_LABELS: Record<string, string> = {
  hatchlings: 'Hatchlings (0-2)',
  fledglings: 'Fledglings (3-5)',
  soarers: 'Soarers (6-8)',
  sky_readers: 'Sky Readers (9-12)',
};

export default function ReceivePage() {
  const [isbnInput, setIsbnInput] = useState('');
  const [bookData, setBookData] = useState<BookData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isManualEntry, setIsManualEntry] = useState(false);

  // Form data
  const [ageGroup, setAgeGroup] = useState('');
  const [bin, setBin] = useState('');
  const [theme, setTheme] = useState<string | null>(null);

  // AI suggestion state
  const [ageSuggestion, setAgeSuggestion] = useState<{
    category: string;
    explanation: string;
  } | null>(null);
  const [themeSuggestion, setThemeSuggestion] = useState<{
    theme: string;
    explanation: string;
  } | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);

  // Bin suggestion state
  const [binSuggestion, setBinSuggestion] = useState<string | null>(null);
  const [isFetchingBin, setIsFetchingBin] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchBinSuggestion = async (selectedAgeGroup: string, selectedTheme: string | null = null) => {
    if (!selectedAgeGroup) return;

    setIsFetchingBin(true);
    setBinSuggestion(null);

    try {
      const response = await fetch('/api/suggest-bin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ageGroup: selectedAgeGroup,
          theme: selectedTheme,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.suggestedBin) {
          setBinSuggestion(data.suggestedBin);
          setBin(data.suggestedBin);
        }
      }
    } catch (err) {
      console.error('Failed to get bin suggestion:', err);
    } finally {
      setIsFetchingBin(false);
    }
  };

  const fetchAgeAndThemeSuggestion = async (bookData: BookData) => {
    setIsSuggesting(true);
    setAgeSuggestion(null);
    setThemeSuggestion(null);

    try {
      const response = await fetch('/api/suggest-age-theme', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: bookData.title,
          author: bookData.author,
          isbn: bookData.isbn,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.ageGroup) {
          setAgeSuggestion({
            category: data.ageGroup,
            explanation: data.ageExplanation,
          });
          setAgeGroup(data.ageGroup);
        }
        if (data.theme) {
          setThemeSuggestion({
            theme: data.theme,
            explanation: data.themeExplanation,
          });
          setTheme(data.theme);

          // Now fetch bin suggestion with both age and theme
          if (data.ageGroup) {
            fetchBinSuggestion(data.ageGroup, data.theme);
          }
        }
      }
    } catch (err) {
      console.error('Failed to get suggestions:', err);
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleIsbnScan = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isbnInput.trim()) {
      setError('Please enter an ISBN');
      return;
    }

    setIsLoading(true);
    setError(null);
    setBookData(null);
    setSuccessMessage(null);
    setAgeSuggestion(null);
    setThemeSuggestion(null);
    setBinSuggestion(null);

    try {
      const response = await fetch(`/api/books?isbn=${encodeURIComponent(isbnInput.trim())}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch book data');
      }

      const data = await response.json();
      setBookData(data);

      // Reset form fields
      setAgeGroup('');
      setBin('');
      setTheme(null);
      setIsManualEntry(false);

      // Automatically fetch age and theme suggestions
      fetchAgeAndThemeSuggestion(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch book data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!bookData) return;

    if (!ageGroup) {
      setError('Please select an age group');
      return;
    }

    // Validate title and author for manual entry
    if (isManualEntry && (!bookData.title || !bookData.author)) {
      setError('Please enter title and author');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await receiveBook(
        {
          isbn: bookData.isbn,
          title: bookData.title,
          author: bookData.author,
          coverUrl: bookData.coverUrl,
          theme: theme,
        },
        {
          isbn: bookData.isbn,
          ageGroup,
          bin,
        }
      );

      if (result.success && result.sku) {
        setSuccessMessage(`✓ Book received! SKU: ${result.sku}`);

        setTimeout(() => {
          setIsbnInput('');
          setBookData(null);
          setAgeGroup('');
          setBin('');
          setTheme(null);
          setSuccessMessage(null);
          setAgeSuggestion(null);
          setThemeSuggestion(null);
          setBinSuggestion(null);
          setIsManualEntry(false);
        }, 2000);
      } else {
        setError(result.error || 'Failed to receive book');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewScan = () => {
    setIsbnInput('');
    setBookData(null);
    setAgeGroup('');
    setBin('');
    setTheme(null);
    setError(null);
    setSuccessMessage(null);
    setAgeSuggestion(null);
    setThemeSuggestion(null);
    setBinSuggestion(null);
    setIsManualEntry(false);
  };

  const handleManualEntry = () => {
    setIsManualEntry(true);
    setError(null);
    setBookData({
      isbn: isbnInput.trim(),
      title: '',
      author: '',
      coverUrl: null,
    });
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: spacing.xl,
        maxWidth: '1000px',
        margin: '0 auto',
      }}
    >
      <header
        style={{
          marginBottom: spacing.xl,
          paddingBottom: spacing.lg,
          borderBottom: `3px solid ${colors.primary}`,
        }}
      >
        <Link
          href="/dashboard"
          style={{
            display: 'inline-block',
            color: colors.primary,
            textDecoration: 'none',
            fontSize: typography.fontSize.base,
            fontWeight: typography.fontWeight.semibold,
            marginBottom: spacing.sm,
          }}
        >
          ← DASHBOARD
        </Link>
        <h1
          style={{
            fontFamily: typography.fontFamily.heading,
            fontSize: typography.fontSize['3xl'],
            fontWeight: typography.fontWeight.bold,
            color: colors.primary,
            margin: 0,
          }}
        >
          Receive Books
        </h1>
      </header>

      {/* Success Message */}
      {successMessage && (
        <div
          style={{
            backgroundColor: colors.success,
            color: colors.deepCocoa,
            padding: spacing.lg,
            borderRadius: radii.md,
            marginBottom: spacing.lg,
            fontSize: typography.fontSize.xl,
            fontWeight: typography.fontWeight.bold,
            textAlign: 'center',
            border: `3px solid ${colors.sageMist}`,
          }}
        >
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div>
          <div
            style={{
              backgroundColor: colors.warning,
              color: colors.deepCocoa,
              padding: spacing.lg,
              borderRadius: radii.md,
              marginBottom: spacing.lg,
              fontSize: typography.fontSize.base,
              fontWeight: typography.fontWeight.semibold,
              border: `3px solid ${colors.mustardOchre}`,
            }}
          >
            {error}
          </div>

          {/* Manual Entry Button */}
          <button
            onClick={handleManualEntry}
            style={{
              width: '100%',
              padding: spacing.lg,
              backgroundColor: colors.secondary,
              color: colors.cream,
              border: `3px solid ${colors.secondary}`,
              fontSize: typography.fontSize.lg,
              fontWeight: typography.fontWeight.bold,
              textTransform: 'uppercase',
              borderRadius: radii.md,
              cursor: 'pointer',
              marginBottom: spacing.lg,
            }}
          >
            ✏️ Enter Book Info Manually
          </button>
        </div>
      )}

      {/* ISBN Scan Form */}
      {!bookData && (
        <form onSubmit={handleIsbnScan}>
          <div
            style={{
              backgroundColor: colors.surface,
              border: `3px solid ${colors.border}`,
              borderRadius: radii.md,
              padding: spacing.xl,
              marginBottom: spacing.lg,
            }}
          >
            <label
              style={{
                display: 'block',
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.bold,
                color: colors.textLight,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: spacing.sm,
              }}
            >
              Scan or Enter ISBN
            </label>
            <input
              type="text"
              value={isbnInput}
              onChange={(e) => setIsbnInput(e.target.value)}
              placeholder="Scan barcode or type ISBN..."
              autoFocus
              disabled={isLoading}
              style={{
                width: '100%',
                padding: spacing.md,
                fontSize: typography.fontSize['2xl'],
                fontWeight: typography.fontWeight.bold,
                color: colors.text,
                backgroundColor: colors.cream,
                border: `3px solid ${colors.border}`,
                borderRadius: radii.md,
                fontFamily: 'monospace',
                boxSizing: 'border-box',
                marginBottom: spacing.md,
              }}
            />
            <button
              type="submit"
              disabled={isLoading || !isbnInput.trim()}
              style={{
                width: '100%',
                padding: spacing.lg,
                backgroundColor: isLoading || !isbnInput.trim() ? colors.border : colors.primary,
                color: isLoading || !isbnInput.trim() ? colors.textLight : colors.cream,
                border: `3px solid ${isLoading || !isbnInput.trim() ? colors.border : colors.primary}`,
                fontSize: typography.fontSize.lg,
                fontWeight: typography.fontWeight.bold,
                textTransform: 'uppercase',
                borderRadius: radii.md,
                cursor: isLoading || !isbnInput.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {isLoading ? 'LOOKING UP...' : 'LOOKUP BOOK'}
            </button>
          </div>
        </form>
      )}

      {/* Book Details & Receiving Form */}
      {bookData && (
        <form onSubmit={handleSubmit}>
          {/* Book Info Display */}
          <div
            style={{
              backgroundColor: colors.surface,
              border: `3px solid ${colors.border}`,
              borderRadius: radii.md,
              padding: spacing.xl,
              marginBottom: spacing.lg,
            }}
          >
            {isManualEntry ? (
              /* Manual Entry Fields */
              <div style={{ marginBottom: spacing.lg }}>
                <div style={{ marginBottom: spacing.lg }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.bold,
                      color: colors.textLight,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: spacing.sm,
                    }}
                  >
                    ISBN
                  </label>
                  <input
                    type="text"
                    value={bookData.isbn}
                    onChange={(e) => setBookData({ ...bookData, isbn: e.target.value })}
                    placeholder="Enter ISBN"
                    style={{
                      width: '100%',
                      padding: spacing.md,
                      fontSize: typography.fontSize.base,
                      color: colors.text,
                      backgroundColor: colors.cream,
                      border: `3px solid ${colors.border}`,
                      borderRadius: radii.md,
                      fontFamily: 'monospace',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ marginBottom: spacing.lg }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.bold,
                      color: colors.textLight,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: spacing.sm,
                    }}
                  >
                    Title *
                  </label>
                  <input
                    type="text"
                    value={bookData.title}
                    onChange={(e) => setBookData({ ...bookData, title: e.target.value })}
                    placeholder="Enter book title"
                    required
                    style={{
                      width: '100%',
                      padding: spacing.md,
                      fontSize: typography.fontSize.lg,
                      fontWeight: typography.fontWeight.bold,
                      color: colors.text,
                      backgroundColor: colors.cream,
                      border: `3px solid ${colors.border}`,
                      borderRadius: radii.md,
                      fontFamily: typography.fontFamily.body,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ marginBottom: spacing.lg }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.bold,
                      color: colors.textLight,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: spacing.sm,
                    }}
                  >
                    Author *
                  </label>
                  <input
                    type="text"
                    value={bookData.author}
                    onChange={(e) => setBookData({ ...bookData, author: e.target.value })}
                    placeholder="Enter author name"
                    required
                    style={{
                      width: '100%',
                      padding: spacing.md,
                      fontSize: typography.fontSize.base,
                      color: colors.text,
                      backgroundColor: colors.cream,
                      border: `3px solid ${colors.border}`,
                      borderRadius: radii.md,
                      fontFamily: typography.fontFamily.body,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ marginBottom: spacing.lg }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.bold,
                      color: colors.textLight,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: spacing.sm,
                    }}
                  >
                    Cover Image URL (optional)
                  </label>
                  <input
                    type="text"
                    value={bookData.coverUrl || ''}
                    onChange={(e) => setBookData({ ...bookData, coverUrl: e.target.value || null })}
                    placeholder="https://example.com/cover.jpg"
                    style={{
                      width: '100%',
                      padding: spacing.md,
                      fontSize: typography.fontSize.sm,
                      color: colors.text,
                      backgroundColor: colors.cream,
                      border: `3px solid ${colors.border}`,
                      borderRadius: radii.md,
                      fontFamily: 'monospace',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
            ) : (
              /* Auto-fetched Book Display */
              <div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: bookData.coverUrl ? '150px 1fr' : '1fr',
                    gap: spacing.lg,
                    marginBottom: spacing.lg,
                  }}
                >
                  {bookData.coverUrl && (
                    <img
                      src={bookData.coverUrl}
                      alt={bookData.title}
                      style={{
                        width: '150px',
                        height: 'auto',
                        border: `2px solid ${colors.border}`,
                        borderRadius: radii.sm,
                      }}
                    />
                  )}
                  <div>
                    <h2
                      style={{
                        fontSize: typography.fontSize.xl,
                        fontWeight: typography.fontWeight.bold,
                        color: colors.text,
                        margin: 0,
                        marginBottom: spacing.xs,
                      }}
                    >
                      {bookData.title}
                    </h2>
                    <p
                      style={{
                        fontSize: typography.fontSize.lg,
                        color: colors.textLight,
                        margin: 0,
                        marginBottom: spacing.sm,
                      }}
                    >
                      {bookData.author}
                    </p>
                    <p
                      style={{
                        fontSize: typography.fontSize.sm,
                        color: colors.textLight,
                        fontFamily: 'monospace',
                        margin: 0,
                      }}
                    >
                      ISBN: {bookData.isbn}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleNewScan}
              style={{
                padding: `${spacing.sm} ${spacing.md}`,
                backgroundColor: colors.surface,
                color: colors.textLight,
                border: `2px solid ${colors.border}`,
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.semibold,
                textTransform: 'uppercase',
                borderRadius: radii.sm,
                cursor: 'pointer',
              }}
            >
              Different Book
            </button>
          </div>

          {/* Receiving Details Form */}
          <div
            style={{
              backgroundColor: colors.surface,
              border: `3px solid ${colors.border}`,
              borderRadius: radii.md,
              padding: spacing.xl,
              marginBottom: spacing.lg,
            }}
          >
            <h3
              style={{
                fontSize: typography.fontSize.lg,
                fontWeight: typography.fontWeight.bold,
                color: colors.text,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                margin: 0,
                marginBottom: spacing.lg,
              }}
            >
              Receiving Details
            </h3>

            {/* Age Group with Suggestion */}
            <div style={{ marginBottom: spacing.lg }}>
              <label
                style={{
                  display: 'block',
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.bold,
                  color: colors.textLight,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: spacing.sm,
                }}
              >
                Age Group *
              </label>

              {/* Suggestion Loading */}
              {isSuggesting && (
                <div
                  style={{
                    padding: spacing.sm,
                    backgroundColor: colors.cream,
                    border: `2px solid ${colors.border}`,
                    borderRadius: radii.sm,
                    marginBottom: spacing.sm,
                    fontSize: typography.fontSize.sm,
                    color: colors.textLight,
                  }}
                >
                  🤔 Analyzing book to suggest age category and theme...
                </div>
              )}

              {/* Age Suggestion Result */}
              {ageSuggestion && (
                <div
                  style={{
                    padding: spacing.md,
                    backgroundColor: colors.sageMist,
                    border: `2px solid ${colors.deepTeal}`,
                    borderRadius: radii.sm,
                    marginBottom: spacing.sm,
                  }}
                >
                  <div
                    style={{
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.bold,
                      color: colors.deepCocoa,
                      marginBottom: spacing.xs,
                    }}
                  >
                    💡 Suggested: {AGE_GROUP_LABELS[ageSuggestion.category]}
                  </div>
                  <div
                    style={{
                      fontSize: typography.fontSize.xs,
                      color: colors.deepCocoa,
                    }}
                  >
                    {ageSuggestion.explanation}
                  </div>
                </div>
              )}

              {/* Theme Suggestion */}
              {themeSuggestion && (
                <div
                  style={{
                    padding: spacing.md,
                    backgroundColor: colors.goldenHoney,
                    border: `2px solid ${colors.mustardOchre}`,
                    borderRadius: radii.sm,
                    marginBottom: spacing.sm,
                  }}
                >
                  <div
                    style={{
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.bold,
                      color: colors.deepCocoa,
                      marginBottom: spacing.xs,
                    }}
                  >
                    🏷️ Theme:{' '}
                    {themeSuggestion.theme.charAt(0).toUpperCase() + themeSuggestion.theme.slice(1)}
                  </div>
                  <div
                    style={{
                      fontSize: typography.fontSize.xs,
                      color: colors.deepCocoa,
                    }}
                  >
                    {themeSuggestion.explanation}
                  </div>
                </div>
              )}

              <select
                value={ageGroup}
                onChange={(e) => {
                  setAgeGroup(e.target.value);
                  // Fetch bin when age group changes
                  if (e.target.value) {
                    fetchBinSuggestion(e.target.value, theme);
                  }
                }}
                required
                style={{
                  width: '100%',
                  padding: spacing.md,
                  fontSize: typography.fontSize.lg,
                  fontWeight: typography.fontWeight.semibold,
                  color: colors.text,
                  backgroundColor: colors.cream,
                  border: `3px solid ${colors.border}`,
                  borderRadius: radii.md,
                  fontFamily: typography.fontFamily.body,
                  cursor: 'pointer',
                }}
              >
                <option value="">Select age group...</option>
                <option value="hatchlings">Hatchlings (0-2)</option>
                <option value="fledglings">Fledglings (3-5)</option>
                <option value="soarers">Soarers (6-8)</option>
                <option value="sky_readers">Sky Readers (9-12)</option>
              </select>
            </div>

            {/* Bin Location */}
            <div style={{ marginBottom: 0 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.bold,
                  color: colors.textLight,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: spacing.sm,
                }}
              >
                Bin Location
              </label>

              {/* Bin Suggestion Loading */}
              {isFetchingBin && (
                <div
                  style={{
                    padding: spacing.sm,
                    backgroundColor: colors.cream,
                    border: `2px solid ${colors.border}`,
                    borderRadius: radii.sm,
                    marginBottom: spacing.sm,
                    fontSize: typography.fontSize.sm,
                    color: colors.textLight,
                  }}
                >
                  🔍 Finding best available bin...
                </div>
              )}

              {/* Bin Suggestion */}
              {binSuggestion && (
                <div
                  style={{
                    padding: spacing.sm,
                    backgroundColor: colors.sageMist,
                    border: `2px solid ${colors.deepTeal}`,
                    borderRadius: radii.sm,
                    marginBottom: spacing.sm,
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.semibold,
                    color: colors.deepCocoa,
                  }}
                >
                  📍 Suggested: {binSuggestion}
                </div>
              )}

              <input
                type="text"
                value={bin}
                onChange={(e) => setBin(e.target.value.toUpperCase())}
                placeholder="e.g., A-12-3"
                style={{
                  width: '100%',
                  padding: spacing.md,
                  fontSize: typography.fontSize.lg,
                  fontWeight: typography.fontWeight.bold,
                  color: colors.text,
                  backgroundColor: colors.cream,
                  border: `3px solid ${colors.border}`,
                  borderRadius: radii.md,
                  fontFamily: 'monospace',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !ageGroup}
            style={{
              width: '100%',
              padding: spacing.xl,
              backgroundColor: isSubmitting || !ageGroup ? colors.border : colors.primary,
              color: isSubmitting || !ageGroup ? colors.textLight : colors.cream,
              border: `3px solid ${isSubmitting || !ageGroup ? colors.border : colors.primary}`,
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.bold,
              textTransform: 'uppercase',
              borderRadius: radii.md,
              cursor: isSubmitting || !ageGroup ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubmitting ? 'RECEIVING...' : 'RECEIVE BOOK →'}
          </button>
        </form>
      )}
    </div>
  );
}