/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./options.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0B0813',
          card: 'rgba(17, 13, 30, 0.65)',
          border: 'rgba(255, 255, 255, 0.06)',
          text: '#F3F4F6'
        },
        brand: {
          primary: '#8B5CF6',
          secondary: '#EC4899',
          accent: '#06B6D4'
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
