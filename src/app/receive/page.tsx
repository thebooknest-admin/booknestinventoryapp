'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
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

  const fetchBookData = async () => {
    setError(null);
    setBookData(null);
    setAgeSuggestion(null);
    setThemeSuggestion(null);
    setBinSuggestion(null);
    setAmazonAgeResult(null);

    if (!isbnInput.trim()) {
      setError('Please enter an ISBN');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/books/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isbn: isbnInput.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to fetch book data');
        return;
      }

      setBookData({
        isbn: data.isbn,
        title: data.title,
        author: data.author,
        coverUrl: data.coverUrl || null,
      });
    } catch (err: unknown) {
      console.error(err);
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAmazonAgePrompt = async () => {
    if (!bookData) return;

    const userInput = prompt(
      `Amazon says this book is for:\n\n(e.g., "4-8 years", "Ages 3 to 5", "3+", "18-24 months")\n\nPaste or type the age range below:`,
    );

    if (!userInput) return;

    const parsed = parseAmazonAgeRange(userInput);
    if (!parsed) {
      alert('Could not parse that age range. Try something like "4-8 years" or "Ages 3-5".');
      return;
    }

    const match = matchBookNestAgeCategory(parsed.minYears, parsed.maxYears);
    setAgeGroup(match.key);

    const msg = `Mapped "${userInput}" (${parsed.minYears}–${parsed.maxYears} years) → ${match.label}`;
    setAmazonAgeResult(msg);

    setTimeout(() => {
      setAmazonAgeResult(null);
    }, 6000);
  };

  const handleAISuggest = async () => {
    if (!bookData) return;

    setIsSuggesting(true);
    setAgeSuggestion(null);
    setThemeSuggestion(null);

    try {
      const response = await fetch('/api/ai/suggest-category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: bookData.title,
          author: bookData.author,
        }),
      });

      const data = await response.json();

      if (response.ok && data.category) {
        setAgeSuggestion({
          category: data.category,
          explanation: data.explanation || '',
        });
      } else {
        alert(data.error || 'Failed to get AI suggestion');
      }
    } catch (err) {
      console.error(err);
      alert('Network error while fetching AI suggestion');
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleAISuggestTheme = async () => {
    if (!bookData) return;

    setIsSuggesting(true);
    setThemeSuggestion(null);

    try {
      const response = await fetch('/api/ai/suggest-theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: bookData.title,
          author: bookData.author,
        }),
      });

      const data = await response.json();

      if (response.ok && data.theme) {
        setThemeSuggestion({
          theme: data.theme,
          explanation: data.explanation || '',
        });
        setTheme(data.theme);
      } else {
        alert(data.error || 'Failed to get theme suggestion');
      }
    } catch (err) {
      console.error(err);
      alert('Network error while fetching theme suggestion');
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleSuggestBin = async () => {
    if (!ageGroup) {
      alert('Please select or confirm age group first');
      return;
    }

    setIsFetchingBin(true);
    setBinSuggestion(null);

    try {
      const response = await fetch('/api/bins/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          age_group: ageGroup,
          theme: theme || null,
        }),
      });

      const data = await response.json();

      if (response.ok && data.bin_code) {
        setBinSuggestion(data.bin_code);
      } else {
        alert(data.error || 'Could not find a suitable bin');
      }
    } catch (err) {
      console.error(err);
      alert('Network error while fetching bin suggestion');
    } finally {
      setIsFetchingBin(false);
    }
  };

  const handleUseSuggestedBin = () => {
    if (binSuggestion) {
      setBin(binSuggestion);
      setBinSuggestion(null);
    }
  };

  const handleUseAgeSuggestion = () => {
    if (ageSuggestion) {
      const normalized = normalizeAgeKey(ageSuggestion.category);
      setAgeGroup(normalized);
      setAgeSuggestion(null);
    }
  };

  useEffect(() => {
    const fetchBinHelp = async () => {
      if (!bin) return;

      setIsFetchingBinHelp(true);
      setBinHelp(null);

      try {
        const response = await fetch('/api/bins/info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bin_code: bin }),
        });

        const data = await response.json();

        if (response.ok) {
          setBinHelp({
            binCode: data.bin_code,
            binTheme: data.bin_theme || '',
            bestFor: data.best_for || [],
            message: data.message || '',
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsFetchingBinHelp(false);
      }
    };

    if (bin) {
      fetchBinHelp();
    }
  }, [bin]);

  const handleCopyIsbn = async () => {
    if (bookData?.isbn) {
      await navigator.clipboard.writeText(bookData.isbn);
      setIsbnCopied(true);
      setTimeout(() => setIsbnCopied(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!bookData) {
      alert('No book data available');
      return;
    }

    if (!ageGroup) {
      alert('Please select an age group');
      return;
    }

    setIsSubmitting(true);
    setSuccessMessage(null);

    try {
      const result = await receiveBook(
        {
          isbn: bookData.isbn,
          title: bookData.title,
          author: bookData.author,
          coverUrl: bookData.coverUrl,
          theme: theme || null,
        },
        {
          isbn: bookData.isbn,
          ageGroup,
          bin: bin || '',
        }
      );

      if (result.success) {
        setSuccessMessage(`✓ Received: "${bookData.title}" → ${bin || 'no bin'}`);
        setIsbnInput('');
        setBookData(null);
        setAgeGroup('');
        setBin('');
        setTheme(null);
        setAgeSuggestion(null);
        setThemeSuggestion(null);
        setBinSuggestion(null);
        setAmazonAgeResult(null);

        setTimeout(() => {
          setSuccessMessage(null);
        }, 5000);
      } else {
        alert(result.error || 'Failed to receive book');
      }
    } catch (err) {
      console.error(err);
      alert('Network error during submission');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setIsbnInput('');
    setBookData(null);
    setError(null);
    setAgeGroup('');
    setBin('');
    setTheme(null);
    setAgeSuggestion(null);
    setThemeSuggestion(null);
    setBinSuggestion(null);
    setAmazonAgeResult(null);
    setSuccessMessage(null);
  };

  const handleManualEntry = () => {
    const title = prompt('Enter book title:');
    if (!title) return;

    const author = prompt('Enter author name:');
    if (!author) return;

    const isbn = prompt('Enter ISBN (optional):') || '';

    setBookData({
      isbn,
      title,
      author,
      coverUrl: null,
    });
  };

  return (
    <div
      style={{
        maxWidth: '600px',
        margin: '0 auto',
        padding: spacing.xl,
        fontFamily: typography.fontFamily.body,
      }}
    >
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .slide-up {
          animation: slideUp 0.3s ease-out;
        }
        
        .pulsing {
          animation: pulse 1.5s ease-in-out infinite;
        }
        
        .spinning {
          animation: spin 1s linear infinite;
        }
        
        button:hover:not(:disabled) {
          transform: translateY(-1px);
          transition: all 0.2s ease;
        }
        
        button:active:not(:disabled) {
          transform: translateY(0);
        }
        
        select:focus, input:focus {
          outline: none;
          border-color: ${colors.primary} !important;
          box-shadow: 0 0 0 3px ${colors.primary}20;
        }
      `}</style>

      {/* Header */}
      <div
        style={{
          marginBottom: spacing.xl,
          paddingBottom: spacing.lg,
          borderBottom: `2px solid ${colors.border}`,
        }}
      >
        <h1
          style={{
            fontSize: typography.fontSize['3xl'],
            fontWeight: 900,
            color: colors.primary,
            marginBottom: spacing.xs,
            letterSpacing: '-0.02em',
          }}
        >
          Receive Book
        </h1>
        <p
          style={{
            fontSize: typography.fontSize.base,
            color: colors.textLight,
            margin: 0,
          }}
        >
          Scan or enter ISBN to add books to inventory
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div
          className="slide-up"
          style={{
            padding: spacing.lg,
            backgroundColor: colors.sageMist,
            border: `2px solid ${colors.deepTeal}`,
            borderRadius: radii.lg,
            marginBottom: spacing.xl,
            fontSize: typography.fontSize.base,
            fontWeight: typography.fontWeight.semibold,
            color: colors.deepCocoa,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          {successMessage}
        </div>
      )}

      {/* ISBN Lookup */}
      {!bookData && (
        <div
          className="slide-up"
          style={{
            padding: spacing.xl,
            backgroundColor: colors.surface,
            border: `2px solid ${colors.border}`,
            borderRadius: radii.lg,
            marginBottom: spacing.xl,
            boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
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
              marginBottom: spacing.md,
            }}
          >
            ISBN Number
          </label>

          <div style={{ display: 'flex', gap: spacing.sm, marginBottom: spacing.md }}>
            <input
              type="text"
              value={isbnInput}
              onChange={(e) => setIsbnInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  fetchBookData();
                }
              }}
              placeholder="978-0-..."
              disabled={isLoading}
              style={{
                flex: 1,
                padding: spacing.md,
                fontSize: typography.fontSize.lg,
                fontWeight: typography.fontWeight.medium,
                color: colors.text,
                backgroundColor: colors.cream,
                border: `3px solid ${colors.border}`,
                borderRadius: radii.md,
                fontFamily: 'monospace',
                transition: 'all 0.2s ease',
              }}
            />

            <button
              type="button"
              onClick={fetchBookData}
              disabled={isLoading || !isbnInput.trim()}
              style={{
                padding: `${spacing.md} ${spacing.lg}`,
                backgroundColor: isLoading || !isbnInput.trim() ? colors.border : colors.primary,
                color: colors.cream,
                border: 'none',
                fontSize: typography.fontSize.base,
                fontWeight: typography.fontWeight.bold,
                borderRadius: radii.md,
                cursor: isLoading || !isbnInput.trim() ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
                minWidth: '100px',
                transition: 'all 0.2s ease',
              }}
            >
              {isLoading ? (
                <span className="pulsing">Searching...</span>
              ) : (
                'Look Up'
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={handleManualEntry}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: spacing.md,
              backgroundColor: 'transparent',
              color: colors.textLight,
              border: `2px dashed ${colors.border}`,
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.semibold,
              borderRadius: radii.md,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            Or enter book details manually
          </button>

          {error && (
            <div
              className="slide-up"
              style={{
                marginTop: spacing.md,
                padding: spacing.md,
                backgroundColor: '#fef2f2',
                border: '2px solid #fca5a5',
                borderRadius: radii.sm,
                fontSize: typography.fontSize.sm,
                color: '#991b1b',
              }}
            >
              {error}
            </div>
          )}
        </div>
      )}

      {/* Book Info & Form */}
      {bookData && (
        <form onSubmit={handleSubmit} className="slide-up">
          {/* Book Card */}
          <div
            style={{
              padding: spacing.xl,
              backgroundColor: colors.surface,
              border: `2px solid ${colors.border}`,
              borderRadius: radii.lg,
              marginBottom: spacing.xl,
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            }}
          >
            <div style={{ display: 'flex', gap: spacing.lg, marginBottom: spacing.lg }}>
              {bookData.coverUrl ? (
                <div
                  style={{
                    width: 100,
                    height: 150,
                    position: 'relative',
                    borderRadius: radii.md,
                    border: `2px solid ${colors.border}`,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    overflow: 'hidden',
                  }}
                >
                  <Image
                    src={bookData.coverUrl}
                    alt={bookData.title}
                    fill
                    style={{ objectFit: 'cover' }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    width: 100,
                    height: 150,
                    backgroundColor: colors.cream,
                    border: `2px solid ${colors.border}`,
                    borderRadius: radii.md,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: typography.fontSize.xs,
                    color: colors.textLight,
                    textAlign: 'center',
                    padding: spacing.sm,
                  }}
                >
                  No Cover
                </div>
              )}

              <div style={{ flex: 1 }}>
                <h2
                  style={{
                    fontSize: typography.fontSize.xl,
                    fontWeight: typography.fontWeight.bold,
                    color: colors.text,
                    marginBottom: spacing.xs,
                    lineHeight: 1.3,
                  }}
                >
                  {bookData.title}
                </h2>
                <p
                  style={{
                    fontSize: typography.fontSize.base,
                    color: colors.textLight,
                    marginBottom: spacing.md,
                  }}
                >
                  by {bookData.author}
                </p>

                {bookData.isbn && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                    <span
                      style={{
                        fontSize: typography.fontSize.xs,
                        fontFamily: 'monospace',
                        color: colors.textLight,
                        padding: `${spacing.xs} ${spacing.sm}`,
                        backgroundColor: colors.cream,
                        borderRadius: radii.sm,
                        border: `1px solid ${colors.border}`,
                      }}
                    >
                      {bookData.isbn}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyIsbn}
                      style={{
                        padding: `${spacing.xs} ${spacing.sm}`,
                        backgroundColor: isbnCopied ? colors.sageMist : 'transparent',
                        color: isbnCopied ? colors.deepTeal : colors.textLight,
                        border: `1px solid ${isbnCopied ? colors.deepTeal : colors.border}`,
                        borderRadius: radii.sm,
                        fontSize: typography.fontSize.xs,
                        fontWeight: typography.fontWeight.semibold,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {isbnCopied ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons Row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: spacing.sm,
              }}
            >
              <button
                type="button"
                onClick={handleAmazonAgePrompt}
                style={{
                  padding: spacing.md,
                  backgroundColor: colors.cream,
                  color: colors.text,
                  border: `2px solid ${colors.border}`,
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.semibold,
                  borderRadius: radii.md,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                📦 Amazon
              </button>

              <button
                type="button"
                onClick={handleAISuggest}
                disabled={isSuggesting}
                style={{
                  padding: spacing.md,
                  backgroundColor: colors.cream,
                  color: colors.text,
                  border: `2px solid ${colors.border}`,
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.semibold,
                  borderRadius: radii.md,
                  cursor: isSuggesting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {isSuggesting ? <span className="pulsing">✨ AI...</span> : '✨ AI Age'}
              </button>

              <button
                type="button"
                onClick={handleAISuggestTheme}
                disabled={isSuggesting}
                style={{
                  padding: spacing.md,
                  backgroundColor: colors.cream,
                  color: colors.text,
                  border: `2px solid ${colors.border}`,
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.semibold,
                  borderRadius: radii.md,
                  cursor: isSuggesting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {isSuggesting ? <span className="pulsing">🏷️ AI...</span> : '🏷️ AI Theme'}
              </button>
            </div>

            {/* Amazon Age Result */}
            {amazonAgeResult && (
              <div
                className="slide-up"
                style={{
                  marginTop: spacing.md,
                  padding: spacing.md,
                  backgroundColor: colors.sageMist,
                  border: `2px solid ${colors.deepTeal}`,
                  borderRadius: radii.sm,
                  fontSize: typography.fontSize.sm,
                  color: colors.deepCocoa,
                }}
              >
                {amazonAgeResult}
              </div>
            )}

            {/* Age Suggestion */}
            {ageSuggestion && (
              <div
                className="slide-up"
                style={{
                  marginTop: spacing.md,
                  padding: spacing.lg,
                  backgroundColor: colors.goldenHoney,
                  border: `2px solid ${colors.mustardOchre}`,
                  borderRadius: radii.md,
                }}
              >
                <div
                  style={{
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.bold,
                    color: colors.deepCocoa,
                    marginBottom: spacing.sm,
                  }}
                >
                  💡 Suggested Age Group
                </div>
                <div
                  style={{
                    fontSize: typography.fontSize.lg,
                    fontWeight: typography.fontWeight.bold,
                    color: colors.text,
                    marginBottom: spacing.sm,
                  }}
                >
                  {AGE_GROUP_LABELS[normalizeAgeKey(ageSuggestion.category)] || ageSuggestion.category}
                </div>
                <div
                  style={{
                    fontSize: typography.fontSize.sm,
                    color: colors.deepCocoa,
                    marginBottom: spacing.md,
                    lineHeight: 1.5,
                  }}
                >
                  {ageSuggestion.explanation}
                </div>
                <button
                  type="button"
                  onClick={handleUseAgeSuggestion}
                  style={{
                    padding: `${spacing.sm} ${spacing.md}`,
                    backgroundColor: colors.primary,
                    color: colors.cream,
                    border: 'none',
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.bold,
                    borderRadius: radii.md,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  Use This Age Group
                </button>
              </div>
            )}

            {/* Reset Button */}
            <button
              type="button"
              onClick={handleReset}
              style={{
                marginTop: spacing.md,
                width: '100%',
                padding: spacing.sm,
                backgroundColor: 'transparent',
                color: colors.textLight,
                border: 'none',
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.medium,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              ← Start over with different book
            </button>
          </div>

          {/* Form Fields */}
          <div
            style={{
              padding: spacing.xl,
              backgroundColor: colors.surface,
              border: `2px solid ${colors.border}`,
              borderRadius: radii.lg,
              marginBottom: spacing.lg,
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            }}
          >
            {/* Age Group */}
            <div style={{ marginBottom: spacing.xl }}>
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

              <select
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value)}
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
                  transition: 'all 0.2s ease',
                }}
              >
                <option value="">Select age group...</option>
                <option value="hatchlings">🥚 Hatchlings (0-2)</option>
                <option value="fledglings">🐣 Fledglings (3-5)</option>
                <option value="soarers">🦅 Soarers (6-8)</option>
                <option value="sky_readers">☁️ Sky Readers (9-12)</option>
              </select>
            </div>

            {/* Bin Location - Only show when age group selected */}
            {ageGroup && (
              <div className="slide-up" style={{ marginBottom: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: spacing.md,
                  }}
                >
                  <label
                    style={{
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.bold,
                      color: colors.textLight,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Bin Location
                  </label>

                  <button
                    type="button"
                    onClick={handleSuggestBin}
                    disabled={isFetchingBin}
                    style={{
                      padding: `${spacing.sm} ${spacing.md}`,
                      backgroundColor: isFetchingBin ? colors.border : colors.cream,
                      color: colors.text,
                      border: `2px solid ${colors.border}`,
                      fontSize: typography.fontSize.xs,
                      fontWeight: typography.fontWeight.bold,
                      borderRadius: radii.md,
                      cursor: isFetchingBin ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {isFetchingBin ? (
                      <span className="pulsing">Finding bin...</span>
                    ) : (
                      '🎯 Suggest Bin'
                    )}
                  </button>
                </div>

                {/* Theme Suggestion */}
                {themeSuggestion && (
                  <div
                    className="slide-up"
                    style={{
                      padding: spacing.md,
                      backgroundColor: colors.goldenHoney,
                      border: `2px solid ${colors.mustardOchre}`,
                      borderRadius: radii.md,
                      marginBottom: spacing.md,
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
                      🏷️ Theme: {themeSuggestion.theme.charAt(0).toUpperCase() + themeSuggestion.theme.slice(1)}
                    </div>
                    <div
                      style={{
                        fontSize: typography.fontSize.xs,
                        color: colors.deepCocoa,
                        lineHeight: 1.4,
                      }}
                    >
                      {themeSuggestion.explanation}
                    </div>
                  </div>
                )}

                {/* Bin Suggestion */}
                {binSuggestion && (
                  <div
                    className="slide-up"
                    style={{
                      padding: spacing.md,
                      backgroundColor: colors.sageMist,
                      border: `2px solid ${colors.deepTeal}`,
                      borderRadius: radii.md,
                      marginBottom: spacing.md,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: spacing.md,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: typography.fontSize.sm,
                          fontWeight: typography.fontWeight.bold,
                          color: colors.deepCocoa,
                        }}
                      >
                        📍 Suggested: {binSuggestion}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleUseSuggestedBin}
                      style={{
                        padding: `${spacing.sm} ${spacing.md}`,
                        backgroundColor: colors.deepTeal,
                        color: colors.cream,
                        border: 'none',
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.bold,
                        borderRadius: radii.md,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      Use This
                    </button>
                  </div>
                )}

                {/* Bin Select */}
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
                    marginBottom: bin ? spacing.md : 0,
                    transition: 'all 0.2s ease',
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

                {/* Bin Tags - Auto-shown when bin selected */}
                {bin && binHelp && (
                  <div
                    className="slide-up"
                    style={{
                      padding: spacing.md,
                      backgroundColor: colors.cream,
                      border: `2px solid ${colors.border}`,
                      borderRadius: radii.md,
                    }}
                  >
                    <div
                      style={{
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.bold,
                        color: colors.deepCocoa,
                        marginBottom: spacing.sm,
                      }}
                    >
                      📚 Tags in {bin}
                    </div>

                    {isFetchingBinHelp ? (
                      <div
                        className="pulsing"
                        style={{
                          fontSize: typography.fontSize.sm,
                          color: colors.textLight,
                        }}
                      >
                        Loading tags...
                      </div>
                    ) : binHelp.bestFor?.length ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.xs }}>
                        {binHelp.bestFor.slice(0, 6).map((t) => (
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
                        {binHelp.bestFor.length > 6 && (
                          <span
                            style={{
                              padding: `${spacing.xs} ${spacing.sm}`,
                              fontSize: typography.fontSize.xs,
                              color: colors.textLight,
                            }}
                          >
                            +{binHelp.bestFor.length - 6} more
                          </span>
                        )}
                      </div>
                    ) : (
                      <div
                        style={{
                          fontSize: typography.fontSize.sm,
                          color: colors.textLight,
                        }}
                      >
                        No tags found for this bin.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
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
              border: 'none',
              fontSize: typography.fontSize.xl,
              fontWeight: 900,
              textTransform: 'uppercase',
              borderRadius: radii.lg,
              cursor: isSubmitting || !ageGroup ? 'not-allowed' : 'pointer',
              boxShadow: isSubmitting || !ageGroup ? 'none' : '0 4px 12px rgba(0,0,0,0.15)',
              letterSpacing: '0.05em',
              transition: 'all 0.2s ease',
            }}
          >
            {isSubmitting ? (
              <span className="pulsing">RECEIVING...</span>
            ) : (
              'RECEIVE BOOK →'
            )}
          </button>
        </form>
      )}
    </div>
  );
}
