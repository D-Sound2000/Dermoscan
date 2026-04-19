const plugin = require('tailwindcss/plugin');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  theme: { extend: {} },
  plugins: [
    plugin(({ addUtilities }) => {
      addUtilities({
        '.perspective-distant': { perspective: '1200px' },
        '.transform-3d':        { transformStyle: 'preserve-3d' },
      });
    }),
  ],
};
