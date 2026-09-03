/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#09090b',
        'surface-lowest': '#050507',
        'surface-low': '#0e0e11',
        surface: '#121215',
        'surface-card': '#18181b',
        'surface-high': '#202024',
        'surface-highest': '#27272a',
        border: {
          subtle: '#18181b',
          DEFAULT: '#27272a',
          light: '#3f3f46',
        },
        emerald: {
          DEFAULT: '#10b981',
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
        },
        primary: {
          DEFAULT: '#10b981',
          light: '#34d399',
          dark: '#059669',
        }
      },
      fontFamily: {
        sans: ['Geist', 'Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'glow-emerald': '0 0 25px -4px rgba(16, 185, 129, 0.25)',
        'glow-emerald-lg': '0 0 45px -8px rgba(16, 185, 129, 0.35)',
        'hud': '0 20px 40px -15px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05) inset',
      },
      animation: {
        'fade-in': 'fadeIn 180ms cubic-bezier(0.23, 1, 0.32, 1) forwards',
        'scale-in': 'scaleIn 160ms cubic-bezier(0.23, 1, 0.32, 1) forwards',
        'pulse-emerald': 'pulseEmerald 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.97)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseEmerald: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.4', transform: 'scale(0.85)' },
        }
      },
    },
  },
  plugins: [],
}
