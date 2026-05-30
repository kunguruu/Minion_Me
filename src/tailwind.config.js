/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Minion Theme Colors
        'minion-yellow': {
          DEFAULT: '#FFD700',
          light: '#FFE44D',
          dark: '#E6C200',
        },
        'minion-blue': {
          DEFAULT: '#0057B7',
          light: '#3380CC',
          dark: '#003D82',
        },
        // Keep existing theme colors
        primary: '#FFD700', // Minion yellow
        secondary: '#0057B7', // Minion blue
      },
      backgroundImage: {
        'minion-gradient': 'linear-gradient(135deg, #FFD700 0%, #FFE44D 100%)',
        'blue-gradient': 'linear-gradient(135deg, #0057B7 0%, #003D82 100%)',
      },
    },
  },
  plugins: [],
}