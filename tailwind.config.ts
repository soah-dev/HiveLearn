import type { Config } from "tailwindcss";

// Every colour is a CSS variable (RGB channels) defined in globals.css, so
// light/dark are swapped in one place and components never need `dark:` variants.
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    // ToastProvider renders markup, so its classes must be scanned too
    "./src/contexts/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Surfaces
        canvas: token('canvas'),
        surface: token('surface'),
        muted: token('muted'),
        line: { DEFAULT: token('line'), strong: token('line-strong') },
        // Text
        ink: { DEFAULT: token('ink'), muted: token('ink-muted'), subtle: token('ink-subtle') },
        // Brand: primary actions, navigation, selection, progress, links
        brand: {
          DEFAULT: token('brand'),
          hover: token('brand-hover'),
          soft: token('brand-soft'),
          line: token('brand-line'),
          ink: token('brand-ink'),
          text: token('brand-text'),
        },
        // Reward: points, streaks, badges, rankings (never for actions)
        honey: {
          DEFAULT: token('honey'),
          soft: token('honey-soft'),
          ink: token('honey-ink'),
          text: token('honey-text'),
        },
        // Status (reserved meaning: never decorative)
        good: { DEFAULT: token('good'), soft: token('good-soft'), text: token('good-text') },
        warn: { DEFAULT: token('warn'), soft: token('warn-soft'), text: token('warn-text') },
        bad: { DEFAULT: token('bad'), soft: token('bad-soft'), text: token('bad-text') },
        info: { DEFAULT: token('info'), soft: token('info-soft'), text: token('info-text') },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgb(var(--shadow) / 0.06)',
        pop: '0 16px 40px -16px rgb(var(--shadow) / 0.35), 0 4px 12px -6px rgb(var(--shadow) / 0.18)',
      },
      animation: {
        enter: 'enter 0.18s ease-out',
        'sheet-up': 'sheet-up 0.22s ease-out',
      },
      keyframes: {
        enter: {
          '0%': { transform: 'translateY(6px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'sheet-up': {
          '0%': { transform: 'translateY(24px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
