/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
    "./node_modules/frappe-ui/src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
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
        'surface-base': '#ffffff',
        surface: {
          base: '#ffffff',
          'gray-1': '#fcfcfd',
          'gray-2': '#f4f5f6',
          'gray-3': '#ebeef0',
          'gray-4': '#dce0e3',
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
      borderRadius: {
        '4': '4px',
        '6': '6px',
        '7': '7px',
      },
    },
  },
  plugins: [],
}
