/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
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
        whatsapp: {
          panel: '#111b21',
          sidebar: '#202c33',
          darkBg: '#0c1317',
          incoming: '#202c33',
          outgoing: '#005c4b',
          border: '#222d34',
          subtext: '#8696a0',
          green: '#00a884',
          activeChat: '#2a3942',
        }
      },
    },
  },
  plugins: [],
};

