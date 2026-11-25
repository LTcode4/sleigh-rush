module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx,vue}'],
  theme: {
    fontSize: {
      display: ['3.5rem', { lineHeight: '1' }],
      title: ['1.375rem', { lineHeight: '1.3' }],
      body: ['0.875rem', { lineHeight: '1.5' }],
    },
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      black: '#000000',
      white: '#ffffff',
      red: '#e8413c',
      green: '#3fae5a',
    },
    opacity: {
      0: '0',
      20: '0.2',
      60: '0.6',
      100: '1',
    },
    extend: {
      fontFamily: {
        mono: ['Fredoka', 'Noto Sans TC', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
