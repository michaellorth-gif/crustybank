/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Libre Baskerville"', 'Georgia', 'serif'],
        sans: ['"Public Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#eef7f4',
          100: '#d5ede5',
          200: '#acdacc',
          300: '#7cc2ae',
          400: '#45a68d',
          500: '#1f8f74',
          600: '#0e7c66',
          700: '#0b6453',
          800: '#0a5044',
          900: '#083f37',
        },
        ink: '#1c2a33',
        paper: '#fafaf7',
      },
    },
  },
  plugins: [],
}
