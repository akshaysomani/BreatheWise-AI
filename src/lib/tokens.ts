/**
 * BreatheWise AI — Design System Tokens
 * Source of Truth for Colors, Typography, Spacing, and Elevation.
 * Adheres strictly to WCAG 2.2 AA Contrast Requirements.
 */

export const colors = {
  primary: '#397A55',
  primaryHover: '#2F6647',
  secondary: '#718C72',
  accent: '#D69B47',
  background: '#F7F8F3',
  surface: '#FFFFFF',
  surfaceSecondary: '#EEF3EA',
  border: '#E2E8DE',
  text: '#27352D',
  muted: '#68766C',
  success: '#287A4B',
  warning: '#A86B16',
  error: '#B8423D',
} as const;

export const spacing = {
  1: '0.25rem',  // 4px
  2: '0.5rem',   // 8px
  3: '0.75rem',  // 12px
  4: '1rem',     // 16px
  5: '1.25rem',  // 20px
  6: '1.5rem',   // 24px
  8: '2rem',     // 32px
  10: '2.5rem',  // 40px
  12: '3rem',    // 48px
  16: '4rem',    // 64px
  20: '5rem',    // 80px
  24: '6rem',    // 96px
} as const;

export const typography = {
  fonts: {
    heading: 'var(--font-manrope), sans-serif',
    body: 'var(--font-dm-sans), sans-serif',
  },
  sizes: {
    display: 'clamp(2.5rem, 5vw + 1rem, 3.5rem)', // 40px -> 56px
    h1: 'clamp(2rem, 3.5vw + 0.8rem, 2.75rem)',   // 32px -> 44px
    h2: 'clamp(1.625rem, 2.5vw + 0.5rem, 2.125rem)', // 26px -> 34px
    h3: 'clamp(1.25rem, 1.5vw + 0.5rem, 1.5rem)',    // 20px -> 24px
    h4: '1.125rem', // 18px
    bodyLarge: '1.125rem', // 18px
    body: '1rem', // 16px
    small: '0.875rem', // 14px
    caption: '0.75rem', // 12px
  },
} as const;

export const breakpoints = {
  mobileSm: '360px',
  mobile: '390px',
  tablet: '768px',
  laptop: '1024px',
  desktop: '1440px',
  desktopWide: '1920px',
} as const;

export const aqiTiers = {
  good: { label: 'Good', min: 0, max: 50, color: colors.success, bg: '#EBF5EE', border: '#CBE5D3' },
  moderate: { label: 'Moderate', min: 51, max: 100, color: '#8A7000', bg: '#FDFBE8', border: '#F2E8A3' },
  unhealthySensitive: { label: 'Unhealthy for Sensitive Groups', min: 101, max: 150, color: colors.warning, bg: '#FDF5E6', border: '#F6D9AC' },
  unhealthy: { label: 'Unhealthy', min: 151, max: 200, color: '#C94A29', bg: '#FDF0EC', border: '#F7C6B7' },
  veryUnhealthy: { label: 'Very Unhealthy', min: 201, max: 300, color: '#9E326C', bg: '#FAF0F5', border: '#EFC9DE' },
  hazardous: { label: 'Hazardous', min: 301, max: 500, color: colors.error, bg: '#FCEBEA', border: '#F6C1BE' },
} as const;
