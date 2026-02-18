/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'bg-dark': '#0F0F0F',
        'bg-light': '#FAF9F6',
        'surface-dark': '#1A1A1A',
        'surface-light': '#F0EEE9',
        'accent': '#C8F135',
        'accent-dim': '#a8cc1a',
        'text-dark': '#EDEDED',
        'text-light': '#1A1A1A',
        'muted-dark': '#555555',
        'muted-light': '#888888',
        'border-dark': '#2A2A2A',
        'border-light': '#E0DDD7',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
      },
      fontSize: {
        'counter': ['80px', { lineHeight: '1', letterSpacing: '-0.02em' }],
        'counter-sm': ['56px', { lineHeight: '1', letterSpacing: '-0.02em' }],
      }
    },
  },
  plugins: [],
}
