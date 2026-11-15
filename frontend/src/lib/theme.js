'use client';

import styled, { createGlobalStyle } from 'styled-components';

/*
 * Connectly design tokens (see DDEsign.md). Colors are CSS variables so light/dark
 * switch without re-rendering; `theme.colors.x` returns `var(--x)`.
 */
const light = {
  page: '#F8FAFC', // app background
  bg: '#FFFFFF', // surface: cards, panels, menus
  'bg-subtle': '#F1F5F9', // muted surface: search, inputs, secondary areas
  'bg-hover': 'rgba(15, 23, 42, 0.04)',
  'bg-overlay': 'rgba(15, 23, 42, 0.45)',
  'bg-blur': 'rgba(255, 255, 255, 0.88)',
  surface: '#FFFFFF',
  border: '#E5E7EB',
  'border-strong': '#D1D5DB',
  text: '#111827',
  'text-muted': '#6B7280',
  'text-faint': '#9CA3AF',
  'text-inverse': '#FFFFFF',
  primary: '#2563EB',
  'primary-hover': '#1D4ED8',
  'primary-soft': '#EFF6FF',
  'primary-100': '#DBEAFE',
  'primary-muted': '#93C5FD',
  like: '#E11D48',
  'like-soft': 'rgba(225, 29, 72, 0.1)',
  repost: '#16A34A',
  'repost-soft': 'rgba(22, 163, 74, 0.1)',
  success: '#16A34A',
  warning: '#D97706',
  danger: '#DC2626',
  'danger-soft': 'rgba(220, 38, 38, 0.08)',
  strong: '#111827',
  'strong-hover': '#1F2937',
  'on-strong': '#FFFFFF',
  skeleton: '#E9EEF5',
  'brand-gradient': 'linear-gradient(135deg, #2563EB 0%, #60A5FA 100%)',
  'auth-gradient': 'linear-gradient(160deg, #EFF6FF 0%, #DBEAFE 55%, #E0E7FF 100%)',
  'shadow-card': '0 1px 3px rgba(15, 23, 42, 0.06)',
  'shadow-menu': '0 8px 24px rgba(15, 23, 42, 0.12)',
  'shadow-dialog': '0 20px 48px rgba(15, 23, 42, 0.18)',
  shadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
};

// Dark theme: dark neutral surfaces (not pure black), same geometry and hierarchy.
const dark = {
  page: '#0B1120',
  bg: '#111827',
  'bg-subtle': '#1F2937',
  'bg-hover': 'rgba(255, 255, 255, 0.05)',
  'bg-overlay': 'rgba(0, 0, 0, 0.6)',
  'bg-blur': 'rgba(17, 24, 39, 0.88)',
  surface: '#111827',
  border: '#263041',
  'border-strong': '#374151',
  text: '#F3F4F6',
  'text-muted': '#9CA3AF',
  'text-faint': '#6B7280',
  'text-inverse': '#FFFFFF',
  primary: '#3B82F6',
  'primary-hover': '#60A5FA',
  'primary-soft': 'rgba(59, 130, 246, 0.14)',
  'primary-100': 'rgba(59, 130, 246, 0.24)',
  'primary-muted': '#1E3A8A',
  like: '#FB7185',
  'like-soft': 'rgba(251, 113, 133, 0.14)',
  repost: '#4ADE80',
  'repost-soft': 'rgba(74, 222, 128, 0.14)',
  success: '#4ADE80',
  warning: '#FBBF24',
  danger: '#F87171',
  'danger-soft': 'rgba(248, 113, 113, 0.12)',
  strong: '#F3F4F6',
  'strong-hover': '#E5E7EB',
  'on-strong': '#111827',
  skeleton: '#1F2937',
  'brand-gradient': 'linear-gradient(135deg, #1D4ED8 0%, #3B82F6 100%)',
  'auth-gradient': 'linear-gradient(160deg, #0F172A 0%, #172554 60%, #1E1B4B 100%)',
  'shadow-card': '0 1px 3px rgba(0, 0, 0, 0.4)',
  'shadow-menu': '0 8px 24px rgba(0, 0, 0, 0.5)',
  'shadow-dialog': '0 20px 48px rgba(0, 0, 0, 0.6)',
  shadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
};

const toVars = (palette) =>
  Object.entries(palette)
    .map(([key, value]) => `--${key}: ${value};`)
    .join('\n');

function toCamel(key) {
  return key.replace(/-(\w)/g, (_, c) => c.toUpperCase());
}

export const theme = {
  colors: Object.fromEntries(Object.keys(light).map((key) => [toCamel(key), `var(--${key})`])),
};

// Breakpoints from the design system.
export const bp = { tablet: 640, desktop: 1024, wide: 1280 };

export const media = {
  mobile: `@media (max-width: ${bp.tablet - 1}px)`,
  notMobile: `@media (min-width: ${bp.tablet}px)`,
  belowDesktop: `@media (max-width: ${bp.desktop - 1}px)`,
  desktop: `@media (min-width: ${bp.desktop}px)`,
  belowWide: `@media (max-width: ${bp.wide - 1}px)`,
  wide: `@media (min-width: ${bp.wide}px)`,
  // aliases used by older components
  belowTablet: `@media (max-width: ${bp.wide - 1}px)`,
  tablet: `@media (min-width: ${bp.wide}px)`,
};

export const queries = { tiny: media.mobile, phone: media.notMobile, tablet: media.desktop, desktop: media.wide };

export const GlobalStyle = createGlobalStyle`
  :root {
    ${toVars(light)}
    --font-sans: var(--font-inter), Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    --header-height: 68px;
    --sidebar-width: 240px;
    --right-panel-width: 320px;
    --app-max-width: 1280px;
    --radius-sm: 6px;
    --radius-md: 10px;
    --radius-lg: 12px;
    --radius-xl: 16px;
    --space-1: 4px;
    --space-2: 8px;
    --space-3: 12px;
    --space-4: 16px;
    --space-6: 24px;
    --space-8: 32px;
    color-scheme: light;
  }

  @media (prefers-color-scheme: dark) {
    :root:not([data-theme='light']) {
      ${toVars(dark)}
      color-scheme: dark;
    }
  }

  :root[data-theme='dark'] {
    ${toVars(dark)}
    color-scheme: dark;
  }

  *,
  *::before,
  *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html,
  body {
    min-height: 100%;
  }

  body {
    font-family: var(--font-sans);
    font-size: 14px;
    line-height: 1.5;
    color: var(--text);
    background: var(--page);
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
    overflow-x: hidden;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  ul,
  ol {
    list-style: none;
  }

  button,
  input,
  textarea,
  select {
    font: inherit;
    color: inherit;
  }

  img,
  video {
    display: block;
    max-width: 100%;
  }

  :focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }

  ::selection {
    background: var(--primary-100);
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
`;

/** Page frame: [sidebar] [ top bar / (feed + right panel) ] */
export const Shell = styled.div`
  display: flex;
  max-width: var(--app-max-width);
  min-height: 100vh;
  margin: 0 auto;
`;

export const MainArea = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
`;

export const ContentRow = styled.div`
  flex: 1;
  display: flex;
  justify-content: center;
  gap: 24px;
  padding: 16px 24px 48px;

  ${media.belowDesktop} {
    padding: 16px 16px 48px;
  }

  ${media.mobile} {
    padding: 12px 0 80px; /* room for the bottom tab bar */
  }
`;

export const MainColumn = styled.main`
  flex: 1;
  min-width: 0;
  max-width: ${({ $wide }) => ($wide ? '100%' : '720px')};
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

/** Padding wrapper for page content that isn't a list. */
export const Container = styled.div`
  padding: 16px;
`;
