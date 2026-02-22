import Link from 'next/link';
import { colors, typography, spacing, radii } from '@/styles/tokens';
import { getBundleDetails } from '@/lib/queries';
import type { Bundle, BundleItem } from '@/lib/types';
import { supabaseServer } from '@/lib/supabaseServer';
import MarkAsShippedButton from '@/components/MarkAsShippedButton';
import HomeButton from '@/components/HomeButton';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface ShipPageProps {
  params: {
    bundleId: string;
  };
}

export default async function ShipBundle({ params }: ShipPageProps) {
  const bundleId = params.bundleId;

  let bundle: Bundle | null = null;
let items: BundleItem[] = [];
let member: { name?: string | null; email?: string | null } | null = null;
let loadError: string | null = null;

  try {
    const result = await getBundleDetails(bundleId);
    bundle = result.bundle;
    items = result.items;

    if (bundle.member_id) {
      const supabase = supabaseServer();
      const { data: memberData } = await supabase
        .from('members')
        .select('name, email')
        .eq('id', bundle.member_id)
        .maybeSingle();

      if (memberData) {
        member = memberData;
      }
    }
  } catch (error) {
    console.error('Error loading bundle:', error);
    loadError = 'This shipment could not be loaded. It may be a test row or no longer exist.';
  }

  const displayName = member?.name || 'Member';
  const displayEmail = member?.email || '—';
  const bookCount = items.length;
  const totalWeight = (bookCount * 0.5).toFixed(1);

  // If we truly have no bundle data, show a friendly error page instead of a 404
  if (!bundle) {
    return (
      <div
        style={{
          minHeight: '100vh',
          padding: spacing.xl,
          maxWidth: '800px',
          margin: '0 auto',
        }}
      >
        <header
          style={{
            marginBottom: spacing.lg,
            paddingBottom: spacing.sm,
            borderBottom: `3px solid ${colors.secondary}`,
          }}
        >
          <Link
            href="/work/shipping"
            style={{
              display: 'inline-block',
              color: colors.secondary,
              textDecoration: 'none',
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.semibold,
              marginBottom: spacing.sm,
            }}
          >
            ← Back to shipping queue
          </Link>
          <h1
            style={{
              fontFamily: typography.fontFamily.heading,
              fontSize: typography.fontSize['2xl'],
              fontWeight: typography.fontWeight.bold,
              color: colors.secondary,
              margin: 0,
            }}
          >
            Shipment not available
          </h1>
        </header>

        <div
          style={{
            backgroundColor: colors.surface,
            borderRadius: radii.md,
            border: `2px solid ${colors.border}`,
            padding: spacing.lg,
          }}
        >
          <p
            style={{
              margin: 0,
              marginBottom: spacing.sm,
              fontSize: typography.fontSize.sm,
              color: colors.text,
            }}
          >
            This shipment could not be found or loaded. It may be a test row, or it may have
            been removed.
          </p>
          {loadError && (
            <p
              style={{
                margin: 0,
                fontSize: typography.fontSize.xs,
                color: colors.textLight,
              }}
            >
              {loadError}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: spacing.xl,
        maxWidth: '1000px',
        margin: '0 auto',
      }}
    >
      {/* Header */}
      <header
        style={{
          marginBottom: spacing.xl,
          paddingBottom: spacing.lg,
          borderBottom: `3px solid ${colors.secondary}`,
        }}
      >
        <Link
          href="/work/shipping"
          style={{
            display: 'inline-block',
            color: colors.secondary,
            textDecoration: 'none',
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.semibold,
            marginBottom: spacing.sm,
          }}
        >
          ← Back to shipping queue
        </Link>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: spacing.md,
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: typography.fontFamily.heading,
                fontSize: typography.fontSize['3xl'],
                fontWeight: typography.fontWeight.bold,
                color: colors.secondary,
                margin: 0,
              }}
            >
              Ship bundle
            </h1>
            <p
              style={{
                margin: 0,
                marginTop: spacing.xs,
                fontSize: typography.fontSize.sm,
                color: colors.textLight,
              }}
            >
              Review the books, confirm packing, then mark this bundle as shipped.
            </p>
          </div>
          <HomeButton />
        </div>
      </header>

      {/* Shipping Details */}
      <section
        style={{
          backgroundColor: colors.surface,
          border: `2px solid ${colors.border}`,
          borderRadius: radii.md,
          padding: spacing.lg,
          marginBottom: spacing.xl,
        }}
      >
        <h2
          style={{
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.bold,
            color: colors.text,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginTop: 0,
            marginBottom: spacing.md,
          }}
        >
          Order summary
        </h2>

        <div
          style={{
            display: 'grid',
            gap: spacing.lg,
          }}
        >
          <div>
            <div
              style={{
                fontSize: typography.fontSize.xs,
                fontWeight: typography.fontWeight.semibold,
                color: colors.textLight,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: spacing.xs,
              }}
            >
              Member
            </div>
            <div
              style={{
                fontSize: typography.fontSize.base,
                fontWeight: typography.fontWeight.semibold,
                color: colors.text,
              }}
            >
              {displayName}
            </div>
            <div
              style={{
                fontSize: typography.fontSize.sm,
                color: colors.textLight,
                marginTop: spacing.xs,
                fontFamily: 'monospace',
              }}
            >
              {displayEmail}
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: spacing.lg,
            }}
          >
            <SummaryField label="Books" value={`${bookCount}`} emphasize />
            <SummaryField label="Est. weight" value={`${totalWeight} lbs`} />
            <SummaryField label="Status" value={bundle.status} />
          </div>
        </div>
      </section>

      {/* Books in Bundle */}
      <section
        style={{
          backgroundColor: colors.surface,
          border: `2px solid ${colors.border}`,
          borderRadius: radii.md,
          padding: spacing.lg,
          marginBottom: spacing.xl,
        }}
      >
        <h2
          style={{
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.bold,
            color: colors.text,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginTop: 0,
            marginBottom: spacing.md,
          }}
        >
          Books in this bundle
        </h2>

        {items.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: spacing.lg,
              color: colors.textLight,
              fontSize: typography.fontSize.sm,
            }}
          >
            No books have been picked for this bundle yet.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gap: spacing.sm,
            }}
          >
            {items.map((item, index) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  gap: spacing.md,
                  padding: spacing.sm,
                  backgroundColor: index % 2 === 0 ? colors.cream : 'white',
                  borderRadius: radii.sm,
                  border: `1px solid ${colors.border}`,
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 80,
                    backgroundColor: colors.border,
                    borderRadius: radii.sm,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    overflow: 'hidden',
                  }}
                >
                  {item.cover_image_url ? (
                    <img
                      src={item.cover_image_url}
                      alt={item.title}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: typography.fontSize['2xl'] }}>📚</span>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.semibold,
                      color: colors.text,
                      marginBottom: spacing.xs,
                    }}
                  >
                    {item.title}
                  </div>
                  {item.author && (
                    <div
                      style={{
                        fontSize: typography.fontSize.xs,
                        color: colors.textLight,
                        marginBottom: spacing.xs,
                      }}
                    >
                      by {item.author}
                    </div>
                  )}
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: spacing.sm,
                      alignItems: 'center',
                    }}
                  >
                    <span
                      style={{
                        fontSize: typography.fontSize.xs,
                        color: colors.textLight,
                        fontFamily: 'monospace',
                      }}
                    >
                      SKU: {item.sku}
                    </span>
                    {item.age_group && (
                      <span
                        style={{
                          display: 'inline-block',
                          padding: `2px ${spacing.xs}`,
                          backgroundColor: colors.sageMist,
                          color: colors.deepCocoa,
                          fontSize: typography.fontSize.xs,
                          fontWeight: typography.fontWeight.bold,
                          borderRadius: radii.sm,
                          textTransform: 'uppercase',
                        }}
                      >
                        {item.age_group.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Shipping Action */}
      <section
        style={{
          backgroundColor: colors.surface,
          border: `2px solid ${colors.border}`,
          borderRadius: radii.md,
          padding: spacing.lg,
          marginBottom: spacing.lg,
        }}
      >
        <h2
          style={{
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.bold,
            color: colors.text,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginTop: 0,
            marginBottom: spacing.sm,
          }}
        >
          Mark as shipped
        </h2>
        <p
          style={{
            fontSize: typography.fontSize.sm,
            color: colors.textLight,
            margin: 0,
            marginBottom: spacing.md,
          }}
        >
          Enter the tracking number and mark this bundle as shipped.
        </p>

        <MarkAsShippedButton bundleId={bundleId} />
      </section>

      {/* Shipping Checklist */}
      <section
        style={{
          backgroundColor: colors.goldenHoney + '20',
          border: `2px solid ${colors.goldenHoney}`,
          borderRadius: radii.md,
          padding: spacing.lg,
        }}
      >
        <h3
          style={{
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.bold,
            color: colors.deepCocoa,
            margin: 0,
            marginBottom: spacing.sm,
          }}
        >
          Shipping checklist
        </h3>
        <ul
          style={{
            margin: 0,
            paddingLeft: spacing.lg,
            color: colors.text,
            fontSize: typography.fontSize.sm,
            lineHeight: typography.lineHeight.relaxed,
          }}
        >
          <li>Verify all books are packed</li>
          <li>Include packing slip</li>
          <li>Seal package securely</li>
          <li>Apply shipping label with correct address</li>
          <li>Enter tracking number above</li>
        </ul>
      </section>
    </div>
  );
}

function SummaryField({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: typography.fontSize.xs,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: colors.textLight,
          marginBottom: spacing.xs,
          fontWeight: typography.fontWeight.semibold,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: emphasize ? typography.fontSize['2xl'] : typography.fontSize.sm,
          fontWeight: emphasize
            ? typography.fontWeight.bold
            : typography.fontWeight.semibold,
          color: colors.text,
        }}
      >
        {value}
      </div>
    </div>
  );
}
