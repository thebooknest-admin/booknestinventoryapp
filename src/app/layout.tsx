import type { Metadata } from 'next';
import { colors, typography } from '@/styles/tokens';

export const metadata: Metadata = {
  title: 'Book Nest Inventory',
  description: 'Operations management system',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="manifest.json" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{
        margin: 0,
        padding: 0,
        fontFamily: typography.fontFamily.body,
        backgroundColor: colors.cream,
        color: colors.text,
        minHeight: '100vh',
      }}>
        {children}
      </body>
    </html>
  );
}