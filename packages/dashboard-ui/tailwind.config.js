/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
        colors: {
            brand: {
              50:  '#E1F5EE',
              100: '#9FE1CB',
              500: '#1D9E75',
              700: '#0F6E56',
              900: '#04342C',
            },
          },
          fontFamily: {
            sans: ['DM Sans', 'sans-serif'],
            mono: ['JetBrains Mono', 'monospace'],
          },
        },
    
  },
  plugins: [],
}
