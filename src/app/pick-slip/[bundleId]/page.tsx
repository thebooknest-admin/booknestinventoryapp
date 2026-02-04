'use client';

import Link from 'next/link';
import { colors, typography, spacing } from '@/styles/tokens';

export default function PickSlip({ params }: { params: { bundleId: string } }) {
  // Mock data - replace with Supabase query
  const bundle = {
    id: params.bundleId,
    name: `ORDER-${params.bundleId}`,
    date: new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    items: [
      { id: '1', sku: 'BK-12345', title: 'The Great Gatsby', location: 'A-12-3', quantity: 1 },
      { id: '2', sku: 'BK-12346', title: '1984', location: 'B-05-2', quantity: 1 },
      { id: '3', sku: 'BK-12347', title: 'To Kill a Mockingbird', location: 'A-15-1', quantity: 1 },
      { id: '4', sku: 'BK-12348', title: 'Pride and Prejudice', location: 'C-08-4', quantity: 1 },
      { id: '5', sku: 'BK-12349', title: 'The Catcher in the Rye', location: 'A-20-2', quantity: 1 },
    ],
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background-color: white !important;
          }
          @page {
            margin: 1cm;
          }
        }
      `}</style>

      <div style={{
        minHeight: '100vh',
        padding: spacing.xl,
        maxWidth: '900px',
        margin: '0 auto',
      }}>
        {/* Print Controls - Hidden on print */}
        <div className="no-print" style={{
          marginBottom: spacing.xl,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <Link
            href={`/pick/${bundle.id}`}
            style={{
              color: colors.primary,
              textDecoration: 'none',
              fontSize: typography.fontSize.base,
              fontWeight: typography.fontWeight.semibold,
            }}
          >
            ← BACK TO PICKING
          </Link>

          <button
            onClick={handlePrint}
            style={{
              padding: `${spacing.sm} ${spacing.xl}`,
              backgroundColor: colors.primary,
              color: colors.cream,
              border: `3px solid ${colors.primary}`,
              fontSize: typography.fontSize.base,
              fontWeight: typography.fontWeight.bold,
              textTransform: 'uppercase',
              borderRadius: spacing.sm,
              cursor: 'pointer',
            }}
          >
            🖨 PRINT
          </button>
        </div>

        {/* Print Content */}
        <div style={{
          backgroundColor: 'white',
          padding: spacing.xl,
        }}>
          {/* Header */}
          <div style={{
            marginBottom: spacing.xl,
            paddingBottom: spacing.lg,
            borderBottom: `4px solid ${colors.text}`,
          }}>
            <h1 style={{
              fontFamily: typography.fontFamily.heading,
              fontSize: typography.fontSize['4xl'],
              fontWeight: typography.fontWeight.bold,
              color: colors.text,
              margin: 0,
              marginBottom: spacing.sm,
            }}>
              PICK SLIP
            </h1>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div style={{
                fontSize: typography.fontSize.xl,
                fontWeight: typography.fontWeight.bold,
                color: colors.text,
              }}>
                {bundle.name}
              </div>
              <div style={{
                fontSize: typography.fontSize.base,
                color: colors.textLight,
              }}>
                {bundle.date}
              </div>
            </div>
          </div>

          {/* Pick List */}
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: spacing.xl,
          }}>
            <thead>
              <tr style={{
                borderBottom: `3px solid ${colors.text}`,
              }}>
                <th style={{
                  padding: spacing.md,
                  textAlign: 'left',
                  fontSize: typography.fontSize.base,
                  fontWeight: typography.fontWeight.bold,
                  color: colors.text,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  SKU
                </th>
                <th style={{
                  padding: spacing.md,
                  textAlign: 'left',
                  fontSize: typography.fontSize.base,
                  fontWeight: typography.fontWeight.bold,
                  color: colors.text,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Title
                </th>
                <th style={{
                  padding: spacing.md,
                  textAlign: 'center',
                  fontSize: typography.fontSize.base,
                  fontWeight: typography.fontWeight.bold,
                  color: colors.text,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Location
                </th>
                <th style={{
                  padding: spacing.md,
                  textAlign: 'center',
                  fontSize: typography.fontSize.base,
                  fontWeight: typography.fontWeight.bold,
                  color: colors.text,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  width: '80px',
                }}>
                  Qty
                </th>
                <th style={{
                  padding: spacing.md,
                  textAlign: 'center',
                  fontSize: typography.fontSize.base,
                  fontWeight: typography.fontWeight.bold,
                  color: colors.text,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  width: '80px',
                }}>
                  ✓
                </th>
              </tr>
            </thead>
            <tbody>
              {bundle.items.map((item, index) => (
                <tr
                  key={item.id}
                  style={{
                    borderBottom: `2px solid ${colors.border}`,
                  }}
                >
                  <td style={{
                    padding: spacing.md,
                    fontSize: typography.fontSize.lg,
                    fontWeight: typography.fontWeight.bold,
                    color: colors.text,
                    fontFamily: 'monospace',
                  }}>
                    {item.sku}
                  </td>
                  <td style={{
                    padding: spacing.md,
                    fontSize: typography.fontSize.base,
                    color: colors.text,
                  }}>
                    {item.title}
                  </td>
                  <td style={{
                    padding: spacing.md,
                    fontSize: typography.fontSize.xl,
                    fontWeight: typography.fontWeight.bold,
                    color: colors.text,
                    textAlign: 'center',
                    fontFamily: 'monospace',
                  }}>
                    {item.location}
                  </td>
                  <td style={{
                    padding: spacing.md,
                    fontSize: typography.fontSize.lg,
                    color: colors.text,
                    textAlign: 'center',
                  }}>
                    {item.quantity}
                  </td>
                  <td style={{
                    padding: spacing.md,
                    textAlign: 'center',
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      border: `3px solid ${colors.text}`,
                      borderRadius: spacing.xs,
                      margin: '0 auto',
                    }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer */}
          <div style={{
            marginTop: spacing.xl,
            paddingTop: spacing.lg,
            borderTop: `3px solid ${colors.text}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <div style={{
                fontSize: typography.fontSize.sm,
                color: colors.textLight,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: spacing.xs,
              }}>
                Total Items
              </div>
              <div style={{
                fontSize: typography.fontSize['2xl'],
                fontWeight: typography.fontWeight.bold,
                color: colors.text,
              }}>
                {bundle.items.length}
              </div>
            </div>

            <div>
              <div style={{
                fontSize: typography.fontSize.sm,
                color: colors.textLight,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: spacing.xs,
              }}>
                Picker Signature
              </div>
              <div style={{
                width: '200px',
                borderBottom: `2px solid ${colors.text}`,
                height: '40px',
              }} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}