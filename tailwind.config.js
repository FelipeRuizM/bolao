/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#eab308',
          600: '#ca8a04',
          700: '#a16207',
          800: '#854d0e',
          900: '#713f12',
          950: '#422006',
        },
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.85)' },
          '60%': { opacity: '1', transform: 'scale(1.05)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'save-pop': {
          '0%': { opacity: '0', transform: 'translateY(4px) scale(0.95)' },
          '20%': { opacity: '1', transform: 'translateY(0) scale(1.05)' },
          '40%': { opacity: '1', transform: 'translateY(0) scale(1)' },
          '100%': { opacity: '0', transform: 'translateY(-2px) scale(1)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(16,185,129,0.0)' },
          '50%': { boxShadow: '0 0 16px 2px rgba(16,185,129,0.45)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 400ms ease-out both',
        'pop-in': 'pop-in 380ms cubic-bezier(0.22,1,0.36,1) both',
        'save-pop': 'save-pop 1700ms ease-out both',
        'glow-pulse': 'glow-pulse 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
