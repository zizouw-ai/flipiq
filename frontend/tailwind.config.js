/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd',
          400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8',
          800: '#1e40af', 900: '#1e3a8a', 950: '#172554',
        },
        accent: { 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed' },
        success: { 400: '#4ade80', 500: '#22c55e' },
        danger: { 400: '#f87171', 500: '#ef4444' },
        warning: { 400: '#fbbf24', 500: '#f59e0b' },
        surface: {
          900: '#0f172a', 800: '#1e293b', 700: '#334155', 600: '#475569',
          500: '#64748b', 400: '#94a3b8', 300: '#cbd5e1', 200: '#e2e8f0',
          100: '#f1f5f9', 50: '#f8fafc',
        },
      },
    },
  },
  plugins: [],
}
