/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f4ff',
          100: '#e0e9fe',
          200: '#bae0fd',
          300: '#7cc5fd',
          400: '#36a6f9',
          500: '#0c87e8',
          600: '#026bc6',
          700: '#0355a1',
          800: '#074883',
          900: '#0c3c6d',
          950: '#072648',
        },
        vault: {
          dark: '#0a0f1d',
          card: '#111827',
          border: '#1f2937',
          accent: '#6366f1',
          cyan: '#06b6d4',
          emerald: '#10b981'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'glow-blue': '0 0 25px -5px rgba(12, 135, 232, 0.4)',
        'glow-indigo': '0 0 25px -5px rgba(99, 102, 241, 0.4)',
      }
    },
  },
  plugins: [],
}
