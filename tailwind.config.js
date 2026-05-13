/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'ai-pulse': 'ai-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'ai-pulse': {
          '0%, 100%': { opacity: 1, filter: 'brightness(1)' },
          '50%': { opacity: 0.8, filter: 'brightness(1.5) drop-shadow(0 0 5px #06b6d4)' },
        }
      }
    },
  },
  plugins: [],
};