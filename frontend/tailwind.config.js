/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f4ff',
          100: '#dde7ff',
          200: '#c3d2ff',
          300: '#9db3ff',
          400: '#7589ff',
          500: '#5660ff',  // Primary
          600: '#4237f5',
          700: '#3728e1',
          800: '#2d22b5',
          900: '#29218e',
        },
        surface: {
          0:   '#ffffff',
          50:  '#f8f9fb',
          100: '#f1f3f7',
          200: '#e4e8f0',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#0a0f1a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '32px',
      },
      boxShadow: {
        // High-end premium soft shadows instead of harsh standard tailwind shadows
        card: '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 0 3px rgba(0,0,0,0.02)',
        'card-hover': '0 12px 32px -4px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0,0,0,0.04)',
        glow: '0 0 24px rgb(86 96 255 / 0.45)',
        'inner-light': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.8)',
      },
      /* LYL-M-FE-031: Semantic color tokens for consistent theming */
      textColor: {
        success: {
          DEFAULT: '#059669',
          dark: '#34d399',
        },
        warning: {
          DEFAULT: '#d97706',
          dark: '#fbbf24',
        },
        danger: {
          DEFAULT: '#dc2626',
          dark: '#f87171',
        },
        info: {
          DEFAULT: '#2563eb',
          dark: '#60a5fa',
        },
      },
      backgroundColor: {
        success: {
          light: '#ecfdf5',
          DEFAULT: '#059669',
        },
        warning: {
          light: '#fffbeb',
          DEFAULT: '#d97706',
        },
        danger: {
          light: '#fef2f2',
          DEFAULT: '#dc2626',
        },
        info: {
          light: '#eff6ff',
          DEFAULT: '#2563eb',
        },
      },
      borderColor: {
        success: { DEFAULT: '#a7f3d0', dark: '#065f46' },
        warning: { DEFAULT: '#fde68a', dark: '#92400e' },
        danger: { DEFAULT: '#fecaca', dark: '#991b1b' },
        info: { DEFAULT: '#bfdbfe', dark: '#1e40af' },
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
  darkMode: 'class',
};
