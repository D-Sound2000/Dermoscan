/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        dark: {
          bg: '#0A0A0F',
          surface: '#12121A',
          'surface-2': '#1A1A25',
          'surface-3': '#222230',
        },
        violet: {
          accent: '#8B5CF6',
          dim: 'rgba(139, 92, 246, 0.12)',
          glow: 'rgba(139, 92, 246, 0.30)',
        },
        coral: {
          accent: '#F472B6',
          dim: 'rgba(244, 114, 182, 0.12)',
          glow: 'rgba(244, 114, 182, 0.25)',
        },
        benign: '#2DD4A5',
        malignant: '#F87171',
      },
      animation: {
        'scan-down': 'scanDown 1.9s ease-in-out infinite',
        'pulse-dot': 'pulseDot 2s ease-in-out infinite',
        'fade-up': 'fadeUp 0.4s ease forwards',
        float: 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 2s infinite',
        'bar-grow': 'barGrow 0.9s cubic-bezier(0.16,1,0.3,1) forwards',
        'spin-slow': 'spin 25s linear infinite',
        'spin-slower': 'spin 40s linear infinite',
        'spin-reverse': 'spinReverse 30s linear infinite',
        'blob-pulse': 'blobPulse 8s ease-in-out infinite',
      },
      keyframes: {
        scanDown: {
          '0%': { top: '-2%', opacity: '0' },
          '5%': { opacity: '1' },
          '92%': { top: '100%', opacity: '1' },
          '100%': { top: '102%', opacity: '0' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.45', transform: 'scale(0.8)' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-14px)' },
        },
        barGrow: {
          from: { width: '0' },
          to: { width: 'var(--w, 0%)' },
        },
        spinReverse: {
          to: { transform: 'rotate(-360deg)' },
        },
        blobPulse: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.7' },
          '50%': { transform: 'scale(1.05)', opacity: '0.9' },
        },
      },
    },
  },
  plugins: [],
};
