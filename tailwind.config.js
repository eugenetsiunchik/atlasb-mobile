/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './index.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      borderRadius: {
        '4xl': '32px',
      },
      colors: {
        accent: {
          DEFAULT: '#f0b268',
          foreground: '#0f172a',
          strong: '#e3a35d',
          subtle: '#f9c377',
        },
        background: {
          DEFAULT: '#f8fafc',
          subtle: '#f1f5f9',
        },
        border: {
          DEFAULT: '#e2e8f0',
          strong: '#cbd5e1',
        },
        card: '#ffffff',
        foreground: {
          DEFAULT: '#0f172a',
          inverse: '#f8fafc',
          muted: '#475569',
          subtle: '#64748b',
        },
      },
      spacing: {
        4.5: '18px',
      },
    },
  },
  plugins: [],
};
