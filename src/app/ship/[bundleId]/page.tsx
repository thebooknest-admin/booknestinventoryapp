import Link from 'next/link';
import { notFound } from 'next/navigation';
import { colors, typography, spacing, radii } from '@/styles/tokens';
import { getBundleDetails } from '@/lib/queries';
import { supabaseServer } from '@/lib/supabaseServer';
import MarkAsShippedButton from '@/components/MarkAsShippedButton';
import HomeButton from '@/components/HomeButton';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface ShipPageProps {
  params: Promise<{
    bundleId: string;
  }>;
}

export default async function ShipBundle(props: ShipPageProps) {
  // Await params in Next.js 15
  const params = await props.params;
  
  let bundle;
  let items;
  let member;

  try {
    // Get bundle and items
    const result = await getBundleDetails(params.bundleId);
    bundle = result.bundle;
    items = result.items;

    // Get member details
    const supabase = supabaseServer();
    const { data: memberData } = await supabase
      .from('members')
      .select('first_name, last_name, email')
      .eq('id', bundle.member_id)
      .single();
    
    member = memberData;
  } catch (error) {
    console.error('Error loading bundle:', error);
    notFound();
  }

  if (!bundle || !member) {
    notFound();
  }

  // Calculate total weight (assuming 0.5 lbs per book)
  const totalWeight = (items.length * 0.5).toFixed(1);

  return (
    <div style={{
      minHeight: '100vh',
      padding: spacing.xl,
      maxWidth: '1000px',
      margin: '0 auto',
    }}>
      <header style={{
        marginBottom: spacing.xl,
        paddingBottom: spacing.lg,
        borderBottom: `3px solid ${colors.secondary}`,
      }}>
        <Link
          href="/work/shipping"
          style={{
            display: 'inline-block',
            color: colors.secondary,
            textDecoration: 'none',
            fontSize: typography.fontSize.base,
            fontWeight: typography.fontWeight.semibold,
            marginBottom: spacing.sm,
          }}
        >
          ← SHIPPING QUEUE
        </Link>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h1 style={{
            fontFamily: typography.fontFamily.heading,
            fontSize: typography.fontSize['3xl'],
            fontWeight: typography.fontWeight.bold,
            color: colors.secondary,
            margin: 0,
          }}>
            BUNDLE-{params.bundleId.slice(0, 8).toUpperCase()}
          </h1>
          <HomeButton />
        </div>
      </header>

      {/* Shipping Details */}
      <div style={{
        backgroundColor: colors.surface,
        border: `3px solid ${colors.border}`,
        borderRadius: radii.md,
        padding: spacing.xl,
        marginBottom: spacing.xl,
      }}>
        <h2 style={{
          fontSize: typography.fontSize.xl,
          fontWeight: typography.fontWeight.bold,
          color: colors.text,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginTop: 0,
          marginBottom: spacing.lg,
        }}>
          Order Information
        </h2>

        <div style={{
          display: 'grid',
          gap: spacing.lg,
        }}>
          <div>
            <div style={{
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.bold,
              color: colors.textLight,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: spacing.xs,
            }}>
              Customer
            </div>
            <div style={{
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.semibold,
              color: colors.text,
            }}>
              {member.first_name} {member.last_name}
            </div>
            <div style={{
              fontSize: typography.fontSize.sm,
              color: colors.textLight,
              marginTop: spacing.xs,
            }}>
              {member.email}
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: spacing.lg,
          }}>
            <div>
              <div style={{
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.bold,
                color: colors.textLight,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: spacing.xs,
              }}>
                Books
              </div>
              <div style={{
                fontSize: typography.fontSize['2xl'],
                fontWeight: typography.fontWeight.bold,
                color: colors.text,
              }}>
                {items.length}
              </div>
            </div>

            <div>
              <div style={{
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.bold,
                color: colors.textLight,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: spacing.xs,
              }}>
                Est. Weight
              </div>
              <div style={{
                fontSize: typography.fontSize['2xl'],
                fontWeight: typography.fontWeight.bold,
                color: colors.text,
              }}>
                {totalWeight} lbs
              </div>
            </div>

            <div>
              <div style={{
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.bold,
                color: colors.textLight,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: spacing.xs,
              }}>
                Status
              </div>
              <div>
                <span style={{
                  display: 'inline-block',
                  padding: `${spacing.xs} ${spacing.sm}`,
                  backgroundColor: colors.sageMist,
                  color: colors.deepCocoa,
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.bold,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  borderRadius: radii.sm,
                }}>
                  {bundle.status}
                </span>
              </div>
            </div>
          </div>

          {bundle.ship_by && (
            <div>
              <div style={{
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.bold,
                color: colors.textLight,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: spacing.xs,
              }}>
                Ship By Date
              </div>
              <div style={{
                fontSize: typography.fontSize.lg,
                fontWeight: typography.fontWeight.semibold,
                color: colors.text,
              }}>
                {new Date(bundle.ship_by).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Books in Bundle */}
      <div style={{
        backgroundColor: colors.surface,
        border: `3px solid ${colors.border}`,
        borderRadius: radii.md,
        padding: spacing.xl,
        marginBottom: spacing.xl,
      }}>
        <h2 style={{
          fontSize: typography.fontSize.xl,
          fontWeight: typography.fontWeight.bold,
          color: colors.text,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginTop: 0,
          marginBottom: spacing.lg,
        }}>
          Books in This Bundle
        </h2>

        {items.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: spacing.xl,
            color: colors.textLight,
          }}>
            <p style={{ margin: 0 }}>No books have been picked for this bundle yet.</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gap: spacing.md,
          }}>
            {items.map((item, index) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  gap: spacing.md,
                  padding: spacing.md,
                  backgroundColor: index % 2 === 0 ? colors.cream : 'white',
                  border: `2px solid ${colors.border}`,
                  borderRadius: radii.sm,
                }}
              >
                <div style={{
                  width: '60px',
                  height: '80px',
                  backgroundColor: colors.border,
                  borderRadius: radii.sm,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  overflow: 'hidden',
                }}>
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
                  <h3 style={{
                    fontSize: typography.fontSize.base,
                    fontWeight: typography.fontWeight.bold,
                    color: colors.text,
                    margin: 0,
                    marginBottom: spacing.xs,
                  }}>
                    {item.title}
                  </h3>
                  <p style={{
                    fontSize: typography.fontSize.sm,
                    color: colors.textLight,
                    margin: 0,
                    marginBottom: spacing.xs,
                  }}>
                    by {item.author}
                  </p>
                  <div style={{
                    display: 'flex',
                    gap: spacing.sm,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                  }}>
                    <span style={{
                      fontSize: typography.fontSize.xs,
                      color: colors.textLight,
                      textTransform: 'uppercase',
                      fontFamily: 'monospace',
                    }}>
                      SKU: {item.sku}
                    </span>
                    <span style={{
                      display: 'inline-block',
                      padding: `2px ${spacing.xs}`,
                      backgroundColor: colors.sageMist,
                      color: colors.deepCocoa,
                      fontSize: typography.fontSize.xs,
                      fontWeight: typography.fontWeight.bold,
                      borderRadius: radii.sm,
                      textTransform: 'uppercase',
                    }}>
                      {item.age_group.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Shipping Action */}
      <div style={{
        backgroundColor: colors.surface,
        border: `3px solid ${colors.border}`,
        borderRadius: radii.md,
        padding: spacing.xl,
        marginBottom: spacing.xl,
      }}>
        <h2 style={{
          fontSize: typography.fontSize.xl,
          fontWeight: typography.fontWeight.bold,
          color: colors.text,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginTop: 0,
          marginBottom: spacing.md,
        }}>
          Mark as Shipped
        </h2>
        <p style={{
          fontSize: typography.fontSize.base,
          color: colors.textLight,
          margin: 0,
          marginBottom: spacing.lg,
        }}>
          Enter the tracking number and mark this bundle as shipped. The member will be notified.
        </p>

        <MarkAsShippedButton bundleId={params.bundleId} />
      </div>

      {/* Shipping Checklist */}
      <div style={{
        backgroundColor: colors.goldenHoney + '20',
        border: `2px solid ${colors.goldenHoney}`,
        borderRadius: radii.md,
        padding: spacing.lg,
      }}>
        <h3 style={{
          fontSize: typography.fontSize.lg,
          fontWeight: typography.fontWeight.bold,
          color: colors.deepCocoa,
          margin: 0,
          marginBottom: spacing.md,
        }}>
          📋 Shipping Checklist
        </h3>
        <ul style={{
          margin: 0,
          paddingLeft: spacing.lg,
          color: colors.text,
          fontSize: typography.fontSize.base,
          lineHeight: typography.lineHeight.relaxed,
        }}>
          <li style={{ marginBottom: spacing.sm }}>✓ Verify all {items.length} books are packed</li>
          <li style={{ marginBottom: spacing.sm }}>✓ Include packing slip with bundle ID</li>
          <li style={{ marginBottom: spacing.sm }}>✓ Seal package securely</li>
          <li style={{ marginBottom: spacing.sm }}>✓ Apply shipping label with correct address</li>
          <li style={{ marginBottom: spacing.sm }}>✓ Enter tracking number above</li>
          <li>✓ Drop off at carrier or schedule pickup</li>
        </ul>
      </div>
    </div>
  );
}