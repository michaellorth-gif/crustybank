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
        // Navy: text, buttons, links, focus rings.
        primary: {
          50: '#f2f4f8',
          100: '#e1e6ef',
          200: '#c3ccdd',
          300: '#9aa8c2',
          400: '#6b7fa3',
          500: '#3f5480',
          600: '#2b3d63',
          700: '#1f2e4e',
          800: '#17233a',
          900: '#101a2b',
        },
        // Brass: the "Fee" in the wordmark and small highlights. Never for body text.
        brass: {
          50: '#fbf6ea',
          100: '#f0e3c8',
          200: '#e6d0a0',
          300: '#d8a94a',
          400: '#c08a2e',
          500: '#a97722',
          600: '#9a6b1f',
          700: '#7c5518',
          800: '#5e4012',
          900: '#3f2b0c',
        },
        ink: '#17233a',
        paper: '#fbf9f4',
      },
    },
  },
  plugins: [],
}
