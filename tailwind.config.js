const { heroui } = require("@heroui/react");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        flow: {
          green: '#00EF8B',
          'green-dark': '#02D87E',
          'blue-light': '#99BBFF',
          blue: '#3334F8',
          'blue-dark': '#1D2374',
          'aqua-light': '#9DF1F2',
          aqua: '#37DDDF',
          'aqua-dark': '#101828',
          'pink-light': '#F9E9FB',
          pink: '#F4C6FA',
          'pink-dark': '#6D3974',
          'purple-light': '#E0CCFF',
          purple: '#823EE4',
          'purple-dark': '#50268C',
        },
      },
      fontFamily: {
        epilogue: ['Epilogue', 'sans-serif'],
      },
    },
  },
  plugins: [heroui()],
  darkMode: "class"
}; 