/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "royal-red": {
          50: "#fdf3f4",
          100: "#fbe4e6",
          200: "#f7ccd0",
          300: "#f0a5ad",
          400: "#e57280",
          500: "#d34153",
          600: "#b9293b",
          700: "#9b1e2e",
          800: "#801b27",
          900: "#4a0e17", // Main Brand Color: Deep Crimson
          950: "#2b050a",
        },
        ivory: {
          50: "#fffef9",
          100: "#fffded",
          200: "#fffcd3",
          300: "#fff8ab",
          400: "#fff178",
          500: "#ffe23c",
          600: "#ffe000",
          750: "#FFFDD0", // Main Light Background: Ivory
        },
        gold: {
          50: "#fdfaf2",
          100: "#faf1dc",
          200: "#f3e1b4",
          300: "#ebcc80",
          400: "#e0b04a",
          500: "#d4af37", // Main Metallic Accent: Gold
          600: "#b58d27",
          700: "#8c681c",
          800: "#6e501a",
          900: "#553d17",
        },
        charcoal: {
          50: "#f6f6f6",
          100: "#e7e7e7",
          200: "#d1d1d1",
          300: "#b0b0b0",
          400: "#888888",
          500: "#6d6d6d",
          600: "#5d5d5d",
          700: "#4f4f4f",
          800: "#454545",
          900: "#1a1a1a", // Main Dark Neutral
        }
      },
      fontFamily: {
        sans: ["Outfit", "Inter", "sans-serif"],
        serif: ["Playfair Display", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
}
