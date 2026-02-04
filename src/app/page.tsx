import Link from 'next/link';
import { colors, typography, spacing, radii, shadows } from '@/styles/tokens';
import HomeButton from '@/components/HomeButton';

export default function Home() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
    }}>
      <h1 style={{
        fontFamily: typography.fontFamily.heading,
        fontSize: typography.fontSize['4xl'],
        fontWeight: typography.fontWeight.bold,
        color: colors.primary,
        marginBottom: spacing.md,
        textAlign: 'center',
      }}>
        Book Nest Inventory
      </h1>
      
      <p style={{
        fontSize: typography.fontSize.lg,
        color: colors.textLight,
        marginBottom: spacing['2xl'],
        textAlign: 'center',
      }}>
        Operations Management System
      </p>
      
      <HomeButton />
    </div>
  );
}