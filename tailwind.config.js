/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 主色：与医共体平台保持一致的青色系
        primary: {
          50:  '#ecfeff',
          100: '#d0f7fa',
          200: '#a4edf5',
          300: '#67dfe9',
          400: '#2ccadb',
          500: '#0BBECF',   // 主色
          600: '#09A9BA',
          700: '#0892a0',
          800: '#0b7583',
          900: '#0e606c',
          DEFAULT: '#0BBECF',
        },
      },
    },
  },
  plugins: [],
}
