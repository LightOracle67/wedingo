export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ["Playfair Display", "serif"],
        sans: ["Inter", "sans-serif"],
      },
      colors: {
        boda: {
          fondo: "#faf8f5",
          dorado: "#c8a96a",
          texto: "#1f1f1f",
        },
      },
    },
  },
  plugins: [],
};