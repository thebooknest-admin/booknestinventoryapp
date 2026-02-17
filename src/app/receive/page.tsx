'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { colors, typography, spacing, radii } from '@/styles/tokens';
import { receiveBook } from '@/app/actions/receive';

interface BookData {
  isbn: string;
  title: string;
  author: string;
  coverUrl: string | null;
}

interface BinOption {
  bin_code: string;
  display_name: string | null;
  age_group: string | null;
}

const AGE_GROUP_LABELS: Record<string, string> = {
  hatchlings: 'Hatchlings (0-2)',
  fledglings: 'Fledglings (3-5)',
  soarers: 'Soarers (6-8)',
  sky_readers: 'Sky Readers (9-12)',
};

function normalizeAgeKey(v: string | null | undefined): string {
  const x = (v || '').trim().toLowerCase();
  if (x === 'hatch' || x === 'hatchlings') return 'hatchlings';
  if (x === 'fled' || x === 'fledglings') return 'fledglings';
  if (x === 'soar' || x === 'soarers') return 'soarers';
  if (x === 'sky' || x === 'sky_readers' || x === 'sky readers') return 'sky_readers';
  return x;
}

/**
 * Parse common Amazon-style age range strings into {minYears, maxYears}
 * Examples:
 * - "4-8 years"
 * - "Ages 3 to 5"
 * - "3+"
 * - "12 months - 2 years"
 * - "18-24 months"
 */
function parseAmazonAgeRange(inputRaw: string): { minYears: number; maxYears: number } | null {
  const input = (inputRaw || '').trim().toLowerCase();
  if (!input) return null;

  const monthsToYears = (m: number) => m / 12;

  const rangeRegex =
    /(\d+(\.\d+)?)\s*(months?|mos?|yrs?|years?)\s*(?:-|to|–|—)\s*(\d+(\.\d+)?)\s*(months?|mos?|yrs?|years?)/i;

  const rangeMatch = input.match(rangeRegex);
  if (rangeMatch) {
    const a = Number(rangeMatch[1]);
    const unitA = rangeMatch[3];
    const b = Number(rangeMatch[4]);
    const unitB = rangeMatch[6];

    const aYears = unitA.startsWith('mo') ? monthsToYears(a) : a;
    const bYears = unitB.startsWith('mo') ? monthsToYears(b) : b;

    return {
      minYears: Math.min(aYears, bYears),
      maxYears: Math.max(aYears, bYears),
    };
  }

  const agesToRegex = /ages?\s*(\d+(\.\d+)?)\s*(?:to|-|–|—)\s*(\d+(\.\d+)?)/i;
  const agesToMatch = input.match(agesToRegex);
  if (agesToMatch) {
    const a = Number(agesToMatch[1]);
    const b = Number(agesToMatch[3]);
    return { minYears: Math.min(a, b), maxYears: Math.max(a, b) };
  }

  const plusRegex = /(\d+(\.\d+)?)\s*(?:\+|\s*and up)/i;
  const plusMatch = input.match(plusRegex);
  if (plusMatch) {
    const a = Number(plusMatch[1]);
    return { minYears: a, maxYears: 12 };
  }

  const singleMonthsRegex = /(\d+(\.\d+)?)\s*(months?|mos?)/i;
  const singleMonthsMatch = input.match(singleMonthsRegex);
  if (singleMonthsMatch) {
    const m = Number(singleMonthsMatch[1]);
    const y = monthsToYears(m);
    return { minYears: y, maxYears: y };
  }

  const nums = input.match(/\d+(\.\d+)?/g);
  if (nums && nums.length === 1) {
    const a = Number(nums[0]);
    return { minYears: a, maxYears: a };
  }

  return null;
}

function matchBookNestAgeCategory(minYears: number, maxYears: number): {
  key: 'hatchlings' | 'fledglings' | 'soarers' | 'sky_readers';
  label: string;
} {
  const categories: Array<{
    key: 'hatchlings' | 'fledglings' | 'soarers' | 'sky_readers';
    min: number;
    max: number;
  }> = [
    { key: 'hatchlings', min: 0, max: 2 },
    { key: 'fledglings', min: 3, max: 5 },
    { key: 'soarers', min: 6, max: 8 },
    { key: 'sky_readers', min: 9, max: 12 },
  ];

  const overlap = (aMin: number, aMax: number, bMin: number, bMax: number) => {
    const lo = Math.max(aMin, bMin);
    const hi = Math.min(aMax, bMax);
    return Math.max(0, hi - lo);
  };

  let best = categories[0];
  let bestScore = -1;

  for (const c of categories) {
    const score = overlap(minYears, maxYears, c.min, c.max);

    if (score > bestScore) {
      bestScore = score;
      best = c;
      continue;
    }

    if (score === bestScore) {
      const inputMid = (minYears + maxYears) / 2;
      const cMid = (c.min + c.max) / 2;
      const bestMid = (best.min + best.max) / 2;

      const dist = Math.abs(cMid - inputMid);
      const bestDist = Math.abs(bestMid - inputMid);
      if (dist < bestDist) best = c;
    }
  }

  return { key: best.key, label: AGE_GROUP_LABELS[best.key] };
}

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

  // Bin help (info tooltip) state
  const [binHelp, setBinHelp] = useState<{
    binCode: string;
    binTheme: string;
    bestFor: string[];
    message: string;
  } | null>(null);
  const [isFetchingBinHelp, setIsFetchingBinHelp] = useState(false);
  const [showBinHelp, setShowBinHelp] = useState(false);

  // Amazon age prompt result (tiny confirmation line)
  const [amazonAgeResult, setAmazonAgeResult] = useState<string | null>(null);

  // ISBN copy UI
  const [isbnCopied, setIsbnCopied] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Bin options
  const [bins, setBins] = useState<BinOption[]>([]);

  const filteredBins = useMemo(() => {
    if (!ageGroup) return bins;
    const selected = normalizeAgeKey(ageGroup);
    return bins.filter((b) => {
      const binAge = normalizeAgeKey(b.age_group);
      return !binAge || binAge === selected;
    });
  }, [bins, ageGroup]);

  useEffect(() => {
    const loadBins = async () => {
      try {
        const response = await fetch('/api/bins', { cache: 'no-store' });
        const data = await response.json();
        if (response.ok) {
          setBins(data.bins || []);
        }
      } catch (err) {
        console.error('Failed to load bins:', err);
      }
    };

    loadBins();
  }, []);

  useEffect(() => {
    if (!bin) return;
    const stillValid = filteredBins.some((b) => b.bin_code === bin);
    if (!stillValid) setBin('');
  }, [ageGroup, filteredBins, bin]);

  useEffect(() => {
    const loadBinHelp = async () => {
      if (!bin) {
        setBinHelp(null);
        setShowBinHelp(false);
        return;
      }

      setIsFetchingBinHelp(true);
      try {
        const res = await fetch(`/api/bin-help?binCode=${encodeURIComponent(bin)}`, {
          cache: 'no-store',
        });
        const data = await res.json();
        if (res.ok) {
          setBinHelp({
            binCode: data.binCode || bin,
            binTheme: data.binTheme || '',
            bestFor: Array.isArray(data.bestFor) ? data.bestFor : [],
            message: data.message || '',
          });
        } else {
          setBinHelp(null);
        }
      } catch {
        setBinHelp(null);
      } finally {
        setIsFetchingBinHelp(false);
      }
    };

    loadBinHelp();
  }, [bin]);

  const fetchBinSuggestion = async (selectedAgeGroup: string, selectedTheme: string | null = null) => {
    if (!selectedAgeGroup) return;

    setIsFetchingBin(true);
    setBinSuggestion(null);

    try {
      const response = await fetch('/api/suggest-bin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ageGroup: selectedAgeGroup, theme: selectedTheme }),
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

  const fetchAgeAndThemeSuggestion = async (book: BookData) => {
    setIsSuggesting(true);
    setAgeSuggestion(null);
    setThemeSuggestion(null);

    try {
      const response = await fetch('/api/suggest-age-theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: book.title,
          author: book.author,
          isbn: book.isbn,
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
    setAmazonAgeResult(null);
    setIsbnCopied(false);

    try {
      const response = await fetch(`/api/books?isbn=${encodeURIComponent(isbnInput.trim())}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch book data');
      }

      const data = await response.json();
      setBookData(data);

      setAgeGroup('');
      setBin('');
      setTheme(null);
      setIsManualEntry(false);

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
          setAmazonAgeResult(null);
          setIsbnCopied(false);
        }, 2000);
      } else {
        setError(result.error || 'Failed to receive book');
      }
    } catch {
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
    setAmazonAgeResult(null);
    setIsbnCopied(false);
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

  const handleAmazonAgePrompt = () => {
    const pasted = window.prompt(
      'Paste Amazon age range (examples: "4-8 years", "3+", "12 months - 2 years"):',
      ''
    );

    if (pasted === null) return; // cancelled
    const parsed = parseAmazonAgeRange(pasted);

    if (!parsed) {
      window.alert('Could not read that age range. Try: "4-8 years", "3+", "12 months - 2 years".');
      return;
    }

    const matched = matchBookNestAgeCategory(parsed.minYears, parsed.maxYears);
    setAgeGroup(matched.key);
    setAmazonAgeResult(
      `Matched ${parsed.minYears.toFixed(1)}–${parsed.maxYears.toFixed(1)} yrs → ${matched.label}`
    );

    fetchBinSuggestion(matched.key, theme);
  };

  const handleCopyIsbn = async () => {
    if (!bookData?.isbn) return;

    try {
      await navigator.clipboard.writeText(bookData.isbn);
      setIsbnCopied(true);
      window.setTimeout(() => setIsbnCopied(false), 1200);
    } catch {
      // fallback (older browsers / restricted contexts)
      try {
        const el = document.createElement('textarea');
        el.value = bookData.isbn;
        el.style.position = 'fixed';
        el.style.left = '-9999px';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        setIsbnCopied(true);
        window.setTimeout(() => setIsbnCopied(false), 1200);
      } catch {
        window.alert('Copy failed. Please copy manually.');
      }
    }
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
        <div style={{ marginTop: spacing.sm }}>
          <Link
            href="/receive/batch"
            style={{
              display: 'inline-block',
              padding: `${spacing.xs} ${spacing.md}`,
              borderRadius: radii.sm,
              border: `2px solid ${colors.border}`,
              backgroundColor: colors.surface,
              color: colors.text,
              textDecoration: 'none',
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.semibold,
            }}
          >
            ⚡ Batch Receive Mode (up to 20)
          </Link>
        </div>
      </header>

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
                    Title *
                  </label>
                  <input
                    type="text"
                    value={bookData.title}
                    onChange={(e) => setBookData({ ...bookData, title: e.target.value })}
                    placeholder="Enter book title..."
                    style={{
                      width: '100%',
                      padding: spacing.md,
                      fontSize: typography.fontSize.lg,
                      fontWeight: typography.fontWeight.semibold,
                      color: colors.text,
                      backgroundColor: colors.cream,
                      border: `3px solid ${colors.border}`,
                      borderRadius: radii.md,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

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
                    Author *
                  </label>
                  <input
                    type="text"
                    value={bookData.author}
                    onChange={(e) => setBookData({ ...bookData, author: e.target.value })}
                    placeholder="Enter author name..."
                    style={{
                      width: '100%',
                      padding: spacing.md,
                      fontSize: typography.fontSize.lg,
                      fontWeight: typography.fontWeight.semibold,
                      color: colors.text,
                      backgroundColor: colors.cream,
                      border: `3px solid ${colors.border}`,
                      borderRadius: radii.md,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: spacing.xl, marginBottom: spacing.lg }}>
                <div
                  style={{
                    width: '120px',
                    height: '160px',
                    backgroundColor: colors.cream,
                    border: `2px solid ${colors.border}`,
                    borderRadius: radii.sm,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: typography.fontSize.xs,
                    color: colors.textLight,
                    flexShrink: 0,
                    overflow: 'hidden',
                  }}
                >
                  {bookData.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={bookData.coverUrl}
                      alt={bookData.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    'No Cover'
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <h2
                    style={{
                      fontFamily: typography.fontFamily.heading,
                      fontSize: typography.fontSize['2xl'],
                      fontWeight: typography.fontWeight.bold,
                      color: colors.text,
                      margin: 0,
                      marginBottom: spacing.sm,
                    }}
                  >
                    {bookData.title}
                  </h2>
                  <p
                    style={{
                      fontSize: typography.fontSize.lg,
                      color: colors.textLight,
                      margin: 0,
                      marginBottom: spacing.md,
                    }}
                  >
                    by {bookData.author}
                  </p>

                  {/* ISBN row with Copy button */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                    <div
                      style={{
                        fontFamily: 'monospace',
                        fontSize: typography.fontSize.base,
                        fontWeight: typography.fontWeight.bold,
                        color: colors.text,
                        backgroundColor: colors.cream,
                        padding: spacing.sm,
                        borderRadius: radii.sm,
                        border: `2px solid ${colors.border}`,
                        display: 'inline-block',
                      }}
                    >
                      ISBN: {bookData.isbn}
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyIsbn}
                      style={{
                        padding: `${spacing.xs} ${spacing.md}`,
                        borderRadius: radii.md,
                        border: `2px solid ${colors.border}`,
                        backgroundColor: isbnCopied ? colors.sageMist : colors.surface,
                        color: colors.text,
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.semibold,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                      title="Copy ISBN"
                    >
                      {isbnCopied ? '✅ Copied!' : '📋 Copy'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: spacing.md }}>
              <button
                type="button"
                onClick={handleNewScan}
                style={{
                  flex: 1,
                  padding: spacing.md,
                  backgroundColor: colors.surface,
                  color: colors.text,
                  border: `2px solid ${colors.border}`,
                  fontSize: typography.fontSize.base,
                  fontWeight: typography.fontWeight.semibold,
                  borderRadius: radii.sm,
                  cursor: 'pointer',
                }}
              >
                🔄 New Scan
              </button>
            </div>
          </div>

          {/* Receiving Details */}
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
                fontFamily: typography.fontFamily.heading,
                fontSize: typography.fontSize.xl,
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

            {/* Age Group */}
            <div style={{ marginBottom: spacing.lg }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: spacing.sm,
                  gap: spacing.md,
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
                    margin: 0,
                  }}
                >
                  Age Group *
                </label>

                <button
                  type="button"
                  onClick={handleAmazonAgePrompt}
                  style={{
                    padding: `${spacing.xs} ${spacing.sm}`,
                    borderRadius: radii.md,
                    border: `2px solid ${colors.border}`,
                    backgroundColor: colors.surface,
                    color: colors.text,
                    fontSize: typography.fontSize.xs,
                    fontWeight: typography.fontWeight.semibold,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                  title='Paste the Amazon "Reading age" or "Age range" and I’ll match it to your categories'
                >
                  🧩 Amazon age match
                </button>
              </div>

              {amazonAgeResult && (
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
                  ✅ {amazonAgeResult}
                </div>
              )}

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
                  <div style={{ fontSize: typography.fontSize.xs, color: colors.deepCocoa }}>
                    {ageSuggestion.explanation}
                  </div>
                </div>
              )}

              <select
                value={ageGroup}
                onChange={(e) => {
                  setAgeGroup(e.target.value);
                  setAmazonAgeResult(null);
                  if (e.target.value) fetchBinSuggestion(e.target.value, theme);
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
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: spacing.sm,
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
                    margin: 0,
                  }}
                >
                  Bin Location
                </label>

                <button
                  type="button"
                  onClick={() => setShowBinHelp((s) => !s)}
                  disabled={!bin || isFetchingBinHelp}
                  title={!bin ? 'Select a bin to view tags' : 'View tags for this bin'}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 999,
                    border: `2px solid ${colors.border}`,
                    backgroundColor: !bin ? colors.border : colors.surface,
                    color: colors.text,
                    fontWeight: typography.fontWeight.bold,
                    cursor: !bin ? 'not-allowed' : 'pointer',
                  }}
                >
                  i
                </button>
              </div>

              {showBinHelp && (
                <div
                  style={{
                    padding: spacing.md,
                    backgroundColor: colors.cream,
                    border: `2px solid ${colors.border}`,
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
                    🧷 Bin tags for {bin}
                  </div>

                  {isFetchingBinHelp ? (
                    <div style={{ fontSize: typography.fontSize.sm, color: colors.textLight }}>
                      Loading tags...
                    </div>
                  ) : binHelp?.bestFor?.length ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.xs }}>
                      {binHelp.bestFor.map((t) => (
                        <span
                          key={t}
                          style={{
                            padding: `${spacing.xs} ${spacing.sm}`,
                            borderRadius: radii.md,
                            border: `1px solid ${colors.border}`,
                            backgroundColor: colors.surface,
                            fontSize: typography.fontSize.xs,
                            fontWeight: typography.fontWeight.semibold,
                            color: colors.text,
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: typography.fontSize.sm, color: colors.textLight }}>
                      No tags found for this bin.
                    </div>
                  )}
                </div>
              )}

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

              {/* Theme Suggestion (under Bin Location) */}
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
                  <div style={{ fontSize: typography.fontSize.xs, color: colors.deepCocoa }}>
                    {themeSuggestion.explanation}
                  </div>
                </div>
              )}

              <select
                value={bin}
                onChange={(e) => setBin(e.target.value)}
                style={{
                  width: '100%',
                  padding: spacing.md,
                  fontSize: typography.fontSize.base,
                  fontWeight: typography.fontWeight.semibold,
                  color: colors.text,
                  backgroundColor: colors.cream,
                  border: `3px solid ${colors.border}`,
                  borderRadius: radii.md,
                  fontFamily: typography.fontFamily.body,
                  cursor: 'pointer',
                }}
              >
                <option value="">Select bin location...</option>
                {filteredBins.map((b) => (
                  <option key={b.bin_code} value={b.bin_code}>
                    {b.bin_code}
                    {b.display_name ? ` — ${b.display_name}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

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