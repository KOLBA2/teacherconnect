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
        dark: {
          bg: '#0b1120',
          panel: '#0f172a',
          border: '#1e293b'
        },
        brand: {
          DEFAULT: '#2563eb',
          glow: '#3b82f6'
        },
        // ── TNET marketplace palette ──
        // The app's accent classes (`indigo-*`, `violet-*`, `fuchsia-*`) are all
        // remapped onto a single crisp-blue family (Tailwind's `blue` scale), so
        // every existing call site renders in the clean marketplace blue without
        // editing 270+ usages. VIP vs VIP+ distinction is handled by badge CSS.
        indigo: {
          50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa',
          500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a', 950: '#172554',
        },
        violet: {
          50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa',
          500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a', 950: '#172554',
        },
        fuchsia: {
          50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa',
          500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a', 950: '#172554',
        },
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in-left': 'slideInLeft 0.3s cubic-bezier(0.4,0,0.2,1)',
        'slide-out-left': 'slideOutLeft 0.3s cubic-bezier(0.4,0,0.2,1)',
        'fade-in': 'fadeIn 0.2s ease',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.4,0,0.2,1)',
      },
      keyframes: {
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' }
        },
        slideOutLeft: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-100%)' }
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        }
      }
    },
  },
  plugins: [],
}
