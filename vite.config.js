import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // Plugins de compilacion: React + Tailwind en pipeline de Vite.
  plugins: [react(), tailwindcss()],
  // Base publica para despliegue en GitHub Pages.
  base: "https://lightoracle67.github.io/boda-ja",
});
