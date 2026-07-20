/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-bg': '#06060b',
        'brand-secondary': '#0c0c14',
        'brand-card': '#10101a',
        'brand-card-hover': '#14142a',
        'brand-text-primary': '#eaeaf4',
        'brand-text-secondary': '#8888a8',
        'brand-accent': '#a78bfa',
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'gradient-accent': 'linear-gradient(135deg, #a78bfa 0%, #6366f1 50%, #8b5cf6 100%)',
      }
    },
  },
  plugins: [],
}

