/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#effaf3',
          100: '#d8f3e0',
          200: '#b3e6c5',
          300: '#82d3a3',
          400: '#4fb87c',
          500: '#2c9d5f',
          600: '#1f7e4b',
          700: '#1b643e',
          800: '#194f34',
          900: '#15412c',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
