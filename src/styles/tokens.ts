// Design Tokens for Book Nest Ops

// Colors
export const colors = {
  // Brand Colors
  cream: '#F8F4EE',
  deepTeal: '#528781',
  mustardOchre: '#D29222',
  sageMist: '#A3BFAA',
  peachClay: '#E8C5B5',
  softBlush: '#F3DED8',
  goldenHoney: '#F4C430',
  lightCocoa: '#8B6F47',
  deepCocoa: '#3D2817',

  // Semantic Mappings
  primary: '#528781',
  primaryHover: '#234948',
  secondary: '#D29222',
  success: '#A3BFAA',
  warning: '#F4C430',
  text: '#3D2817',
  textMuted: '#6B7280',
  textSecondary: '#6B5D54',
  textLight: '#8B6F47',
  surface: '#FFFFFF',
  border: '#D4C5B9',
};

// Typography
export const typography = {
  fontFamily: {
    heading: '"Roca Two", serif',
    body: '"Poppins", sans-serif',
  },
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75'
  }
};

// Spacing
export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
  '3xl': '64px',
};

// Border Radius
export const radii = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
};

// Shadows
export const shadows = {
  sm: '0 1px 2px 0 rgba(61, 40, 23, 0.05)',
  md: '0 4px 6px -1px rgba(61, 40, 23, 0.1), 0 2px 4px -1px rgba(61, 40, 23, 0.06)',
  lg: '0 10px 15px -3px rgba(61, 40, 23, 0.1), 0 4px 6px -2px rgba(61, 40, 23, 0.05)',
};

// Age Group Labels
export const AGE_GROUP_LABELS: Record<string, string> = {
  hatchlings: 'Hatchlings (0-2)',
  fledglings: 'Fledglings (3-5)',
  soarers: 'Soarers (6-8)',
  sky_readers: 'Sky Readers (9-12)',
};