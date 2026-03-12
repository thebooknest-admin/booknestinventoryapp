'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { colors, radii, shadows, spacing, typography } from '@/styles/tokens';

interface NavItem {
  label: string;
  href?: string;
  children?: { label: string; href: string; description?: string }[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  {
    label: 'Work',
    children: [
      { label: 'Picking', href: '/work/picking', description: 'Pick books for orders' },
      { label: 'Shipping', href: '/work/shipping', description: 'Buy labels & ship orders' },
      { label: 'Labels', href: '/work/labels', description: 'Print & manage labels' },
    ],
  },
  {
    label: 'Warehouse',
    children: [
      { label: 'Receive', href: '/receive', description: 'Scan & shelve new books' },
      { label: 'Returns', href: '/returns', description: 'Process returned books' },
      { label: 'Inventory', href: '/inventory', description: 'Browse bins & stock' },
    ],
  },
  { label: 'Members', href: '/members' },
];

export default function NavBar({ user }: { user: string | null }) {
  const pathname = usePathname();

  if (pathname === '/login' || pathname === '/logout') return null;

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === href;
    return pathname.startsWith(href);
  }

  function isGroupActive(item: NavItem) {
    if (item.href) return isActive(item.href);
    return item.children?.some((child) => isActive(child.href)) ?? false;
  }

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: colors.surface,
        borderBottom: `1px solid ${colors.border}`,
        boxShadow: shadows.sm,
      }}
    >
      <div
        style={{
          maxWidth: 1400,
          margin: '0 auto',
          padding: `${spacing.sm} ${spacing.lg}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.lg,
        }}
      >
        {/* Left: logo + nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.lg }}>
          <Link
            href="/"
            style={{
              textDecoration: 'none',
              color: colors.deepCocoa,
              fontFamily: typography.fontFamily.heading,
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.bold,
              lineHeight: typography.lineHeight.tight,
            }}
          >
            Book Nest Ops
          </Link>

          <nav style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            {NAV_ITEMS.map((item) =>
              item.children ? (
                <DropdownNav
                  key={item.label}
                  item={item}
                  isGroupActive={isGroupActive(item)}
                  isChildActive={isActive}
                />
              ) : (
                <Link
                  key={item.label}
                  href={item.href!}
                  style={{
                    textDecoration: 'none',
                    color: isActive(item.href!) ? colors.deepCocoa : colors.textLight,
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.semibold,
                    padding: `6px ${spacing.sm}`,
                    borderRadius: radii.sm,
                    backgroundColor: isActive(item.href!) ? colors.sageMist : 'transparent',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {item.label}
                </Link>
              )
            )}
          </nav>
        </div>

        {/* Right: user + logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
          {user && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: spacing.xs }}>
              <span style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                Signed in as
              </span>
              <span
                style={{
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.semibold,
                  color: colors.deepCocoa,
                }}
              >
                {user}
              </span>
            </div>
          )}

          <Link
            href="/logout"
            style={{
              textDecoration: 'none',
              background: colors.primary,
              color: 'white',
              fontSize: typography.fontSize.xs,
              fontWeight: typography.fontWeight.bold,
              padding: `${spacing.xs} ${spacing.md}`,
              borderRadius: radii.sm,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Logout
          </Link>
        </div>
      </div>
    </header>
  );
}

// ── Dropdown Nav Item ──────────────────────────────────────────────

function DropdownNav({
  item,
  isGroupActive,
  isChildActive,
}: {
  item: NavItem;
  isGroupActive: boolean;
  isChildActive: (href: string) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  function handleEnter() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  }

  function handleLeave() {
    timeoutRef.current = setTimeout(() => setOpen(false), 150);
  }

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      style={{ position: 'relative' }}
    >
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          textDecoration: 'none',
          color: isGroupActive ? colors.deepCocoa : colors.textLight,
          fontSize: typography.fontSize.sm,
          fontWeight: typography.fontWeight.semibold,
          padding: `6px ${spacing.sm}`,
          borderRadius: radii.sm,
          backgroundColor: isGroupActive ? colors.sageMist : 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'all 0.15s ease',
        }}
      >
        {item.label}
        <span
          style={{
            fontSize: '0.6rem',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s ease',
            opacity: 0.6,
          }}
        >
          ▼
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '4px',
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: radii.md,
            boxShadow: shadows.lg,
            minWidth: '220px',
            padding: spacing.xs,
            zIndex: 100,
          }}
        >
          {item.children!.map((child) => {
            const active = isChildActive(child.href);

            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={() => setOpen(false)}
                style={{
                  display: 'block',
                  textDecoration: 'none',
                  padding: `${spacing.sm} ${spacing.sm}`,
                  borderRadius: radii.sm,
                  backgroundColor: active ? colors.sageMist : 'transparent',
                  transition: 'background-color 0.1s ease',
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.backgroundColor = colors.cream;
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div
                  style={{
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.semibold,
                    color: active ? colors.deepCocoa : colors.text,
                  }}
                >
                  {child.label}
                </div>
                {child.description && (
                  <div
                    style={{
                      fontSize: typography.fontSize.xs,
                      color: colors.textLight,
                      marginTop: '2px',
                    }}
                  >
                    {child.description}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}