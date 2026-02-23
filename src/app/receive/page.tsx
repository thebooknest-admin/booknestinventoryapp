'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, RotateCcw, Copy, Check, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { colors, typography, spacing, radii, shadows } from '@/styles/tokens';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const AGE_GROUP_OPTIONS = [
  { value: 'Hatchlings', label: 'Hatchlings (0-2)' },
  { value: 'Fledglings', label: 'Fledglings (3-5)' },
  { value: 'Soarers', label: 'Soarers (6-8)' },
  { value: 'Sky Readers', label: 'Sky Readers (9-12)' },
];

const AGE_TO_BIN_PREFIX: Record<string, string> = {
  Hatchlings: 'HATCH',
  Fledglings: 'FLED',
  Soarers: 'SOAR',
  'Sky Readers': 'SKY',
};

/* ------------------------------------------------------------------ */
/*  Shared styles                                                      */
/* ------------------------------------------------------------------ */

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: typography.fontSize.xs,
  fontWeight: typography.fontWeight.bold,
  color: colors.textLight,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: spacing.xs,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: spacing.sm,
  borderRadius: radii.sm,
  border: `2px solid ${colors.border}`,
  fontSize: typography.fontSize.base,
  fontFamily: typography.fontFamily.body,
  color: colors.text,
  backgroundColor: colors.surface,
  transition: 'border-color 0.15s ease',
};

const cardStyle: React.CSSProperties = {
  padding: spacing.lg,
  borderRadius: radii.lg,
  backgroundColor: colors.surface,
  border: `1px solid ${colors.border}`,
  boxShadow: shadows.sm,
};

const pillBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: `${spacing.xs} ${spacing.sm}`,
  borderRadius: radii.full,
  border: `1px solid ${colors.border}`,
  backgroundColor: colors.surface,
  fontSize: typography.fontSize.xs,
  fontWeight: typography.fontWeight.medium,
  color: colors.textLight,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
};

const tagStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: `2px ${spacing.sm}`,
  borderRadius: radii.full,
  border: `1px solid ${colors.border}`,
  fontSize: typography.fontSize.xs,
  color: colors.textSecondary,
  backgroundColor: colors.cream,
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ReceivePage() {
  // Core form state
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

  // AI suggestion helper
  const [summaryText, setSummaryText] = useState('');
  const [suggestAgeGroup, setSuggestAgeGroup] = useState('');
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [suggestedBins, setSuggestedBins] = useState<SuggestTagsAndBinResponse['suggested_bins']>([]);
  const [helperOpen, setHelperOpen] = useState(false);

  // UI micro-state
  const [copied, setCopied] = useState(false);
  const isbnRef = useRef<HTMLInputElement>(null);

  // Derived: filter bins by selected age group
  const filteredBins = ageGroup
    ? bins.filter((b) => {
        const prefix = AGE_TO_BIN_PREFIX[ageGroup];
        return prefix ? b.bin_code.startsWith(prefix) : true;
      })
    : bins;

  // Derived: does bin help have anything to show?
  const hasBinHelpContent =
    binHelp && (binHelp.description || (binHelp.tags && binHelp.tags.length > 0));

  /* ---- Effects ---- */

  useEffect(() => {
    loadBins();
    isbnRef.current?.focus();
  }, []);

  // Clear bin when age group changes and current bin doesn't match
  useEffect(() => {
    if (ageGroup && bin) {
      const prefix = AGE_TO_BIN_PREFIX[ageGroup];
      if (prefix && !bin.startsWith(prefix)) {
        setBin('');
        setBinHelp(null);
      }
    }
  }, [ageGroup, bin]);

  /* ---- Data fetchers ---- */

  async function loadBins() {
    try {
      const res = await fetch('/api/bins', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setBins(
        (data.bins || []).map((b: { bin_code: string; display_name?: string | null }) => ({
          bin_code: b.bin_code,
          display_name: b.display_name ?? null,
        })),
      );
    } catch (err) {
      console.error('Failed to load bins:', err);
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

  /* ---- Handlers ---- */

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
      if (!res.ok) throw new Error('Lookup failed');

      const data = await res.json();
      setBook({ isbn: trimmed, title: data.title || '', author: data.author || '' });

      // Fire-and-forget age/theme suggestion
      try {
        const suggestRes = await fetch('/api/suggest-age-theme', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isbn: trimmed, title: data.title, author: data.author }),
        });
        if (suggestRes.ok) {
          setAgeSuggestion((await suggestRes.json()) as SuggestAgeThemeResponse);
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

      setReceiveMessage(`Book received — ${book.title} → ${bin}`);

      // Auto-reset so you can scan the next book
      setTimeout(() => {
        handleNewScan();
        isbnRef.current?.focus();
      }, 1500);
    } catch (err: unknown) {
      console.error('Error receiving book:', err);
      setReceiveError(err instanceof Error ? err.message : 'Failed to receive book.');
    } finally {
      setIsReceiving(false);
    }
  }

  const handleNewScan = useCallback(() => {
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
    setCopied(false);
    setHelperOpen(false);
  }, []);

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

      if (!bin && data.suggested_bins?.length) {
        setBin(data.suggested_bins[0].bin_code);
        void loadBinHelp(data.suggested_bins[0].bin_code);
      }
      if (!ageGroup && data.age_group) {
        setAgeGroup(data.age_group);
      }
    } catch (err: unknown) {
      console.error('Error suggesting tags/bin:', err);
      setSuggestionError(err instanceof Error ? err.message : 'Could not suggest tags/bin.');
    } finally {
      setSuggestionLoading(false);
    }
  }

  function handleCopyIsbn() {
    if (!book) return;
    navigator.clipboard
      .writeText(book.isbn)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  }

  /* ---- Render ---- */

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: `${spacing.xl} ${spacing.lg}`,
        maxWidth: '860px',
        margin: '0 auto',
        fontFamily: typography.fontFamily.body,
        color: colors.text,
      }}
    >
      {/* ===== Header ===== */}
      <header style={{ marginBottom: spacing['2xl'] }}>
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
            color: colors.textSecondary,
            lineHeight: typography.lineHeight.normal,
          }}
        >
          Scan or enter ISBN, confirm details, and assign an age group &amp; bin.
        </p>
      </header>

      {/* ===== Step 1: ISBN ===== */}
      <section style={{ ...cardStyle, marginBottom: spacing.lg }}>
        <StepHeader number={1} title="Scan or enter ISBN" />

        <div style={{ display: 'flex', gap: spacing.sm, alignItems: 'center' }}>
          <input
            id="isbn-input"
            ref={isbnRef}
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
            style={{ ...inputStyle, flex: 1, fontFamily: 'monospace' }}
          />
          <button
            type="button"
            onClick={() => void handleLookupIsbn()}
            disabled={!isbnInput.trim() || loading}
            style={{
              padding: `${spacing.sm} ${spacing.lg}`,
              backgroundColor: isbnInput.trim() ? colors.primary : colors.border,
              color: isbnInput.trim() ? colors.cream : colors.textMuted,
              border: 'none',
              borderRadius: radii.sm,
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.bold,
              textTransform: 'uppercase',
              cursor: isbnInput.trim() && !loading ? 'pointer' : 'not-allowed',
              transition: 'background-color 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            {loading ? 'Looking up…' : 'Lookup'}
          </button>
        </div>

        {book && (
          <div style={{ marginTop: spacing.sm }}>
            <button type="button" onClick={handleCopyIsbn} style={pillBtnStyle}>
              {copied ? <Check size={14} /> : <Copy size={14} />} ISBN {book.isbn}
            </button>
          </div>
        )}
      </section>

      {/* ===== Step 2: Book details ===== */}
      <section style={{ ...cardStyle, marginBottom: spacing.lg }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: spacing.md,
          }}
        >
          <StepHeader number={2} title="Confirm book details" inline />
          <button
            type="button"
            onClick={() => {
              handleNewScan();
              isbnRef.current?.focus();
            }}
            style={pillBtnStyle}
          >
            <RotateCcw size={14} /> New scan
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: spacing.md,
          }}
        >
          <div>
            <label htmlFor="book-title" style={labelStyle}>
              Title
            </label>
            <input
              id="book-title"
              type="text"
              value={book?.title || ''}
              onChange={(e) =>
                setBook((prev) =>
                  prev
                    ? { ...prev, title: e.target.value }
                    : { isbn: isbnInput, title: e.target.value, author: '' },
                )
              }
              placeholder="Book title"
              style={inputStyle}
            />
          </div>

          <div>
            <label htmlFor="book-author" style={labelStyle}>
              Author
            </label>
            <input
              id="book-author"
              type="text"
              value={book?.author || ''}
              onChange={(e) =>
                setBook((prev) =>
                  prev
                    ? { ...prev, author: e.target.value }
                    : { isbn: isbnInput, title: '', author: e.target.value },
                )
              }
              placeholder="Author name"
              style={inputStyle}
            />
          </div>
        </div>

        {ageSuggestion && (
          <div
            style={{
              marginTop: spacing.md,
              padding: `${spacing.sm} ${spacing.md}`,
              borderRadius: radii.sm,
              backgroundColor: colors.cream,
              fontSize: typography.fontSize.xs,
              color: colors.textSecondary,
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
            }}
          >
            <Sparkles size={14} style={{ color: colors.secondary, flexShrink: 0 }} />
            <span>
              <strong>Suggested age group:</strong> {ageSuggestion.age_group || '—'}
              {ageSuggestion.theme_tags && ageSuggestion.theme_tags.length > 0 && (
                <> · Tags: {ageSuggestion.theme_tags.join(', ')}</>
              )}
            </span>
          </div>
        )}
      </section>

      {/* ===== Step 3: Age group & bin ===== */}
      <section style={{ ...cardStyle, marginBottom: spacing.lg }}>
        <StepHeader number={3} title="Assign age group & bin" />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: spacing.md,
            marginBottom: spacing.md,
          }}
        >
          {/* Age group */}
          <div>
            <label htmlFor="age-group" style={labelStyle}>
              Age group
            </label>
            <select
              id="age-group"
              value={ageGroup}
              onChange={(e) => setAgeGroup(e.target.value)}
              style={inputStyle}
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
            <label htmlFor="bin-select" style={labelStyle}>
              Bin location
              {ageGroup && (
                <span
                  style={{
                    fontWeight: typography.fontWeight.normal,
                    textTransform: 'none',
                    marginLeft: spacing.xs,
                    color: colors.textMuted,
                  }}
                >
                  — {AGE_TO_BIN_PREFIX[ageGroup] || ''} bins
                </span>
              )}
            </label>
            <div style={{ display: 'flex', gap: spacing.sm, alignItems: 'center' }}>
              <select
                id="bin-select"
                value={bin}
                onChange={(e) => {
                  setBin(e.target.value);
                  void loadBinHelp(e.target.value);
                }}
                style={{ ...inputStyle, flex: 1, fontFamily: 'monospace' }}
              >
                <option value="">Select bin…</option>
                {filteredBins.map((b) => (
                  <option key={b.bin_code} value={b.bin_code}>
                    {b.bin_code}
                    {b.display_name && b.display_name !== b.bin_code ? ` — ${b.display_name}` : ''}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void loadBinHelp(bin)}
                disabled={!bin}
                aria-label="Bin info"
                style={{
                  ...pillBtnStyle,
                  padding: spacing.sm,
                  cursor: bin ? 'pointer' : 'not-allowed',
                  opacity: bin ? 1 : 0.4,
                }}
              >
                <Info size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Bin help info card */}
        {hasBinHelpContent && (
          <div
            style={{
              marginBottom: spacing.md,
              padding: spacing.md,
              borderRadius: radii.sm,
              backgroundColor: colors.cream,
              fontSize: typography.fontSize.sm,
            }}
          >
            <div
              style={{
                fontWeight: typography.fontWeight.semibold,
                marginBottom: binHelp!.description ? spacing.xs : 0,
                color: colors.text,
              }}
            >
              {binHelp!.bin_code}
              {binHelp!.display_name ? ` — ${binHelp!.display_name}` : ''}
            </div>
            {binHelp!.description && (
              <p style={{ margin: 0, marginBottom: spacing.xs, color: colors.textSecondary }}>
                {binHelp!.description}
              </p>
            )}
            {binHelp!.tags && binHelp!.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs }}>
                {binHelp!.tags.map((tag) => (
                  <span key={tag} style={tagStyle}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ---- AI helper (collapsible) ---- */}
        <div
          style={{
            borderTop: `1px solid ${colors.border}`,
            paddingTop: spacing.md,
          }}
        >
          <button
            type="button"
            onClick={() => setHelperOpen((o) => !o)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.semibold,
              color: colors.primary,
            }}
          >
            <Sparkles size={16} />
            Need help choosing tags &amp; bin?
            {helperOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {helperOpen && (
            <div style={{ marginTop: spacing.md }}>
              {/* Summary textarea — full width */}
              <div style={{ marginBottom: spacing.md }}>
                <label htmlFor="summary-text" style={labelStyle}>
                  Paste summary or notes
                </label>
                <textarea
                  id="summary-text"
                  value={summaryText}
                  onChange={(e) => {
                    setSummaryText(e.target.value);
                    setSuggestionError(null);
                  }}
                  rows={3}
                  placeholder="Paste the back-cover blurb or your notes about the story, themes, or tone."
                  style={{
                    ...inputStyle,
                    fontSize: typography.fontSize.sm,
                    resize: 'vertical',
                    minHeight: '72px',
                  }}
                />
              </div>

              {/* Age override + Suggest button — inline row */}
              <div
                style={{
                  display: 'flex',
                  gap: spacing.md,
                  alignItems: 'flex-end',
                  marginBottom: spacing.md,
                }}
              >
                <div style={{ flex: 1 }}>
                  <label htmlFor="suggest-age-group" style={labelStyle}>
                    Override age group (optional)
                  </label>
                  <select
                    id="suggest-age-group"
                    value={suggestAgeGroup}
                    onChange={(e) => setSuggestAgeGroup(e.target.value)}
                    style={{ ...inputStyle, fontSize: typography.fontSize.sm }}
                  >
                    <option value="">Use selected age group</option>
                    {AGE_GROUP_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleSuggestTagsAndBin}
                  disabled={suggestionLoading}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: spacing.xs,
                    padding: `${spacing.sm} ${spacing.md}`,
                    borderRadius: radii.sm,
                    border: 'none',
                    backgroundColor: colors.primary,
                    color: colors.cream,
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.semibold,
                    cursor: suggestionLoading ? 'wait' : 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  <Sparkles size={14} />
                  {suggestionLoading ? 'Suggesting…' : 'Suggest'}
                </button>
              </div>

              {/* Error */}
              {suggestionError && (
                <div
                  style={{
                    marginBottom: spacing.md,
                    padding: `${spacing.sm} ${spacing.md}`,
                    borderRadius: radii.sm,
                    backgroundColor: '#FEF2F2',
                    fontSize: typography.fontSize.xs,
                    color: '#991B1B',
                    fontWeight: typography.fontWeight.medium,
                  }}
                >
                  {suggestionError}
                </div>
              )}

              {/* Results */}
              {(suggestedTags.length > 0 || suggestedBins.length > 0) && (
                <div
                  style={{
                    padding: spacing.md,
                    borderRadius: radii.sm,
                    backgroundColor: colors.cream,
                    display: 'grid',
                    gridTemplateColumns: suggestedBins.length > 0 ? '1fr 1fr' : '1fr',
                    gap: spacing.lg,
                  }}
                >
                  {suggestedTags.length > 0 && (
                    <div>
                      <div
                        style={{
                          fontSize: typography.fontSize.xs,
                          fontWeight: typography.fontWeight.bold,
                          color: colors.textLight,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          marginBottom: spacing.sm,
                        }}
                      >
                        Suggested tags
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.xs }}>
                        {suggestedTags.map((tag) => (
                          <span key={tag} style={tagStyle}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {suggestedBins.length > 0 && (
                    <div>
                      <div
                        style={{
                          fontSize: typography.fontSize.xs,
                          fontWeight: typography.fontWeight.bold,
                          color: colors.textLight,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          marginBottom: spacing.sm,
                        }}
                      >
                        Suggested bins
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
                        {suggestedBins.map((b) => (
                          <div
                            key={b.bin_code}
                            style={{
                              fontSize: typography.fontSize.sm,
                              lineHeight: typography.lineHeight.normal,
                            }}
                          >
                            <span
                              style={{
                                fontFamily: 'monospace',
                                fontWeight: typography.fontWeight.semibold,
                                color: colors.text,
                              }}
                            >
                              {b.bin_code}
                            </span>
                            {b.display_name && (
                              <span style={{ color: colors.textSecondary }}>
                                {' '}
                                — {b.display_name}
                              </span>
                            )}
                            {b.reason && (
                              <span
                                style={{
                                  display: 'block',
                                  fontSize: typography.fontSize.xs,
                                  color: colors.textMuted,
                                  marginTop: '2px',
                                }}
                              >
                                {b.reason}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ===== Receive action ===== */}
      <section
        style={{
          ...cardStyle,
          marginBottom: spacing.xl,
          display: 'flex',
          alignItems: 'center',
          gap: spacing.md,
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={() => void handleReceive()}
          disabled={isReceiving || !book || !ageGroup || !bin}
          style={{
            padding: `${spacing.sm} ${spacing['2xl']}`,
            backgroundColor:
              !book || !ageGroup || !bin ? colors.border : colors.primary,
            color: !book || !ageGroup || !bin ? colors.textMuted : colors.cream,
            border: 'none',
            borderRadius: radii.sm,
            fontSize: typography.fontSize.base,
            fontWeight: typography.fontWeight.bold,
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
            cursor: !book || !ageGroup || !bin || isReceiving ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.15s ease',
          }}
        >
          {isReceiving ? 'Receiving…' : 'Receive book →'}
        </button>

        {receiveMessage && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.xs,
              padding: `${spacing.xs} ${spacing.md}`,
              borderRadius: radii.sm,
              backgroundColor: '#ECFDF5',
              fontSize: typography.fontSize.sm,
              color: '#065F46',
              fontWeight: typography.fontWeight.medium,
            }}
          >
            <Check size={16} />
            {receiveMessage}
          </div>
        )}

        {receiveError && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.xs,
              padding: `${spacing.xs} ${spacing.md}`,
              borderRadius: radii.sm,
              backgroundColor: '#FEF2F2',
              fontSize: typography.fontSize.sm,
              color: '#991B1B',
              fontWeight: typography.fontWeight.medium,
            }}
          >
            {receiveError}
          </div>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function StepHeader({
  number,
  title,
  inline,
}: {
  number: number;
  title: string;
  inline?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: inline ? 0 : spacing.md,
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '28px',
          height: '28px',
          borderRadius: radii.full,
          backgroundColor: colors.primary,
          color: colors.cream,
          fontSize: typography.fontSize.xs,
          fontWeight: typography.fontWeight.bold,
          flexShrink: 0,
        }}
      >
        {number}
      </span>
      <h2
        style={{
          fontSize: typography.fontSize.lg,
          fontWeight: typography.fontWeight.bold,
          margin: 0,
          color: colors.text,
        }}
      >
        {title}
      </h2>
    </div>
  );
}