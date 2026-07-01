import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // Plugins de compilacion: React + Tailwind en pipeline de Vite.
  plugins: [react(), tailwindcss()],
  // Base raiz para despliegues en hosting estandar (Firebase, Netlify, etc.).
  base: "/",
});
