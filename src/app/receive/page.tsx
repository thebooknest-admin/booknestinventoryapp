'use client';

import { useState, useEffect } from 'react';
import { Sparkles, RotateCcw, Copy, Info } from 'lucide-react';
import { colors, typography, spacing, radii } from '@/styles/tokens';

interface BookDetails {
  isbn: string;
  title: string;
  author: string;
}

interface BinOption {
  bin_code: string;
  display_name: string | null;
}

interface BinHelpResponse {
  bin_code: string;
  display_name: string | null;
  description?: string | null;
  notes?: string | null;
  tags?: string[];
}

interface SuggestAgeThemeResponse {
  age_group?: string | null;
  theme_tags?: string[];
}

interface SuggestTagsAndBinResponse {
  age_group: string | null;
  suggested_tags: string[];
  suggested_bins: Array<{
    bin_code: string;
    display_name: string | null;
    age_group: string | null;
    tag_names: string[];
    reason: string | null;
  }>;
}

const AGE_GROUP_OPTIONS = [
  { value: 'Hatchlings', label: 'Hatchlings (0-2)' },
  { value: 'Fledglings', label: 'Fledglings (3-5)' },
  { value: 'Soarers', label: 'Soarers (6-8)' },
  { value: 'Sky Readers', label: 'Sky Readers (9-12)' },
];

export default function ReceivePage() {
  const [isbnInput, setIsbnInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [book, setBook] = useState<BookDetails | null>(null);
  const [ageGroup, setAgeGroup] = useState('');
  const [bin, setBin] = useState('');
  const [bins, setBins] = useState<BinOption[]>([]);
  const [binHelp, setBinHelp] = useState<BinHelpResponse | null>(null);
  const [ageSuggestion, setAgeSuggestion] = useState<SuggestAgeThemeResponse | null>(null);
  const [receiveMessage, setReceiveMessage] = useState<string | null>(null);
  const [receiveError, setReceiveError] = useState<string | null>(null);
  const [isReceiving, setIsReceiving] = useState(false);

  // New: helper for summary-based tag/bin suggestions
  const [summaryText, setSummaryText] = useState('');
  const [suggestAgeGroup, setSuggestAgeGroup] = useState('');
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [suggestedBins, setSuggestedBins] = useState<SuggestTagsAndBinResponse['suggested_bins']>([]);

  useEffect(() => {
    loadBins();
  }, []);

  async function loadBins() {
    try {
      const res = await fetch('/api/bins', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setBins(
  (data.bins || []).map((b: { bin_code: string; display_name: string | null }) => ({
    bin_code: b.bin_code,
    display_name: b.display_name ?? null,
  }))
);
    } catch (err) {
      console.error('Failed to load bins:', err);
    }
  }

  async function handleLookupIsbn() {
    const trimmed = isbnInput.trim();
    if (!trimmed) return;

    setLoading(true);
    setBook(null);
    setAgeSuggestion(null);
    setReceiveMessage(null);
    setReceiveError(null);

    try {
      const res = await fetch(`/api/book?isbn=${encodeURIComponent(trimmed)}`);
      if (!res.ok) {
        throw new Error('Lookup failed');
      }
      const data = await res.json();
      setBook({
        isbn: trimmed,
        title: data.title || '',
        author: data.author || '',
      });

      // Call age/theme suggestion endpoint
      try {
        const suggestRes = await fetch('/api/suggest-age-theme', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isbn: trimmed, title: data.title, author: data.author }),
        });
        if (suggestRes.ok) {
          const suggest = (await suggestRes.json()) as SuggestAgeThemeResponse;
          setAgeSuggestion(suggest);
        }
      } catch (err) {
        console.error('Error calling suggest-age-theme:', err);
      }
    } catch (err) {
      console.error('Error looking up book:', err);
      setReceiveError('Could not look up this ISBN. You can still enter details manually.');
    } finally {
      setLoading(false);
    }
  }

  async function handleReceive() {
    if (!book || !ageGroup || !bin) {
      setReceiveError('Please fill in book details, age group, and bin.');
      return;
    }
    setIsReceiving(true);
    setReceiveError(null);
    setReceiveMessage(null);

    try {
      const res = await fetch('/api/receive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isbn: book.isbn,
          title: book.title,
          author: book.author,
          age_group: ageGroup,
          bin_code: bin,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Failed to receive book');
      }

      setReceiveMessage('Book received into inventory.');
    } catch (err) {
  console.error('Error receiving book:', err);
  const message =
    err instanceof Error ? err.message : 'Failed to receive book.';
  setReceiveError(message);
} finally {
      setIsReceiving(false);
    }
  }

  async function loadBinHelp(binCode: string) {
    if (!binCode) {
      setBinHelp(null);
      return;
    }
    try {
      const res = await fetch(`/api/bin-help?binCode=${encodeURIComponent(binCode)}`);
      if (!res.ok) return;
      const data = (await res.json()) as BinHelpResponse;
      setBinHelp(data);
    } catch (err) {
      console.error('Failed to load bin help:', err);
    }
  }

  function handleNewScan() {
    setIsbnInput('');
    setBook(null);
    setAgeGroup('');
    setBin('');
    setBinHelp(null);
    setAgeSuggestion(null);
    setReceiveMessage(null);
    setReceiveError(null);
    setSummaryText('');
    setSuggestAgeGroup('');
    setSuggestedTags([]);
    setSuggestedBins([]);
    setSuggestionError(null);
  }

  async function handleSuggestTagsAndBin() {
    const summary = summaryText.trim();
    const chosenAge = suggestAgeGroup || ageGroup;

    if (!summary) {
      setSuggestionError('Please paste a summary or notes first.');
      return;
    }

    setSuggestionLoading(true);
    setSuggestionError(null);
    setSuggestedTags([]);
    setSuggestedBins([]);

    try {
      const res = await fetch('/api/suggest-tags-and-bin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary, ageGroup: chosenAge || null }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Suggestion failed');
      }

      const data = (await res.json()) as SuggestTagsAndBinResponse;
      setSuggestedTags(data.suggested_tags || []);
      setSuggestedBins(data.suggested_bins || []);

      // If we got a top bin and no bin is selected yet, pre-fill it
      if (!bin && data.suggested_bins && data.suggested_bins.length > 0) {
        setBin(data.suggested_bins[0].bin_code);
        void loadBinHelp(data.suggested_bins[0].bin_code);
      }

      // If we have no age group yet but the suggestion returned one, pre-fill it
      if (!ageGroup && data.age_group) {
        setAgeGroup(data.age_group);
      }
    } catch (err) {
  console.error('Error suggesting tags/bin:', err);
  const message =
    err instanceof Error ? err.message : 'Could not suggest tags/bin.';
      setSuggestionError(message);
} finally {
      setSuggestionLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: spacing.xl,
        maxWidth: '900px',
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
        <h1
          style={{
            fontFamily: typography.fontFamily.heading,
            fontSize: typography.fontSize['3xl'],
            fontWeight: typography.fontWeight.bold,
            color: colors.primary,
            margin: 0,
            marginBottom: spacing.xs,
          }}
        >
          Receive books
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: typography.fontSize.sm,
            color: colors.textLight,
          }}
        >
          Scan or enter ISBN, confirm details, and assign an age group & bin.
        </p>
      </header>

      {/* Step 1: Scan ISBN */}
      <section
        style={{
          marginBottom: spacing.xl,
          padding: spacing.lg,
          borderRadius: radii.md,
          backgroundColor: colors.surface,
          border: `2px solid ${colors.border}`,
        }}
      >
        <h2
          style={{
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.bold,
            marginTop: 0,
            marginBottom: spacing.md,
          }}
        >
          Step 1 — Scan or enter ISBN
        </h2>

        <div
          style={{
            display: 'flex',
            gap: spacing.sm,
            alignItems: 'center',
            marginBottom: spacing.sm,
          }}
        >
          <input
            type="text"
            value={isbnInput}
            onChange={(e) => setIsbnInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleLookupIsbn();
              }
            }}
            placeholder="Scan ISBN barcode or type it here"
            style={{
              flex: 1,
              padding: spacing.sm,
              borderRadius: radii.sm,
              border: `2px solid ${colors.border}`,
              fontSize: typography.fontSize.base,
              fontFamily: 'monospace',
            }}
          />
          <button
            type="button"
            onClick={() => void handleLookupIsbn()}
            disabled={!isbnInput.trim() || loading}
            style={{
              padding: `${spacing.sm} ${spacing.lg}`,
              backgroundColor: isbnInput.trim() ? colors.primary : colors.border,
              color: isbnInput.trim() ? colors.cream : colors.textLight,
              border: `2px solid ${isbnInput.trim() ? colors.primary : colors.border}`,
              borderRadius: radii.sm,
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.bold,
              textTransform: 'uppercase',
              cursor: isbnInput.trim() && !loading ? 'pointer' : 'not-allowed',
            }}
          >
            {loading ? 'Looking up…' : 'Lookup'}</button>
        </div>

        {book && (
          <div
            style={{
              marginTop: spacing.sm,
              fontSize: typography.fontSize.xs,
              color: colors.textLight,
            }}
          >
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(book.isbn)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: `${spacing.xs} ${spacing.sm}`,
                borderRadius: radii.full,
                border: `1px solid ${colors.border}`,
                backgroundColor: colors.surface,
                fontSize: typography.fontSize.xs,
                cursor: 'pointer',
              }}
            >
              <Copy size={14} /> ISBN {book.isbn}
            </button>
          </div>
        )}
      </section>

      {/* Step 2: Book details */}
      <section
        style={{
          marginBottom: spacing.xl,
          padding: spacing.lg,
          borderRadius: radii.md,
          backgroundColor: colors.surface,
          border: `2px solid ${colors.border}`,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: spacing.md,
          }}
        >
          <h2
            style={{
              fontSize: typography.fontSize.lg,
              fontWeight: typography.fontWeight.bold,
              margin: 0,
            }}
          >
            Step 2 — Confirm book details
          </h2>
          <button
            type="button"
            onClick={handleNewScan}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: `${spacing.xs} ${spacing.sm}`,
              borderRadius: radii.full,
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.surface,
              fontSize: typography.fontSize.xs,
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={14} /> New scan
          </button>
        </div>

        <div style={{ marginBottom: spacing.md }}>
          <label
            style={{
              display: 'block',
              fontSize: typography.fontSize.xs,
              fontWeight: typography.fontWeight.bold,
              color: colors.textLight,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: spacing.xs,
            }}
          >
            Title
          </label>
          <input
            type="text"
            value={book?.title || ''}
            onChange={(e) =>
              setBook((prev) =>
                prev ? { ...prev, title: e.target.value } : { isbn: isbnInput, title: e.target.value, author: '' }
              )
            }
            placeholder="Book title"
            style={{
              width: '100%',
              padding: spacing.sm,
              borderRadius: radii.sm,
              border: `2px solid ${colors.border}`,
              fontSize: typography.fontSize.base,
            }}
          />
        </div>

        <div style={{ marginBottom: spacing.md }}>
          <label
            style={{
              display: 'block',
              fontSize: typography.fontSize.xs,
              fontWeight: typography.fontWeight.bold,
              color: colors.textLight,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: spacing.xs,
            }}
          >
            Author
          </label>
          <input
            type="text"
            value={book?.author || ''}
            onChange={(e) =>
              setBook((prev) =>
                prev ? { ...prev, author: e.target.value } : { isbn: isbnInput, title: '', author: e.target.value }
              )
            }
            placeholder="Author name"
            style={{
              width: '100%',
              padding: spacing.sm,
              borderRadius: radii.sm,
              border: `2px solid ${colors.border}`,
              fontSize: typography.fontSize.base,
            }}
          />
        </div>

        {ageSuggestion && (
          <div
            style={{
              marginTop: spacing.sm,
              padding: spacing.sm,
              borderRadius: radii.sm,
              backgroundColor: colors.cream,
              fontSize: typography.fontSize.xs,
              color: colors.textLight,
            }}
          >
            <span style={{ fontWeight: typography.fontWeight.semibold }}>Suggested age group:</span>{' '}
            {ageSuggestion.age_group || '—'}{' '}
            {ageSuggestion.theme_tags && ageSuggestion.theme_tags.length > 0 && (
              <>
                · Tags: {ageSuggestion.theme_tags.join(', ')}
              </>
            )}
          </div>
        )}
      </section>

      {/* Step 3: Age group & bin */}
      <section
        style={{
          marginBottom: spacing.xl,
          padding: spacing.lg,
          borderRadius: radii.md,
          backgroundColor: colors.surface,
          border: `2px solid ${colors.border}`,
        }}
      >
        <h2
          style={{
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.bold,
            marginTop: 0,
            marginBottom: spacing.md,
          }}
        >
          Step 3 — Assign age group & bin
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: spacing.lg,
            marginBottom: spacing.lg,
          }}
        >
          {/* Age group */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: typography.fontSize.xs,
                fontWeight: typography.fontWeight.bold,
                color: colors.textLight,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: spacing.xs,
              }}
            >
              Age group
            </label>
            <select
              value={ageGroup}
              onChange={(e) => setAgeGroup(e.target.value)}
              style={{
                width: '100%',
                padding: spacing.sm,
                borderRadius: radii.sm,
                border: `2px solid ${colors.border}`,
                fontSize: typography.fontSize.base,
              }}
            >
              <option value="">Select an age band…</option>
              {AGE_GROUP_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Bin */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: typography.fontSize.xs,
                fontWeight: typography.fontWeight.bold,
                color: colors.textLight,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: spacing.xs,
              }}
            >
              Bin location
            </label>
            <div
              style={{
                display: 'flex',
                gap: spacing.sm,
                alignItems: 'center',
              }}
            >
              <select
                value={bin}
                onChange={(e) => {
                  setBin(e.target.value);
                  void loadBinHelp(e.target.value);
                }}
                style={{
                  flex: 1,
                  padding: spacing.sm,
                  borderRadius: radii.sm,
                  border: `2px solid ${colors.border}`,
                  fontSize: typography.fontSize.base,
                  fontFamily: 'monospace',
                }}
              >
                <option value="">Select bin…</option>
                {bins.map((b) => (
                  <option key={b.bin_code} value={b.bin_code}>
                    {b.bin_code}
                    {b.display_name && b.display_name !== b.bin_code
                      ? ` — ${b.display_name}`
                      : ''}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void loadBinHelp(bin)}
                disabled={!bin}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: spacing.xs,
                  borderRadius: radii.full,
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.surface,
                  cursor: bin ? 'pointer' : 'not-allowed',
                }}
              >
                <Info size={16} />
              </button>
            </div>
          </div>
        </div>

        {binHelp && (
          <div
            style={{
              marginBottom: spacing.lg,
              padding: spacing.md,
              borderRadius: radii.sm,
              backgroundColor: colors.cream,
              fontSize: typography.fontSize.sm,
            }}
          >
            <div
              style={{
                fontWeight: typography.fontWeight.semibold,
                marginBottom: spacing.xs,
              }}
            >
              {binHelp.bin_code}
              {binHelp.display_name
                ? ` — ${binHelp.display_name}`
                : ''}
            </div>
            {binHelp.description && (
              <p
                style={{
                  margin: 0,
                  marginBottom: spacing.xs,
                  color: colors.text,
                }}
              >
                {binHelp.description}
              </p>
            )}
            {binHelp.tags && binHelp.tags.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: spacing.xs,
                  marginTop: spacing.xs,
                }}
              >
                {binHelp.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      padding: `${spacing.xs} ${spacing.sm}`,
                      borderRadius: radii.full,
                      border: `1px solid ${colors.border}`,
                      fontSize: typography.fontSize.xs,
                      color: colors.textLight,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Summary-based helper */}
        <div
          style={{
            marginTop: spacing.lg,
            paddingTop: spacing.lg,
            borderTop: `1px dashed ${colors.border}`,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: spacing.sm,
              alignItems: 'center',
              marginBottom: spacing.sm,
            }}
          >
            <div
              style={{
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.semibold,
                color: colors.text,
              }}
            >
              Need help choosing tags & bin?
            </div>
            <button
              type="button"
              onClick={handleSuggestTagsAndBin}
              disabled={suggestionLoading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: `${spacing.xs} ${spacing.sm}`,
                borderRadius: radii.full,
                border: `1px solid ${colors.primary}`,
                backgroundColor: colors.surface,
                color: colors.primary,
                fontSize: typography.fontSize.xs,
                fontWeight: typography.fontWeight.semibold,
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              <Sparkles size={14} />
              {suggestionLoading ? 'Suggesting…' : 'Suggest tags & bin'}
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)',
              gap: spacing.md,
              alignItems: 'flex-start',
            }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: typography.fontSize.xs,
                  fontWeight: typography.fontWeight.bold,
                  color: colors.textLight,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: spacing.xs,
                }}
              >
                Paste summary or notes
              </label>
              <textarea
                value={summaryText}
                onChange={(e) => {
                  setSummaryText(e.target.value);
                  setSuggestionError(null);
                }}
                rows={4}
                placeholder="Paste the back-cover blurb or your notes about the story, themes, or tone."
                style={{
                  width: '100%',
                  padding: spacing.sm,
                  borderRadius: radii.sm,
                  border: `2px solid ${colors.border}`,
                  fontSize: typography.fontSize.sm,
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: typography.fontSize.xs,
                  fontWeight: typography.fontWeight.bold,
                  color: colors.textLight,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: spacing.xs,
                }}
              >
                Age group for suggestions (optional)
              </label>
              <select
                value={suggestAgeGroup}
                onChange={(e) => setSuggestAgeGroup(e.target.value)}
                style={{
                  width: '100%',
                  padding: spacing.sm,
                  borderRadius: radii.sm,
                  border: `2px solid ${colors.border}`,
                  fontSize: typography.fontSize.sm,
                }}
              >
                <option value="">Use selected age group (if any)</option>
                {AGE_GROUP_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {suggestionError && (
                <div
                  style={{
                    marginTop: spacing.sm,
                    fontSize: typography.fontSize.xs,
                    color: colors.textLight,
                  }}
                >
                  {suggestionError}
                </div>
              )}

              {suggestedTags.length > 0 && (
                <div
                  style={{
                    marginTop: spacing.md,
                    fontSize: typography.fontSize.xs,
                    color: colors.textLight,
                  }}
                >
                  <div
                    style={{
                      marginBottom: spacing.xs,
                      fontWeight: typography.fontWeight.semibold,
                    }}
                  >
                    Suggested tags
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: spacing.xs,
                    }}
                  >
                    {suggestedTags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          padding: `${spacing.xs} ${spacing.sm}`,
                          borderRadius: radii.full,
                          border: `1px solid ${colors.border}`,
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {suggestedBins.length > 0 && (
                <div
                  style={{
                    marginTop: spacing.md,
                    fontSize: typography.fontSize.xs,
                    color: colors.textLight,
                  }}
                >
                  <div
                    style={{
                      marginBottom: spacing.xs,
                      fontWeight: typography.fontWeight.semibold,
                    }}
                  >
                    Suggested bins
                  </div>
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: spacing.lg,
                    }}
                  >
                    {suggestedBins.map((b) => (
                      <li key={b.bin_code}>
                        <span
                          style={{
                            fontWeight: typography.fontWeight.semibold,
                            color: colors.text,
                          }}
                        >
                          {b.bin_code}
                        </span>
                        {b.display_name && ` — ${b.display_name}`}
                        {b.reason && (
                          <span
                            style={{
                              color: colors.textLight,
                              marginLeft: spacing.xs,
                            }}
                          >
                            ({b.reason})
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Receive action */}
      <section
        style={{
          marginBottom: spacing.xl,
          padding: spacing.lg,
          borderRadius: radii.md,
          backgroundColor: colors.surface,
          border: `2px solid ${colors.border}`,
        }}
      >
        <button
          type="button"
          onClick={() => void handleReceive()}
          disabled={isReceiving}
          style={{
            padding: `${spacing.sm} ${spacing.xl}`,
            backgroundColor: colors.primary,
            color: colors.cream,
            border: `2px solid ${colors.primary}`,
            borderRadius: radii.sm,
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.bold,
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          {isReceiving ? 'Receiving…' : 'Receive book →'}
        </button>

        {receiveMessage && (
          <div
            style={{
              marginTop: spacing.sm,
              fontSize: typography.fontSize.sm,
              color: colors.textLight,
            }}
          >
            {receiveMessage}
          </div>
        )}

        {receiveError && (
          <div
            style={{
              marginTop: spacing.sm,
              fontSize: typography.fontSize.sm,
              color: colors.textLight,
            }}
          >
            {receiveError}
          </div>
        )}
      </section>
    </div>
  );
}
