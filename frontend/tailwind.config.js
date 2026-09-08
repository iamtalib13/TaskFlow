import frappePreset, { content as frappeContent } from 'frappe-ui/tailwind'

/** @type {import('tailwindcss').Config} */
export default {
  presets: [frappePreset],
  content: [
    ...frappeContent,
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    // Explicitly restore standard Tailwind borderRadius scale so rounded-full (capsules), rounded-lg, rounded-xl, etc. are super smooth
    borderRadius: {
      none: '0px',
      sm: '0.125rem',
      DEFAULT: '0.25rem',
      md: '0.375rem',
      lg: '0.5rem',
      xl: '0.75rem',
      '2xl': '1rem',
      '3xl': '1.5rem',
      full: '9999px',
      '0': '0px',
      '1': '4px',
      '2': '5px',
      '3': '6px',
      '4': '8px',
      '5': '10px',
      '6': '12px',
      '7': '16px',
      '8': '20px',
      '9': '999px',
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['11px', { lineHeight: '1.2' }],
        xs: ['12px', { lineHeight: '1.25' }],
        sm: ['13px', { lineHeight: '1.3' }],
        base: ['14px', { lineHeight: '1.35' }],
        md: ['15px', { lineHeight: '1.4' }],
        lg: ['16px', { lineHeight: '1.4' }],
        xl: ['18px', { lineHeight: '1.4' }],
        '2xl': ['20px', { lineHeight: '1.35' }],
      },
      colors: {
        primary: {
          50: '#f0f7f7',
          100: '#dceeed',
          200: '#bcdcdc',
          300: '#94c2c3',
          400: '#68a4a5',
          500: '#417c7d',
          600: '#366869',
          700: '#2b5354',
          800: '#234445',
          900: '#1b3435',
          DEFAULT: '#417c7d',
        },
        'surface-base': '#ffffff',
        surface: {
          base: '#ffffff',
          'gray-1': '#fcfcfd',
          'gray-2': '#f4f5f6',
          'gray-3': '#ebeef0',
          'gray-4': '#dce0e3',
          'elevation-2': '#ffffff',
          'elevation-3': '#f3f4f6',
        },
        ink: {
          'gray-9': '#111827',
          'gray-8': '#1f2937',
          'gray-7': '#374151',
          'gray-6': '#4b5563',
          'gray-5': '#6b7280',
          'gray-4': '#9ca3af',
          'gray-3': '#d1d5db',
          'gray-2': '#e5e7eb',
          'gray-1': '#f3f4f6',
        },
        outline: {
          'gray-1': '#f3f4f6',
          'gray-2': '#e5e7eb',
          'gray-3': '#d1d5db',
          'gray-4': '#9ca3af',
        },
      },
    },
  },
  plugins: [],
}


