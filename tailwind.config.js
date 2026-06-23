/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef4ff',
          100: '#dbe6ff',
          200: '#bcd1ff',
          300: '#8eb3ff',
          400: '#5a89ff',
          500: '#3563ff',
          600: '#1e44e6',
          700: '#1834b8',
          800: '#172d8f',
          900: '#172a70',
          950: '#0e1a47'
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        'soft': '0 4px 24px -8px rgba(23, 42, 112, 0.15)',
        'glow': '0 0 0 4px rgba(53, 99, 255, 0.15)'
      }
    }
  },
  plugins: []
};
