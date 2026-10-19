/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        sunset: { DEFAULT: '#C2452D', dark: '#A33A26', light: '#FBE3DC' },
        sand: { DEFAULT: '#F6C177', light: '#FDEBD0', dark: '#8A5A12' },
        lagoon: { DEFAULT: '#2A8C80', light: '#DDF1EE', dark: '#1D6B61' },
        ink: { DEFAULT: '#2B1E2F', soft: '#4A3B4E' },
        muted: '#6B5A63',
        shell: '#FFF1EA',
        paper: '#FFFAF7',
        line: '#F0E2DA',
      },
      fontFamily: {
        display: ['Unbounded', 'Trebuchet MS', 'sans-serif'],
        sans: ['Onest', 'Segoe UI', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        card: '0 10px 30px rgba(43, 30, 47, 0.08)',
        lift: '0 18px 50px rgba(43, 30, 47, 0.14)',
      },
    },
  },
  plugins: [],
};
