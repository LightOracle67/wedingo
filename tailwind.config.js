export default {
  // Rutas que Tailwind analiza para generar utilidades usadas.
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      // Fuentes base del sistema de diseno utilitario.
      fontFamily: {
        serif: ["Playfair Display", "serif"],
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  // Espacio reservado para plugins futuros.
  plugins: [],
};