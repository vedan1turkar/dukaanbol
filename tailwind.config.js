/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#c2410c', light: '#fff7ed', dark: '#9a3412' },
      },
    },
  },
  plugins: [],
};
