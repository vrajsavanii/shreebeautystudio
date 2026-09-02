/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        teal: {
          DEFAULT: '#05424A',
          dark: '#07383e',
          light: '#0a5a65',
        },
        gold: {
          DEFAULT: '#EABA38',
          dark: '#e69a22',
          light: '#f5d36a',
        },
        brand: {
          green: '#23a36d',
          red: '#ff4a3d',
          orange: '#e69a22',
          bg: '#f5f7f8',
          card: '#ffffff',
          text: '#172126',
          muted: '#6b7880',
          border: '#e4e9eb',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        card: '0 8px 30px rgba(15,35,40,.08)',
        modal: '0 25px 60px rgba(15,35,40,.18)',
        sidebar: '4px 0 20px rgba(0,0,0,.15)',
      },
      backgroundImage: {
        'sidebar-gradient': 'linear-gradient(180deg, #07383e 0%, #05424A 100%)',
        'auth-gradient': 'linear-gradient(135deg, #07383e 0%, #05424A 60%, #0a5a65 100%)',
        'gold-gradient': 'linear-gradient(135deg, #EABA38 0%, #e69a22 100%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 2s linear infinite',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
