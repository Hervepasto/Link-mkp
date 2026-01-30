/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#7B2CBF',
          50: '#F3E8FF',
          100: '#E9D5FF',
          200: '#D8B4FE',
          300: '#C084FC',
          400: '#A855F7',
          500: '#7B2CBF',
          600: '#6D21A8',
          700: '#5B1890',
          800: '#4C1478',
          900: '#3D1060',
        },
      },
    },
  },
  plugins: [],
}
